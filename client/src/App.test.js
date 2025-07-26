import { render, screen } from '@testing-library/react';
import Login from './components/Auth/Login';
import { BrowserRouter as Router } from 'react-router-dom'; 

test('renders Login component with email and password fields', () => {
  render(
    <Router>
      <Login onLogin={() => {}} /> {/* Pass a mock onLogin prop */}
    </Router>
  );

  // Check for elements by their role and accessible name
  const emailInput = screen.getByLabelText(/Email/i);
  const passwordInput = screen.getByLabelText(/Password/i);
  const loginButton = screen.getByRole('button', { name: /Login/i });

  expect(emailInput).toBeInTheDocument();
  expect(passwordInput).toBeInTheDocument();
  expect(loginButton).toBeInTheDocument();
});