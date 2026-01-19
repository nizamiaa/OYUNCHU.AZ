const axios = require('axios');
(async ()=>{
  try{
    const login = await axios.post('http://localhost:4000/api/login',{email:'admin@local',password:'secret123'});
    const token = login.data.token;
    const sql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'";
    const res = await axios.post('http://localhost:4000/api/query',{sql},{ headers: { Authorization: `Bearer ${token}` }});
    console.log('TABLES', res.data);
  }catch(e){
    if (e.response) console.error('ERR', e.response.status, e.response.data);
    else console.error(e);
  }
})();