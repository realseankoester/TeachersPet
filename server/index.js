require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

pool.connect((err, client, done) => {
    if (err) {
        console.error('Database connection error', err);
        return;
    }
    console.log('Connected to PostgreSQL database');
    done();
});

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);

app.get('/', (req, res) => {
    res.send('TeachersPet App Backend API');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Error encountered');
});

app.listen(port, () => {
    console.log(`Sever running on port ${port}`);
});