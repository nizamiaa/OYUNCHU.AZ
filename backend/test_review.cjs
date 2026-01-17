const axios = require('axios');
(async ()=>{
  try{
    const login = await axios.post('http://localhost:4000/api/login',{email:'admin@local',password:'secret123'});
    console.log('LOGIN', login.data);
    const token = login.data.token;
    const review = await axios.post('http://localhost:4000/api/products/1/reviews',{rating:5, text:'Test from script'}, { headers: { Authorization: `Bearer ${token}` }});
    console.log('REVIEW', review.data);
  }catch(e){
    if (e.response) console.error('ERR', e.response.status, e.response.data);
    else console.error(e);
  }
})();
