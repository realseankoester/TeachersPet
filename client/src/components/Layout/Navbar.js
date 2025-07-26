import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = ({ isAuthenticated, onLogout }) => {
    return (
        <nav className="navbar">
            <Link to="/" className="navbar-brand">Teacher's Pet</Link>
            <ul className="navbar-nav">
                {isAuthenticated ? (
                    <>
                        <li className="nav-item">
                            <Link to="/" className="nav-link">Students</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/dashboard" className="nav-link">Dashboard</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/classes" className="nav-link">Classes</Link>
                        </li>
                        <li className="nav-item">
                            <button onClick={onLogout} className="nav-link logout-btn">Logout</button>
                        </li>
                    </>
                ) : (
                    <>
                        <li className="nav-item">
                            <Link to="/login" className="nav-link">Login</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/register" className="nav-link">Register</Link>
                        </li>
                    </>
                )}
            </ul>
        </nav>
    );
};

export default Navbar;