const request = require('supertest');
const app = require('../index');
const pool = require('../config/db'); 

// Basic test: Check if app exists
describe('Backend API Status', () => {
    it('should return 200 for a public route (if any exists, otherwise skip or create a dummy one)', async () => {
        
        const res = await request(app).get('/api/auth/me'); 
        expect(res.statusCode).toBe(401); // Expect 401 Unauthorized if no token
        expect(res.body.msg).toBe('No token, authorization denied');
    });

    
    it('should return 200 for the root path with the correct message', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('TeachersPet App Backend API');
    });
});

afterAll(async () => {
  await pool.end(); // Close the database connection after tests
});