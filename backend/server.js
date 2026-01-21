const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

const userRouter = require('./Routes/UserRoute');

// Povolí komunikaci z tvého frontendu
app.use(cors()); 
// Umožní serveru číst JSON data
app.use(express.json()); 

app.use('/api/users', userRouter);

// Testovací trasa (endpoint)
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend KickLog funguje!' });
});

app.listen(PORT, () => {
  console.log(`Backend server běží na http://localhost:${PORT}`);
});