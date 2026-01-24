const axios = require('axios');

(async () => {
  try {
    const payload = {
      name: 'Test',
      surname: 'User',
      phone: '+994501234567',
      city: 'baku',
      address: 'Test st',
      payment: 'card',
      deliveryMethod: 'courier',
      total: 123.45,
      items: [{ id: 1, price: 123.45, qty: 1 }]
    };
    const res = await axios.post('http://localhost:4000/api/orders', payload);
    console.log('STATUS', res.status);
    console.log('DATA', res.data);
  } catch (err) {
    if (err.response) {
      console.error('RESPONSE ERROR', err.response.status, err.response.data);
    } else {
      console.error('ERROR', err.message);
    }
  }
})();
