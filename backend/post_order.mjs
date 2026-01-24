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

const res = await fetch('http://localhost:4000/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

console.log('STATUS', res.status);
console.log('BODY', await res.text());
