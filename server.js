require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on('error', (error) => console.log(error));
db.once('open', () => console.log('Connected to the database'));

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

app.listen(3001, () => console.log('Listening port 3001'));