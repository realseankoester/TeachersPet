const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post('/import', auth, upload.single('studentFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded.' });
        }

        const fileExtension = path.extname(req.file.originalname).toLowerCase();

        if (fileExtension !== '.csv') {
            return res.status(400).json({ msg: 'Unsupported file type. Please upload a CSV (.csv) file.'});
        }

        let jsonData = [];
        const stream = Readable.from(req.file.buffer.toString()); // Convert buffer to readable stream

        await new Promise((resolve, reject) => {
            stream
                .pipe(csv())
                .on('data', (row) => {
                    jsonData.push(row);
                })
                .on('end', () => {
                    console.log('CSV file successfully processed.');
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error parsing CSV:', error);
                    reject(error);
                });
        });
        
        let successfulImports = 0;
        let failedImports = 0;
        const failedRowsDetails = [];
        const userId = req.user.id;

        const processStudentRow = async (rowIndex, rowData) => {
            const errors = [];
            let studentToInsert = {};
            const firstName = rowData['First Name'] ? String(rowData['First Name']).trim() : '';
            const lastName = rowData['Last Name'] ? String(rowData['Last Name']).trim() : '';
            const dob = rowData['Date of Birth'] ? String(rowData['Date of Birth']).trim() : '';
            const gender = rowData['Gender'] ? String(rowData['Gender']).trim() : '';
            const gradeLevel = rowData['Grade Level'] ? parseInt(rowData['Grade Level'], 10) : NaN;
            const attendancePercentage = rowData['Attendance %'] ? parseFloat(rowData['Attendance %']) : NaN;
            const averageGrade = rowData['Average Grade'] ? parseFloat(rowData['Average Grade']) : NaN;
            const behavioralIncidents = rowData['Behavioral Incidents'] ? parseInt(rowData['Behavioral Incidents'], 10) : NaN;
            const notes = rowData['Notes'] ? String(rowData['Notes']).trim() : '';

            if (!firstName) errors.push("first_name: First Name is required.");
            if (!lastName) errors.push("last_name: Last Name is required.");

            const parsedDob = new Date(dob);
            if (isNaN(parsedDob.getTime())) {
                errors.push("date_of_birth: Invalid date format. Expected YYYY-MM-DD.");
            } else {
                studentToInsert.date_of_birth = parsedDob.toISOString().split('T')[0];
            }

            const validGenders = ['Male', 'Female', 'Other', 'Prefer not to say'];
            if (gender && !validGenders.includes(gender)) {
                errors.push(`gender: Invalid gender '${gender}'. Must be one of: ${validGenders.join(', ')}.`);
            }

            if (isNaN(gradeLevel) || gradeLevel < 1 || gradeLevel > 12) {
                errors.push("grade_level: Must be a valid number between 1 and 12.");
            }

            if (isNaN(attendancePercentage) || attendancePercentage < 0 || attendancePercentage > 100) {
                errors.push("attendance_percentage: Must be a number between 0 and 100.");
            }

            if (isNaN(averageGrade) || averageGrade < 0 || averageGrade > 100) {
                errors.push("average_grade: Must be a number between 0 and 100.");
            }

            if (isNaN(behavioralIncidents) || behavioralIncidents < 0) {
                errors.push("behavioral_incidents: Must be a non-negative number.");
            }

            studentToInsert = {
                first_name: firstName,
                last_name: lastName,
                date_of_birth: studentToInsert.date_of_birth || null,
                gender: gender || null,
                grade_level: isNaN(gradeLevel) ? null : gradeLevel,
                attendance_percentage: isNaN(attendancePercentage) ? null : attendancePercentage,
                average_grade: isNaN(averageGrade) ? null: averageGrade,
                behavioral_incidents: isNaN(behavioralIncidents) ? null : behavioralIncidents,
                notes: notes || null,
                user_id: userId
            };

            if (errors.length > 0) {
                failedImports++;
                failedRowsDetails.push({
                    rowNumber: rowIndex + 1, // +1 because CSV rows are 1 indexed instead of 0
                    originalData: rowData,
                    errors: errors
                });
            } else {

                try {
                    await pool.query(
                        `INSERT INTO students(user_id, first_name, last_name, date_of_birth, gender, grade_level, attendance_percentage, average_grade, behavioral_incidents, notes)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
                        [
                            studentToInsert.user_id, studentToInsert.first_name, studentToInsert.last_name,
                            studentToInsert.date_of_birth, studentToInsert.gender, studentToInsert.grade_level,
                            studentToInsert.attendance_percentage, studentToInsert.average_grade,
                            studentToInsert.behavioral_incidents, studentToInsert.notes
                        ]
                    );
                    successfulImports++;
                } catch (dbErr) {
                    console.error(`Database insertion error for row ${rowIndex + 1}:`, dbErr.message);
                    failedImports++;
                    failedRowsDetails.push({
                        rowNumber: rowIndex + 1,
                        originalData: rowData,
                        errors: [`Database Error: ${dbErr.message}`]
                    });
                }
            }
        };

        for (let i = 0; i < jsonData.length; i++) {
            await processStudentRow(i, jsonData[i]);
        }
        
        let importStatus;
        let importMessage;
        if (successfulImports === jsonData.length && failedImports === 0) {
            importStatus = 'success';
            importMessage = 'All students imported successfully!';
        } else if (successfulImports > 0 && failedImports > 0) {
            importStatus = 'partial_success';
            importMessage = `Import completed with ${successfulImports} successful imports and ${failedImports} failures.`;
        } else {
            importStatus = 'failed';
            importMessage = 'No students could be imported. Please check the errors.';
        }

        res.status(200).json({
            message: importMessage,
            status: importStatus,
            summary: {
                totalRowsProcessed: jsonData.length,
                successfulImports: successfulImports,
                failedImports: failedImports
            },
            failedRows: failedRowsDetails
        });

        } catch (err) {
            console.error('Error during student import:', err.message);
            res.status(500).send('Server Error during file import.');
        }     
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

    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = parseInt(req.query.limit) || 10; // Default to 10 students per page
    const offset = (page - 1) * limit; // Calculate the offset

    const { search, grade } = req.query;

    console.log('Backend received /api/students GET request:');
    console.log(' User ID:', userId);
    console.log(' Query Params (req.query):', req.query);
    console.log(' Pagination: Page', page, ', Limit', limit, ', Offset', offset);

    let baseQuery = 'FROM students WHERE user_id = $1'
    const queryParams = [userId];

    let paramIndex = 2;

    if (search) {
        baseQuery += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex + 1})`;
        queryParams.push(`%${search}%`);
        queryParams.push(`%${search}%`);
        paramIndex += 2
    }

    if (grade) {
        baseQuery += ` AND grade_level = $${paramIndex}`;
        queryParams.push(grade);
        paramIndex++;
    }

    try {
        // Get total count of student matching the filters
        const totalCountResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, queryParams);
        const totalStudents = parseInt(totalCountResult.rows[0].count);

        // Get paginated students
        let paginatedQuery = `SELECT * ${baseQuery}`;
        paginatedQuery += ` ORDER BY last_name, first_name`;
        paginatedQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

        queryParams.push(limit);
        queryParams.push(offset);

        console.log(' Constructed SQL Query for students:', paginatedQuery);
        console.log(' SQL parameters for students:', queryParams);

        const studentsResult = await pool.query(paginatedQuery, queryParams);
        const students = studentsResult.rows;

        // Calculate total pages
        const totalPages = Math.ceil(totalStudents / limit);

        console.log(' Number of students found (current page):', students.length);
        console.log(' Total students(all pages, filtered):', totalStudents);
        console.log(' Total pages:', totalPages);

        res.json({
            students: students,
            currentPage: page,
            totalPages: totalPages,
            totalStudents: totalStudents
        });
    } catch (err) {
        console.error('Error fetching students with pagination:', err.message)
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