const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

router.post('/', auth, async (req, res) => {
    console.log('Received request body:', req.body);
    const { first_name, last_name, date_of_birth, gender, grade_level, attendance_percentage, average_grade, behavioral_incidents, notes } = req.body;
    const userId = req.user.id;

    try {
        const newStudent = await pool.query(
            `INSERT INTO students (user_id, first_name, last_name, date_of_birth, gender, grade_level, attendance_percentage, average_grade, behavioral_incidents, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [userId, first_name, last_name, date_of_birth, gender, grade_level, attendance_percentage, average_grade, behavioral_incidents, notes]
        );
        console.log('Student successfully added:', newStudent.rows[0]);
        res.status(201).json(newStudent.rows[0]);
    } catch (err) {
        console.error('Error adding student:', err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/', auth, async (req, res) => {
    const userId = req.user.id;

    const { search, grade } = req.query;

    console.log('Backend received /api/students GET request:');
    console.log(' User ID:', userId);
    console.log(' Query Params (req.query):', req.query);

    let query = 'SELECT * FROM students WHERE user_id = $1'
    const queryParams = [userId];

    let paramIndex = 2;

    if (search) {
        query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex + 1})`;
        queryParams.push(`%${search}%`);
        queryParams.push(`%${search}%`);
        paramIndex += 2
    }

    if (grade) {
        query += ` AND grade_level = $${paramIndex}`;
        queryParams.push(grade);
        paramIndex++;
    }

    query += ` ORDER BY last_name, first_name`;

    console.log(' Constructed SQL Query:', query);
    console.log(' SQL parameters:', queryParams);

    try {
        const students = await pool.query(query, queryParams);
        console.log(' Number of students found:', students.rows.length);

        res.json(students.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const student = await pool.query(
            'SELECT * FROM students WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (student.rows.length === 0) {
            return res.status(404).json({ msg: 'Student not found or not authorized to view.'});
        }

        res.json(student.rows[0]);
    } catch (err) {
        console.error('Error fetching single student.', err.message);

        if (err.message.includes('invalid input syntax for type')) {
            return res.status(400).json({msg: 'Invalid student ID format.'});
        }
        res.status(500).send('Server Error');
    }
});

router.put('/:id', auth, async (req, res) => {
    const studentId = req.params.id;
    const userId = req.user.id;
    const { first_name, last_name, date_of_birth, gender, grade_level, attendance_percentage, average_grade, behavioral_incidents, notes } = req.body;

    console.log('--- PUT /api/students/:id Request Received ---');
    console.log('Student ID from params:', studentId);
    console.log('User ID from auth:', userId);
    console.log('Request Body:', req.body); // Confirm the data received from frontend
    console.log('Destructured first_name:', first_name); // Confirm destructuring works

    try {
        const updatedStudent = await pool.query(
            `UPDATE students
            SET first_name = $1, last_name = $2, date_of_birth = $3, gender = $4, grade_level = $5, attendance_percentage = $6, average_grade = $7, behavioral_incidents = $8, notes = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10 AND user_id = $11 RETURNING *`,
            [first_name, last_name, date_of_birth, gender, grade_level, attendance_percentage, average_grade, behavioral_incidents, notes, studentId, userId]
        );
        console.log('Query successful. Rows updated:', updatedStudent.rows.length);
        console.log('Updated student data:', updatedStudent.rows[0]);
        if (updatedStudent.rows.length === 0) {
            return res.status(404).json({ msg: 'Student not found or not authorized to update'});
        }
        res.json(updatedStudent.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/:id', auth, async (req, res) => {
    const studentId = req.params.id;
    const userId = req.user.id;

    try {
        const deleteResult = await pool.query('DELETE FROM students WHERE id = $1 AND user_id = $2 RETURNING id', [studentId, userId]);

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Student not found or not authorized to delete'});
        }
        res.json({ msg: 'Student removed' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;