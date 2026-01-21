const axios = require('axios');
(async ()=>{
  try{
    const base = 'http://localhost:5174';
    const login = await axios.post(base + '/api/login',{email:'admin@local', password:'secret123'});
    const token = login.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('Got token, now creating product via proxy...');
    const res = await axios.post(base + '/api/admin/products', { Name: 'TEST PRODUCT X', Price: 9.99 }, { headers });
    console.log('Create response:', res.status, res.data);
  }catch(e){
    console.error('ERR', e.toString());
    if(e.response) console.error('RESP', e.response.status, e.response.data);
  }
})();
