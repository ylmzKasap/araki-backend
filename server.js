require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on('error', (error) => console.log(error));
db.once('open', () => console.log('Connected to mongo'));

/* const corsOptions = {
  origin: 'https://www.arakibulasın.com',
  methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
  optionsSuccessStatus: 200
}; */

app.use(cors());
app.use(express.json());

const playerRouter = require('./routes/player');
app.use('/player', playerRouter);

// Invalid route
app.use('*', (req, res) => {
  return res.status(404).send({ errDesc: 'Invalid request' });
});

// Error handling
app.use((err, req, res, next) => {
  console.log('catched: \n', err.stack);
  return res.status(404).send({ errDesc: 'Invalid request' });
});

app.listen(3002, () => console.log('Listening port 3002'));