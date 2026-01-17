(async ()=>{
  try{
    const sql = "UPDATE Users SET Role='admin' WHERE Email='admin@local'; SELECT Id, Name, Email, Role FROM Users WHERE Email='admin@local'";
    const res = await fetch('http://localhost:4000/api/query', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ sql })
    });
    const txt = await res.text();
    console.log('STATUS', res.status);
    console.log(txt);
  }catch(e){
    console.error(e);
  }
})();
