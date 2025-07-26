// client/src/components/Classes/AddStudentToClass.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';

const AddStudentToClass = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [className, setClassName] = useState('');
    const [students, setStudents] = useState([]); // Students to display for selection
    const [selectedStudents, setSelectedStudents] = useState([]); // Students selected to be added
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch class name
                const classRes = await axios.get(`/api/classes/${classId}`);
                setClassName(classRes.data.class_name);

                // Fetch all students not already in this class (will implement this filtering later)
                // For now, let's just fetch all students
                const allStudentsRes = await axios.get('/api/students');
                setStudents(allStudentsRes.data.students); // Assuming your /api/students returns { students: [], total: ... }

                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load data. Please try again.');
                setLoading(false);
            }
        };
        fetchData();
    }, [classId]);

    const handleSelectStudent = (studentId) => {
        setSelectedStudents(prevSelected => {
            if (prevSelected.includes(studentId)) {
                return prevSelected.filter(id => id !== studentId);
            } else {
                return [...prevSelected, studentId];
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        setError(null);

        if (selectedStudents.length === 0) {
            setError('Please select at least one student.');
            return;
        }

        try {
            await axios.post(`/api/classes/${classId}/students`, { studentIds: selectedStudents });
            setSuccessMessage('Students added to class successfully!');
            setSelectedStudents([]); // Clear selection after successful add
            // Optionally navigate back or refresh student list
            setTimeout(() => {
                navigate(`/classes/${classId}/students`); // Redirect to the class student list
            }, 1500);
        } catch (err) {
            console.error('Error adding students to class:', err);
            setError('Failed to add students to class. Please try again.');
        }
    };

    if (loading) {
        return <div className="loading-message">Loading students for selection...</div>;
    }

    if (error && !successMessage) { // Show error if it's not a temporary success message
        return <div className="error-message">{error}</div>;
    }

    return (
        <div className="add-student-to-class-container">
            <h2>Add Students to {className}</h2>
            <Link to={`/classes/${classId}/students`} className="btn btn-secondary back-btn mb-3">
                Back to Student List
            </Link>

            {successMessage && <div className="success-message">{successMessage}</div>}
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
                <h3>Available Students</h3>
                {students.length === 0 ? (
                    <p>No students available to add.</p>
                ) : (
                    <div className="student-selection-list">
                        {students.map(student => (
                            <div key={student.id} className="form-check">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id={`student-${student.id}`}
                                    value={student.id}
                                    checked={selectedStudents.includes(student.id)}
                                    onChange={() => handleSelectStudent(student.id)}
                                />
                                <label className="form-check-label" htmlFor={`student-${student.id}`}>
                                    {student.first_name} {student.last_name} (Grade: {student.grade_level})
                                </label>
                            </div>
                        ))}
                    </div>
                )}
                <button type="submit" className="btn btn-primary mt-3" disabled={selectedStudents.length === 0}>
                    Add Selected Students
                </button>
            </form>
        </div>
    );
};

export default AddStudentToClass;