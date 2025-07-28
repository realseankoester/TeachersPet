const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('..//middleware/auth');
const { check, validationResult } = require('express-validator');


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

router.get('/', auth, async (req, res) => {
    try {
        const teacherId = req.user.id;

        const result = await pool.query(
            'SELECT id, class_name, description, year, semester, teacher_id FROM classes WHERE teacher_id = $1 ORDER BY class_name',
            [teacherId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching classes:', err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;

        const result = await pool.query(
            'SELECT id, class_name, description, year, semester, teacher_id FROM classes WHERE id = $1 AND teacher_id = $2',
            [id, teacherId]
        );

        const singleClass = result.rows[0];

        if (!singleClass) {
            return res.status(404).json({ msg: 'Class not found or not authorized to view'});
        }

        res.json(singleClass);
    } catch (err) {
        console.error('Error fetching single class:', err.message);
        if (err.message.includes('invalid input syntax for type integer')) {
            return res.status(400).json({ msg: 'Invalid class ID format' });
        }
        res.status(500).send('Server Error');
    }
});

router.get('/:classId/students', auth, async (req, res) => {
    try {
        const { classId } = req.params;
        const teacherId = req.user.id;

        const classCheck = await pool.query(
            'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
            [classId, teacherId]
        );

        if (classCheck.rows.length === 0) {
            return res.status(404).json({ msg: 'Class not found or unauthorizes' });
        }

        const students = await pool.query(
            `SELECT
                s.id,
                s.first_name,
                s.last_name,
                s.date_of_birth,
                s.gender,
                s.grade_level
            FROM
                students s
            JOIN
                student_classes sc ON s.id = sc.student_id
            WHERE
                sc.class_id = $1 AND s.user_id = $2
            ORDER BY
                s.last_name, s.first_name`,
            [classId, teacherId]
        );

        res.json(students.rows);
    } catch (err) {
        console.error('Error fetching students for class:', err.message);
        res.status(500).send('Server Error');
    }
});

router.post(
    '/',
    [
        auth,
        check('class_name', 'Class name is required').not().isEmpty(),
        check('year', 'Year is required and must be a number').isInt({ min: 1900, max: 2100 }),
        check('semester', 'Semester is required').not().isEmpty(),
        check('semester', 'Semester must be Fall, Spring, or Summer').isIn(['Fall', 'Spring', 'Summer'])
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }

        const { class_name, description, year, semester } = req.body;
        const teacherId = req.user.id;

        try {
            const newClass = await pool.query(
                `INSERT INTO classes(class_name, description, year, semester, teacher_id)
                VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [class_name, description, year, semester, teacherId]
            );

            res.status(201).json(newClass.rows[0]);
        } catch (err) {
            console.error('Error creating class:', err.message);
            res.status(500).send('Server Error');
        }
    }
);

router.post(
    '/:classId/students',
    auth,
    [
        // Validate that studentIds is an array and not empty
        check('studentIds', 'Student IDs are required and must be an array').isArray().notEmpty(),
        
        check('studentIds.*').isInt().withMessage('Each student ID must be an integer')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { classId } = req.params;
        const { studentIds } = req.body; // Array of student IDs from the frontend
        const teacherId = req.user.id;

        try {
            // 1. Verify the class exists and belongs to the authenticated teacher
            const classCheck = await pool.query(
                'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
                [classId, teacherId]
            );

            if (classCheck.rows.length === 0) {
                return res.status(404).json({ msg: 'Class not found or unauthorized' });
            }

            // 2. Verify that all provided studentIds belong to this teacher
            // This prevents a teacher from adding other teachers' students to their class
            if (studentIds.length > 0) {
                const studentCountResult = await pool.query(
                    `SELECT COUNT(id) FROM students WHERE id = ANY($1::int[]) AND user_id = $2`,
                    [studentIds, teacherId]
                );

                if (parseInt(studentCountResult.rows[0].count, 10) !== studentIds.length) {
                    return res.status(403).json({ msg: 'One or more student IDs are invalid or not associated with your account' });
                }
            }


            // 3. Insert into student_classes table
            // Use a transaction to ensure atomicity
            await pool.query('BEGIN');

            const insertPromises = studentIds.map(studentId =>
                pool.query(
                    `INSERT INTO student_classes (student_id, class_id)
                     VALUES ($1, $2)
                     ON CONFLICT (student_id, class_id) DO NOTHING RETURNING *`,
                    [studentId, classId]
                )
            );

            const insertedResults = await Promise.all(insertPromises);
            await pool.query('COMMIT');

            // Filter out rows that were skipped due to DO NOTHING (i.e., not inserted)
            const addedAssociations = insertedResults.filter(result => result.rows.length > 0).map(result => result.rows[0]);

            if (addedAssociations.length === 0 && studentIds.length > 0) {
                 return res.status(200).json({ msg: 'All selected students were already in this class.' });
            }


            res.status(201).json({
                msg: `${addedAssociations.length} student(s) added to class successfully.`,
                addedStudents: addedAssociations
            });

        } catch (err) {
            await pool.query('ROLLBACK'); // Rollback transaction on error
            console.error('Error adding students to class:', err.message);
            res.status(500).send('Server Error');
        }
    }
);

router.delete(
    '/:classId/students/:studentId',
    auth,
    async (req, res) => {
        const { classId, studentId } = req.params;
        const teacherId = req.user.id;

        try {
            // 1. Verify the class exists and belongs to the authenticated teacher
            const classCheck = await pool.query(
                'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
                [classId, teacherId]
            );

            if (classCheck.rows.length === 0) {
                return res.status(404).json({ msg: 'Class not found or unauthorized' });
            }

            // 2. Verify the student also belongs to this teacher
            const studentCheck = await pool.query(
                'SELECT id FROM students WHERE id = $1 AND user_id = $2',
                [studentId, teacherId]
            );

            if (studentCheck.rows.length === 0) {
                return res.status(404).json({ msg: 'Student not found or unauthorized to remove' });
            }

            // 3. Delete the association from the student_classes table
            const deleteResult = await pool.query(
                'DELETE FROM student_classes WHERE class_id = $1 AND student_id = $2 RETURNING *',
                [classId, studentId]
            );

            if (deleteResult.rows.length === 0) {
                return res.status(404).json({ msg: 'Student not found in this class' });
            }

            res.json({ msg: 'Student removed from class successfully', removedStudentId: studentId });

        } catch (err) {
            console.error('Error removing student from class:', err.message);
            if (err.message.includes('invalid input syntax for type integer')) {
                return res.status(400).json({ msg: 'Invalid ID format' });
            }
            res.status(500).send('Server Error');
        }
    }
);

router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params; // Class ID
    const teacherId = req.user.id; // Authenticated teacher's ID

    try {
        // 1. Verify the class exists and belongs to the authenticated teacher
        const classCheck = await pool.query(
            'SELECT id FROM classes WHERE id = $1 AND teacher_id = $2',
            [id, teacherId]
        );

        if (classCheck.rows.length === 0) {
            return res.status(404).json({ msg: 'Class not found or unauthorized' });
        }

        // Use a transaction for atomicity: delete enrollments, then the class
        await pool.query('BEGIN');

        // 2. Delete all student enrollments for this class
        await pool.query('DELETE FROM student_classes WHERE class_id = $1', [id]);

        // 3. Delete the class itself
        const deleteClassResult = await pool.query(
            'DELETE FROM classes WHERE id = $1 AND teacher_id = $2 RETURNING *',
            [id, teacherId]
        );

        if (deleteClassResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ msg: 'Class not found or could not be deleted' });
        }

        await pool.query('COMMIT');

        res.json({ msg: 'Class deleted successfully', deletedClassId: id });

    } catch (err) {
        await pool.query('ROLLBACK'); // Rollback transaction on any error
        console.error('Error deleting class:', err.message);
        if (err.message.includes('invalid input syntax for type integer')) {
            return res.status(400).json({ msg: 'Invalid class ID format' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;