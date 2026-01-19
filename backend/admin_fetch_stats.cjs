const axios = require('axios');
(async () => {
  try {
    const login = await axios.post('http://localhost:4000/api/login', { email: 'admin@local', password: 'secret123' });
    const token = login.data.token;
    const stats = await axios.get('http://localhost:4000/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
    console.log(JSON.stringify(stats.data, null, 2));
  } catch (err) {
    console.error('ERR', err.toString());
    if (err.response) console.error('RESP', err.response.data);
  }
})();
