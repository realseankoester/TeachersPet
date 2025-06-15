import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Students.css';

const StudentDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`/api/students/${id}`, {
                    headers: { 'x-auth-token': token },
                });
                setStudent(res.data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setError('Failed to fetch student details. Please check the ID or your authorization.');
                setLoading(false);
            }
        };
        fetchStudent();
    }, [id]);

    if (loading) return <div>Loading student details...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!student) return <div>Student not found.</div>;

    return (
        <div className="student-details-container">
            <h2>{student.first_name} {student.last_name}</h2>
            <div className="detail-item">
                <strong>Date of Birth:</strong> {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}
            </div>
            <div className="detail-item">
                <strong>Gender:</strong> {student.gender || 'N/A'}
            </div>
            <div className="detail-item">
                <strong>Grade Level:</strong> {student.grade_level || 'N/A'}
            </div>
            <div className="detail-item">
                <strong>Attendance Percentage:</strong> {student.attendance_percentage ? `${student.attendance_percentage}%` : 'N/A'}
            </div>
            <div className="detail-item">
                <strong>Average Grade:</strong> {
                student.average_grade !== null && student.average_grade !== undefined && student.average_grade !== ''
                ? parseFloat(student.average_grade).toFixed(2) 
                : 'N/A'}
            </div>
            <div className="detail-item">
                <strong>Behavioral Incidents:</strong> {student.behavioral_incidents !== null ? student.behavioral_incidents : 'N/A'}
            </div>
            <div className="detail-item">
                <strong>Notes:</strong> {student.notes || 'No notes.'}
            </div>
            <div className="detail-actions">
                <Link to={`/students/edit/${student.id}`} className="btn btn-info mr-2">Edit Student</Link>
                <button onClick={() => navigate('/')} className="btn btn-secondary">Back to List</button>
            </div>
        </div>
    );
};

export default StudentDetails;