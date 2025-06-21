import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Students.css';

const StudentList = () => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    const [filterGradeLevel, setFilterGradeLevel] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

    const [currentPage, setCurrentPage] = useState(1);
    const [studentsPerPage, setStudentsPerPage] = useState(10); // Default items per page
    const [totalStudents, setTotalStudents] = useState(0); // Total count from backend
    const [totalPages, setTotalPages] = useState(0); // Calculated total pages

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    useEffect(() => {
    
        const fetchStudents = async () => {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                setLoading(false);
                return;
            }

            try {
               const queryParams = new URLSearchParams();
               if (debouncedSearchTerm) {
                    queryParams.append('search', debouncedSearchTerm);
               }
               if(filterGradeLevel) {
                    queryParams.append('grade', filterGradeLevel);
               }
                    queryParams.append('page', currentPage);
                    queryParams.append('limit', studentsPerPage);

               const res = await axios.get(`/api/students?${queryParams.toString()}`, {
                    headers: {
                        'x-auth-token': token,
                    },
               });

               setStudents(res.data.students);

               setTotalStudents(res.data.totalStudents);
               setTotalPages(res.data.totalPages);

            } catch (err) {
                console.error('Error fecthing students:', err.response ? err.response.data : err.message);
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
        fetchStudents();
    }, [navigate, debouncedSearchTerm, filterGradeLevel, currentPage, studentsPerPage]);

    // Handle page change for pagination controls
    const handlePageChange = (pageNumber) => {
        if (pageNumber > 0 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };

    // Handle students per page limit change
    const handleStudentsPerPageChange = (e) => {
        setStudentsPerPage(parseInt(e.target.value));
        setCurrentPage(1); // Reset to first page when limit changes
    }

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

                if (students.length === 1 && currentPage > 1) {
                    setCurrentPage(prev => prev -1);
                } else {
                    setCurrentPage(prev => prev);  // Forces a re-render/re-fetch of current page
                }
                
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

            {totalStudents > 0 && (
                <div className="student-list-header">
                    <div className="students-per-page">
                        Show{' '}
                        <select value={studentsPerPage} onChange={handleStudentsPerPageChange}>
                            <option value="5">5</option>
                            <option value="10">10</option>
                            <option value="20">20</option>
                            <option value="50">50</option>
                        </select>{' '}
                        students per page
                    </div>
                    <div className="total-students-info">
                        Showing {students.length} of {totalStudents} students
                    </div>
                </div>
            )}

            {students.length === 0 ? (
                (totalStudents === 0 && !searchTerm && !filterGradeLevel) ? (
                    <p>No students found. Add your first student!</p>
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
                        {students.map((student) => (
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

            {totalPages > 1 && (
                <div className="pagination-controls">
                    <button
                        onClick={() => handlePageChange(currentPage -1)}
                        disabled={currentPage === 1}
                        className="pagination-button"
                    >
                        Previous
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                        <button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            className={`pagination-button ${currentPage === pageNumber ? 'active' : ''}`}
                        >
                            {pageNumber}
                        </button>
                    ))}

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="pagination-button"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentList;