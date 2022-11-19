const mongoose = require('mongoose');

const playerSchema =  new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  private_id: {
    type: String,
    required: true
  },
  room: [{
    id: String,
    guesses: [{
      attempt: Number,
      found: Boolean,
      date: String,
      alias: String,
      cheat: {
        type: Boolean,
        default: false
      }
    }]
  }],
  last_guess_date: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('Player', playerSchema);
