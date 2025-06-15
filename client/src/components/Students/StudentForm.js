import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Students.css';

const StudentForm = () => {
    const { id } = useParams(); // For editing, gets student ID from URL
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '',
        gradeLevel: '',
        attendancePercentage: '',
        averageGrade: '',
        behavioralIncidents: '',
        notes: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (id) {
            // Fetch student data if editing
            const fetchStudent = async () => {
                setLoading(true);
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`/api/students/${id}`, {
                        headers: { 'x-auth-token': token },
                    });
                    const studentData = res.data;
                    setFormData({
                        firstName: studentData.first_name || '',
                        lastName: studentData.last_name || '',
                        // Format date to 'YYYY-MM-DD' for input type="date"
                        dateOfBirth: studentData.date_of_birth ? new Date(studentData.date_of_birth).toISOString().split('T')[0] : '',
                        gender: studentData.gender || '',
                        attendancePercentage: studentData.attendance_percentage !== null ? studentData.attendance_percentage.toString() : '',
                        averageGrade: studentData.average_grade !== null ? studentData.average_grade.toString(): '',
                        behavioralIncidents: studentData.behavioral_incidents !== null ? studentData.behavioral_incidents.toString() :'',
                        notes: studentData.notes || '',
                    });
                    setLoading(false);
                } catch (err) {
                    console.error('Failed to load student data:', err);
                    setError('Failed to load student data. Please check the ID or your authorization');
                    setLoading(false);
                }
            };
            fetchStudent();
        }
    }, [id]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear pervious errors
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let res;

            const studentDatatoSend = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                date_of_birth: formData.dateOfBirth,
                gender: formData.gender,
                grade_level: formData.gradeLevel,
                attendance_percentage: parseFloat(formData.attendancePercentage) || 0,
                average_grade: parseFloat(formData.averageGrade) || 0,
                behavioral_incidents: parseInt(formData.behavioralIncidents, 10) || 0,
                notes: formData.notes,
            };

            if (id) {
                // Update existing student
                res = await axios.put(`/api/students/${id}`, studentDatatoSend, {
                    headers: { 'x-auth-token': token },
                });
                console.log('Student updated:', res.data);
            } else {
                res = await axios.post('/api/students', studentDatatoSend, {
                    headers: { 'x-auth-token': token },
                });
                console.log('New student added:', res.data);
            }

            navigate('/') // Go back to student list
        } catch (err) {
            console.error('Error saving student:', err.response ? err.response.data : err.message);
            setError('Failed to save student data. ' + (err.response && err.response.data.msg ? err.response.data.msg : ''));
        } finally {
            setLoading(false);
        }
    };

    if (loading && id && !formData.firstName) return <div>Loading student details...</div>;

    if (error && id && !formData.firstName) return <div className="error-message">{error}</div>

    return (
        <div className="student-form-container">
            <h2>{id ? 'Edit Student' : 'Add New Student'}</h2>
            <form onSubmit={handleSubmit} className="student-form">
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />   
                </div>
                <div className="form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="dateOfBirth">Date of Birth</label>
                    <input type="date" id="dateOfBirth" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="gender">Gender</label>
                    <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                        <option value=" ">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="gradeLevel">Grade Level</label>
                    <input type="text" id="gradeLevel" name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="attendancePercentage">Attendance (%)</label>
                    <input type="number" id="attendancePercentage" name="attendancePercentage" value={formData.attendancePercentage} onChange={handleChange} step="0.01" min="0" max="100" />
                </div>
                <div className="form-group">
                    <label htmlFor="averageGrade">Average Grade</label>
                    <input type="number" id="averageGrade" name="averageGrade" value={formData.averageGrade} onChange={handleChange} step="0.01" min="0" max="100" />
                </div>
                <div className="form_group">
                    <label htmlFor="behavioralIncidents">Behavioral Incidents</label>
                    <input
                        type="number"
                        id="behavioralIncidents"
                        name="behavioralIncidents"
                        value={formData.behavioralIncidents}
                        onChange={handleChange}
                        min="0"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="notes">Notes</label>
                    <textarea id="notes" name="notes" value={formData.notes} onChange={handleChange}></textarea>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Saving...' : (id ? 'Update Student' : 'Add Student')}
                </button>
                <button type="button" className="btn btn-secondary ml-2" onClick={() => navigate('/')}>Cancel</button>
            </form>
        </div>
    );
};

export default StudentForm;