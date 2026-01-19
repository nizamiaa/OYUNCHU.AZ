const axios = require('axios');
(async ()=>{
  try{
    const login = await axios.post('http://localhost:4000/api/login',{email:'admin@local', password:'secret123'});
    const token = login.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    const products = await axios.get('http://localhost:4000/api/admin/products', { headers });
    console.log('Products count:', products.data.length);
    if(!products.data.length) return console.log('no products');
    const p = products.data[0];
    console.log('Testing edit on product', p.Id || p.id, p.Name || p.name);
    const newName = (p.Name || p.name) + ' (edited)';
    const res = await axios.put(`http://localhost:4000/api/admin/products/${p.Id||p.id}`, { Name: newName }, { headers });
    console.log('Updated product:', res.data.Name || res.data.name);
    // revert
    await axios.put(`http://localhost:4000/api/admin/products/${p.Id||p.id}`, { Name: p.Name || p.name }, { headers });
    console.log('Reverted name');
  }catch(e){
    console.error('ERR', e.toString());
    if(e.response) console.error('RESP', e.response.data);
  }
})();
