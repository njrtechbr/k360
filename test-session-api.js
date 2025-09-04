// Simple test to check if we can get session info
const fetch = require('node-fetch');

async function testSession() {
  try {
    console.log('🧪 Testing session API...');
    
    // First, let's try to login
    const loginResponse = await fetch('http://localhost:3000/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'superadmin@sistema.com',
        password: 'admin123' // Assuming this is the password
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

  } catch (error) {
    console.error('Error testing session:', error.message);
  }
}

testSession();