import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Students.css';

const StudentList = () => {
    const [allStudents, setAllStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterGradeLevel, setFilterGradeLevel] = useState('');

    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    useEffect(() => {
    
        const fetchAllStudents = async () => {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                setLoading(false);
                return;
            }

            try {
                const res = await axios.get('/api/students', {
                    headers: {
                        'x-auth-token': token,
                    },
                });
                setAllStudents(res.data);
            } catch (err) {
                console.error('Error fetching all students:', err.resposne ? err.resposne.data : err.message);
                if (err.response && err.response.status === 401) {
                    navigate('/login');
                    localStorage.removeItem('token');
                } else {
                    setError('Failed to fetch students. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchAllStudents();
    }, [navigate]);

    useEffect(() => {
        let currentFilteredStudents = [...allStudents];
        if (debouncedSearchTerm) {
            currentFilteredStudents = currentFilteredStudents.filter(student =>
                student.first_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                student.last_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            );
        }

        if (filterGradeLevel) {
            currentFilteredStudents = currentFilteredStudents.filter(student =>
                parseInt(student.grade_level) === parseInt(filterGradeLevel)
            );
        }
        setFilteredStudents(currentFilteredStudents);
    }, [allStudents, debouncedSearchTerm, filterGradeLevel]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this student?')) {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    navigate('/login');
                    return;
                }
                await axios.delete(`/api/students/${id}`, {
                    headers: {
                        'x-auth-token': token,
                    },
                });
                
                setAllStudents(prevAllStudents => prevAllStudents.filter((student) => student.id !== id));
            } catch (err) {
                console.error('Error deleting student:', err.response ? err.response.data : err.message);
                if (err.response && err.response.status === 401) {
                    navigate('/login');
                    localStorage.removeItem('token');
                } else {
                    setError('Failed to delete student.');
                }
                
            }
        }
    };

    if (loading) return <div>Loading students...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div className="student-list-container">
            <h2>Your Students</h2>
            <Link to="/students/new" className="btn btn-primary mb-3">Add New Student</Link>

            <div className="filters-container mb-3 d-flex">
                <input
                    type="text"
                    placeholder="Search by name..."
                    className="form-control"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="form-select ms-2"
                    value={filterGradeLevel}
                    onChange={(e) => setFilterGradeLevel(e.target.value)}
                >
                    <option value="">All Grades</option>
                    {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>Grade {i +1}</option>
                    ))}
                </select>
            </div>
            {filteredStudents.length === 0 ? (
                (allStudents.length === 0 && !searchTerm && !filterGradeLevel) ? (
                    <p> No students found. Add your first student!</p>
                ) : (
                    <p>No students found matching your criteria.</p>
                )
            ) : (
                <table className="student-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Grade Level</th>
                            <th>Avg. Grade</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student) => (
                            <tr key={student.id}>
                                <td>{student.first_name} {student.last_name}</td>
                                <td>{student.grade_level}</td>
                                <td>{student.average_grade !== null && student.average_grade !== undefined
                                    ? parseFloat(student.average_grade).toFixed(2) : 'N/A'}</td>
                                <td>
                                    <Link to={`/students/${student.id}`} className="btn btn-secondary btn-sm">View</Link>
                                    <Link to={`/students/edit/${student.id}`} className="btn btn-info btn-sm ml-2">Edit</Link>
                                    <button onClick={() => handleDelete(student.id)} className="btn btn-danger btn-sm ml-2">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default StudentList;