import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './ClassForm.css';

const ClassForm = () => {
    const [formData, setFormData] = useState({
        class_name: '',
        description: '',
        year: new Date().getFullYear(),
        semester: '',
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const navigate = useNavigate();

    const { class_name, description, year, semester } = formData;

    const onChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors([]);

        try {
            await axios.post('/api/classes', formData);
            alert('Class added successfully!');
            navigate('/classes');
        } catch (err) {
            console.error('Error adding class:', err.response ? err.response.data : err.message);
            if (err.response && err.response.data && err.response.data.errors) {
                setErrors(err.response.data.errors);
            } else {
                setErrors([{ msg: 'Failed to add class. Please try again'}]);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="class-form-container">
            <h2>Add New Class</h2>
            {errors.length > 0 && (
                <div className="alert alert-danger">
                    {errors.map((error, index) => (
                        <p key={index}>{error.msg}</p>
                    ))}
                </div>
            )}
            <form className="form" onSubmit={onSubmit}>
                <div className="form-group">
                    <label htmlFor="class_name">Class Name:</label>
                    <input
                        type="text"
                        placeholder="e.g., Algebra 1"
                        name="class_name"
                        value={class_name}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea
                        placeholder="e.g., Introduction to basic algebraic concepts"
                        name="description"
                        value={description}
                        onChange={onChange}
                        rows="3"
                    ></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="year">Year:</label>
                    <input
                        type="number"
                        placeholder="e.g., 2025"
                        name="year"
                        value={year}
                        onChange={onChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="semester">Semester:</label>
                    <select
                        name="semester"
                        value={semester}
                        onChange={onChange}
                        required
                    >
                        <option value="">-- Select Semester --</option>
                        <option value="Fall">Fall</option>
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                    </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Class'}
                </button>
                <Link to="/classes" className="btn btn-secondary cancel-btn">
                    Cancel
                </Link>
            </form>
        </div>
    );
};

export default ClassForm;