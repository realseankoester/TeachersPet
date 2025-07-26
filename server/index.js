require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('./config/db');


const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const classRoutes = require('./routes/classes');

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/classes', classRoutes);

app.get('/', (req, res) => {
    res.send('TeachersPet App Backend API');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Error encountered');
});

module.exports = app; 

if (require.main === module) {
    app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    });
}