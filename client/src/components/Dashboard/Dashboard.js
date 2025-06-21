import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard = () => {
    const [students, setStudents] = useState([]);
    const [teacherName, setTeacherName] = useState('Teacher');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token missing. Please log in.');
                navigate('/login');
                setLoading(false);
                return;
                }

            try {
                const userRes = await axios.get('/api/auth/me', {
                    headers: { 'x-auth-token': token }
                });
                setTeacherName(userRes.data.username);

                const studentsRes = await axios.get('/api/students?limit=10000', {
                    headers: { 'x-auth-token': token }
                });
                setStudents(studentsRes.data.students);
                console.log('Fetched students data:', studentsRes.data.students);
            } catch (err) {
                console.error('Error fetching students for dashboard:', err.response ? err.response.data : err.message);
                if (err.response && err.response.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                } else {
                    setError('Failed to load dashboard data. Please try again.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [navigate]);

    const calculateSummary = () => {
        if (students.length === 0) {
            return {
                totalStudents: 0,
                averageAttendance: 'N/A',
                averageOverallGrade: 'N/A',
                totalBehavioralIncidents: 0
            };
        }

        const totalStudents = students.length;
        let totalAttendance = 0;
        let totalGrade = 0;
        let totalIncidents = 0;
        let studentsWithAttendance = 0;
        let studentsWithGrades = 0;

        students.forEach(student => {
            if (student.attendance_percentage !== null && !isNaN(parseFloat(student.attendance_percentage))) {
                totalAttendance += parseFloat(student.attendance_percentage);
                studentsWithAttendance++;
            }
            if (student.average_grade !== null && !isNaN(parseFloat(student.average_grade))) {
                totalGrade += parseFloat(student.average_grade);
                studentsWithGrades++;
            }
            if (student.behavioral_incidents !== null && !isNaN(parseInt(student.behavioral_incidents))) {
                totalIncidents += parseInt(student.behavioral_incidents);
            }
        });

        const averageAttendance = studentsWithAttendance > 0
            ? (totalAttendance / studentsWithAttendance).toFixed(2) + '%'
            : 'N/A';

        const averageOverallGrade = studentsWithGrades > 0
            ? (totalGrade / studentsWithGrades).toFixed(2)
            : 'N/A';

        return {
            totalStudents,
            averageAttendance,
            averageOverallGrade,
            totalBehavioralIncidents: totalIncidents
        };
    };

    const getGradeDistributionData = () => {
        const gradeCounts = {};
        students.forEach(student => {
            const grade = student.grade_level;
            // Ensure grade is treated as a string key or consistent number
            gradeCounts[grade] = (gradeCounts[grade] || 0) +1;
        });
        
        const data = Object.keys(gradeCounts)
            .sort((a, b) => parseInt(a) - parseInt(b)) // Sort numerically by grade level
            .map(grade => ({
                name: `Grade ${grade}`, // Label for the X-Axis
                students: gradeCounts[grade], // Value for the Y-axis
            }));
        return data;
    };

    const summary = calculateSummary();
    const getGradeDistributionChartData = getGradeDistributionData();

    console.log('Data for chart:', getGradeDistributionChartData);

    if (loading) {
        return <div className="dashboard-loading">Loading Dashboard...</div>;
    }

    if (error) {
        return <div className="dashboard-error">{error}</div>;
    }

    return (
        <div className="dashboard-container">
            <h1>Welcome, {teacherName}</h1>
            <div className="summary-cards">
                <div className="card">
                    <h3>Total Students</h3>
                    <p>{summary.totalStudents}</p>
                </div>
                <div className="card">
                    <h3>Average Attendance</h3>
                    <p>{summary.averageAttendance}</p>
                </div>
                <div className="card">
                    <h3>Average Grade</h3>
                    <p>{summary.averageOverallGrade}</p>
                </div>
                <div className="card">
                    <h3>Total Behavioral Incidents</h3>
                    <p>{summary.totalBehavioralIncidents}</p>
                </div>
            </div>

            <div className="chart-section">
                <h3>Students by Grade Level</h3>
                {getGradeDistributionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                            data={getGradeDistributionChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} /> 
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="students" fill="#8884d8" name="Number of Students" />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p>No student data available to display grade distribution. Add some students!</p>
                )}
            </div>
        </div>
    );
};

export default Dashboard;