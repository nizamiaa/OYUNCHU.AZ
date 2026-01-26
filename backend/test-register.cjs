(async () => {
  try {
    const res = await fetch('http://localhost:4000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Salam', surname: 'Aleykum', email: 'salam123+test@example.com', password: 'password123' })
    });
    console.log('status', res.status);
    const text = await res.text();
    console.log('body:', text);
  } catch (e) {
    console.error(e);
  }
})();