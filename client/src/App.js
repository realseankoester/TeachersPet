import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import StudentList from './components/Students/StudentList';
import StudentForm from './components/Students/StudentForm';
import StudentDetails from './components/Students/StudentDetails';
import NavBar from './components/Layout/Navbar';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';
import axios from 'axios';

// Helper function to set/unset the auth token for axios
const setAuthToken = token => {
  if (token) {
    // Apply to every request if logged in
    axios.defaults.headers.common['x-auth-token'] = token;
  } else {
    // Delete auth header
    delete axios.defaults.headers.common['x-auth-token'];
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for token in localStorage on component mount
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token); // Set token for axios on initial load
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
    // After login, token is in localStorage, so set it for axios
    const token = localStorage.getItem('token');
    if (token) {
      setAuthToken(token); // Set token for axios after successful login
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setAuthToken(null); // Remove token from axios headers on logout
    setIsAuthenticated(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <NavBar isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          {isAuthenticated ? (
            <>
              <Route path="/" element={<StudentList />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students/new" element={<StudentForm />} />
              <Route path="/students/edit/:id" element={<StudentForm />} />
              <Route path="/students/:id" element={<StudentDetails />} />
            </>
          ) : (
              <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </div>
    </Router>
  );
}


export default App;
