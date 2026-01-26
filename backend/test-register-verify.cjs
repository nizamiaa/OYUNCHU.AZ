(async () => {
  try {
    const registerRes = await fetch('http://localhost:4000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'VerifyTest', surname: 'User', email: `verifytest+${Date.now()}@example.com`, password: 'password123' })
    });
    const regJson = await registerRes.json();
    console.log('register status', registerRes.status, regJson.ok ? 'ok' : regJson.error || 'no ok');
    const tokenFromDb = regJson.user && regJson.user.EmailVerifyToken;
    if (!tokenFromDb) {
      console.error('No verify token returned in user row');
      return;
    }
    console.log('verify token:', tokenFromDb);

    const verifyRes = await fetch(`http://localhost:4000/api/verify-email/${tokenFromDb}`);
    console.log('verify status', verifyRes.status);
    const verifyText = await verifyRes.text();
    console.log('verify body:', verifyText);
  } catch (e) {
    console.error(e);
  }
})();