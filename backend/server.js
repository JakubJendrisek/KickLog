const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Povolí komunikaci z tvého frontendu
app.use(cors()); 
// Umožní serveru číst JSON data
app.use(express.json()); 

// Testovací trasa (endpoint)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend KickLog funguje!' });
});

app.listen(PORT, () => {
  console.log(`Backend server běží na http://localhost:${PORT}`);
});