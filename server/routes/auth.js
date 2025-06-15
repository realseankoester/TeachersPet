const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const auth = require('../middleware/auth')
const { check, validationResult} = require('express-validator');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

router.post(
    '/register', 
    [
        check('username', 'Username is required').not().isEmpty(),
        check('username', 'Username must be alphanumeric (letters and numbers only)').isAlphanumeric(),
        check('username', 'Username must be between 3 and 20 characters').isLength({ min: 3, max: 20}),

        check('email', 'Please include a valid email').isEmail(),

        check('password', 'Password is required').not().isEmpty(),
        check('password', 'Password must be at least 8 characters').isLength({ min: 8 }),
        check('password', 'Password must contain an uppercase letter').matches(/[A-Z]/),
        check('password', 'Password must contain a lowercase letter').matches(/[a-z]/),
        check('password', 'Password must contain a number').matches(/\d/),
        check('password', 'Password must contain a symbol (e.g. !@#$%^&*)').matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    ],
    async (req, res) => {
        // Check for validation errors from the middleware
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            // If there are errors, send a 400 response with the error array
            console.log('Validation errors:', errors.array());
            return res.status(400).json({ errors: errors.array() });
        }
        console.log('Received registration request body:', req.body);
    
        const { username, email, password } = req.body;

        try {
            // Check if user already exists
            const userExists = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
            if (userExists.rows.length > 0) {
                return res.status(400).json({ errors: [{ msg: 'Username or Email already registered' }] });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Save user to database
            const newUser = await pool.query(
                'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
                [username, email, hashedPassword]
            );

            // Create JWT payload
            const payload = {
                user: {
                    id: newUser.rows[0].id,
                },
            };

            jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '1d' },
                (err, token) => {
                    if (err) throw err;
                    res.json({ token, user: { id: newUser.rows[0].id, username: newUser.rows[0].username, email: newUser.rows[0].email } });
                }
            );
        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        //Check if user exists
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.rows[0].password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Create JWT payload
        const payload = {
            user: {
                id: user.rows[0].id,
            },
        };

        // Sign JWT
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            {expiresIn: '1h'},
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: { id: user.rows[0].id, username: user.rows[0].username, email: user.rows[0].email } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Sever Error');
    }
});

router.get('/me', auth, async (req, res) => {
    try {
        const user = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
        if (user.rows.length === 0) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error('Error fetching user profile:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;