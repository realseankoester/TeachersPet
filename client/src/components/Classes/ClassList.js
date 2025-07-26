import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const ClassList = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const res = await axios.get('/api/classes');
                setClasses(res.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching classes:', err);
                setError('Failed to load classes. Please try again.');
                setLoading(false);
            }
            // Add code to address specific error codes
        };
        
    
        fetchClasses();
    }, []);

    const handleDeleteClass = async (classId) => {
        if (window.confirm('Are you sure you want to delete this class? This will also remove all student enrollments for this class.')) {
            try {
                await axios.delete(`/api/classes/${classId}`);
                setClasses(classes.filter(cls => cls.id !== classId)); // Update UI
                setSuccessMessage('Class deleted successfully!');
                setTimeout(() => setSuccessMessage(''), 3000); // Clear message after 3 seconds
            } catch (err) {
                console.error('Error deleting class:', err);
                setError('Failed to delete class. Please try again.');
            }
        }
    };
    
    if (loading) {
        return <div>Loading classes...</div>
    }

    if (error) {
        return <div className="error-message">{error}</div>
    }

    return (
        <div className="class-list-containter">
            <h2>Your Classes</h2>
            <Link to="/classes/new" className="btn btn-success">
                Add New Class
            </Link>

            {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}
            {error && <div className="alert alert-danger mt-3">{error}</div>}

            {classes.length === 0 ? (
                <p>No classes found. Add some classes to get started!</p>
            ) : (
                <table className="class-table">
                    <thead>
                        <tr>
                            <th>Class Name</th>
                            <th>Description</th>
                            <th>Year</th>
                            <th>Semester</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {classes.map((c) => (
                            <tr key={c.id}>
                                <td>{c.class_name}</td>
                                <td>{c.description}</td>
                                <td>{c.year}</td>
                                <td>{c.semester}</td>
                                <td>
                                    <Link to={`/classes/${c.id}/students`} className="btn btn-primary btn-sm">
                                        View Students
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteClass(c.id)}
                                        className="btn btn-danger btn-sm"
                                    >
                                        Delete
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

export default ClassList;