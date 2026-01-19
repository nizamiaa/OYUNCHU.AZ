const axios = require('axios');
(async ()=>{
  try{
    const login = await axios.post('http://localhost:4000/api/login',{email:'admin@local',password:'secret123'});
    const token = login.data.token;
    const res = await axios.get('http://localhost:4000/api/admin/stats', { headers: { Authorization: `Bearer ${token}` }});
    console.log('STATS', JSON.stringify(res.data, null, 2));
  }catch(e){
    if (e.response) console.error('ERR', e.response.status, e.response.data);
    else console.error(e);
  }
})();