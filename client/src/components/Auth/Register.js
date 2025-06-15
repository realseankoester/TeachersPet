import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const Register = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password2: '', // Confirm password
    });
    const [error, setError] = useState(''); // General form error (e.g., passwords don't match, or backend errors)
    const [usernameError, setUsernameError] = useState(''); // Specific error for username field
    const [passwordError, setPasswordError] = useState(''); // Specific error for password field
    const navigate = useNavigate();

    const { username, email, password, password2 } = formData;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });

        if (e.target.name === 'username') {
            const value = e.target.value;
            if (value.length === 0) {
                setUsernameError(''); // Clear error if field becomes empty
            } else if (!/^[a-zA-Z0-9]+$/.test(value)) {
                setUsernameError('Username must be alphanumeric (letters and numbers only).');
            } else if (value.length < 3 || value.length > 20) {
                setUsernameError('Username must be between 3 and 20 characters.');
            } else {
                setUsernameError(''); // Clear error if valid
            }
        }

        if (e.target.name === 'password') {
            const value = e.target.value;
            let pwdErrors = [];

            if (value.length === 0) {
                setPasswordError('');
            } else {
                if (value.length < 8) {
                    pwdErrors.push('at least 8 characters');
                }
                if (!/[A-Z]/.test(value)) {
                    pwdErrors.push('at least one uppercase letter');
                }
                if (!/[a-z]/.test(value)) {
                    pwdErrors.push('at least one lowercase letter');
                }
                if (!/\d/.test(value)) {
                    pwdErrors.push('at least one number');
                }
                if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) {
                    pwdErrors.push('at least one symbol (!@#$%&*)');
                }

                if (pwdErrors.length > 0) {
                    setPasswordError('Password must contain: ' + pwdErrors.join(', ')+ '.');
                } else {
                    setPasswordError(''); // Clear error field
                }
            }
        }

        // CLear general error if passwords start matching again
        if (e.target.name === 'password' || e.target.name === 'password2') {
            if (e.target.name === 'password' && e.target.value === password2) {
                setError('');
            } else if (e.target.name === 'password2' && e.target.value === password) {
                setError('');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); // Clear general error on submit
        setUsernameError(''); // Clear specific errors on submit
        setPasswordError('');

        let hasValidationError = false;

        // Username validation
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            setUsernameError('Username must be alphanumeric (letters and numbers only.');
            hasValidationError = true;
        } else if (username.length < 3 || username.length > 20) {
            setUsernameError('Username must be between 3 and 20 characetrs.');
            hasValidationError = true;
        }

        // Password validation
        let pwdErrors = [];
        if (password.length < 8) {
            pwdErrors.push('at least 8 characters');
            }
        if (!/[A-Z]/.test(password)) {
            pwdErrors.push('at least one uppercase letter');
            }
        if (!/[a-z]/.test(password)) {
            pwdErrors.push('at least one lowercase letter');
            }
        if (!/\d/.test(password)) {
            pwdErrors.push('at least one number');
            }
        if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
            pwdErrors.push('at least one symbol (!@#$%&*)');
        }

        if (pwdErrors.length > 0) {
            setPasswordError('Password must contain: ' + pwdErrors.join(', ') + '.');
            hasValidationError = true;
        }

        // Password confirmation
        if (password !== password2) {
            setError('Passwords do not match');
            hasValidationError = true;
        }

        // Stop submission if any frontend validation failed
        if (hasValidationError) {
            return;
        }

        try {
            const res = await axios.post('/api/auth/register', { username, email, password });
            localStorage.setItem('token', res.data.token);
            onLogin(); // Update parent state
            navigate('/'); // Redirect to student list
        } catch (err) {
            console.error(err.resposne ? err.response.data : err.message);
            // Display errors from the backend validation
            if (err.response && err.response.data && err.response.data.errors) {
                // If backend send an array of errors (like with express-validator)
                setError(err.response.data.errors[0].msg || 'Registration failed');
            } else if (err.response && err.response.data && err.response.data.msg) {
                // If backend sends a single message
                setError(err.response.data.msg);
            } else {
                setError('Registration failed. Please try again.');
            }
        }
    };

    return (
        <div className="auth-container">
            <h2>Register</h2>
            <form onSubmit={handleSubmit} className="auth-form">
                {error && <p className="error-message">{error}</p>}
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        name="username"
                        value={username}
                        onChange={handleChange}
                        required
                        className={usernameError ? 'input-error' : ''}
                    />
                    {usernameError && <p className="input-error-message">{usernameError}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        name="password"
                        value={password}
                        onChange={handleChange}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password2">Confirm Password</label>
                    <input
                        type="password"
                        id="password2"
                        name="password2"
                        value={password2}
                        onChange={handleChange}
                        required
                    />
                    {passwordError && (
                        <p className="input-error-message">
                            {passwordError}

                        </p>
                    )}
                </div>
                <button type="Submit" className="btn btn-primary">Register</button>
            </form>
        </div>
    );
};

export default Register;