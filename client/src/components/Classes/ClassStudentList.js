import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import moment from 'moment';
import './ClassStudentList.css';

const ClassStudentList = () => {
    const { classId } = useParams();
    const [className, setClassName] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClassDetailsAndStudents = async () => {
            try {
                const classRes = await axios.get(`/api/classes/${classId}`);
                setClassName(classRes.data.class_name);
                
                const studentsResponse = await axios.get(`/api/classes/${classId}/students`);
                setStudents(studentsResponse.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fecthing class details or students:', err);
                setError('Failed to load class or students. Please try again.');
                setLoading(false);
                if (err.response && err.response.status === 404) {
                    setError('Class not found or you are not authorized to view it.');
                }
            }
        };

        fetchClassDetailsAndStudents();
    }, [classId]);

    const handleRemoveStudent = async (studentId) => {
        if (window.confirm('Are you sure you want to remove this student from the class?')) {
            try {
                // Send DELETE request to backend
                await axios.delete(`/api/classes/${classId}/students/${studentId}`);
                // Filter out the deleted student from the local state
                setStudents(students.filter(student => student.id !== studentId));
                setSuccessMessage('Student removed from class successfully!');
                setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3 seconds
            } catch (err) {
                console.error('Error removing student from class:', err);
                setError('Failed to remove student. Please try again.');
            }
        }
    };


    if (loading) {
        return <div className="loading-message">Loading students...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    const handleAddStudentClick = () => {
        navigate(`/classes/${classId}/add-student`);
    };

    return (
        <div className="class-student-list-container">
            <h2>Students in Class: {className}</h2>
            <Link to="/classes" className="btn btn-secondary back-btn">
                Back to Classes
            </Link>
            
            <button onClick={handleAddStudentClick} className="btn btn-primary ml-3">
                Add Student to Class
            </button>

            {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}
            {error && <div className="alert alert-danger mt-3">{error}</div>} {/* Display general error */}

            {students.length === 0 ? (
                <p>No students enrolled in this class.</p>
            ) : (
                <table className="student-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Date of Birth</th>
                            <th>Gender</th>
                            <th>Grade Level</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student) => (
                            <tr key={student.id}>
                                <td>{student.first_name} {student.last_name}</td>
                                <td>{moment(student.date_of_birth).format('YYYY-MM-DD')}</td>
                                <td>{student.gender}</td>
                                <td>{student.grade_level}</td>
                                <td>
                                    <Link to={`/students/${student.id}`} className="btn btn-info btn-sm">
                                        View Profile
                                    </Link>
                                    <button
                                        onClick={() => handleRemoveStudent(student.id)}
                                        className="btn btn-danger btn-sm"
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ClassStudentList;