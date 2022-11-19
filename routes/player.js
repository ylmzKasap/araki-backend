const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Player = require('../models/player');

const body_is_invalid = (items) => {
  for (let item of items) {
    if (!['string', 'boolean'].includes(typeof item)) {
      return true;
    }
  }
  return false;
}

// Get room results
router.get('/room/:room_id', async (req, res) => {
  try {
    const roomResults = await Player.find({
      room: {"$elemMatch": {id: req.params.room_id}}
    },
      {
        _id: 1,
        name: 1,
        room: {"$elemMatch": {id: req.params.room_id} }
      });
    return res.json(roomResults)
  } catch (err) {
    return res.status(500).json({error: err.message});
  }
})

// Get a single player
router.get('/:public_id/:private_id', async (req, res) => {
  const { public_id, private_id } = req.params;

  try {
    const player = await Player.findOne({
      _id: public_id, 
      private_id: private_id
    },
    {
      _id: 1
    });
    return res.json(player)
  } catch (err) {
    return res.status(500).json({error: err.message});
  }
})

// Create a new player
router.post('/', async (req, res) => {
  const private_id = crypto.randomBytes(64).toString('hex');

  const player = new Player({
    private_id: private_id
  })

  try {
    const newPlayer = await player.save();
    return res.status(201).json({public_id: newPlayer._id, private_id: newPlayer.private_id});
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
})

// Change player name
router.put('/name', async (req, res) => {
  const { private_id, name } = req.body;

  if (body_is_invalid([private_id, name])) {
    return res.status(400).json({error: "Invalid arguments"});
  }

  try {
    const player = await Player.findOne({
      private_id: private_id
    })

    if (!player) {
      return res.status(400).json({error: 'Player not found'});
    }

    if (player.name === name) {
      return res.status(200).json('No change needed');
    } else {
      player.name = name;
      await player.save();
      return res.status(200).json('Player name changed');
    }
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
})

// Add game result
router.put('/guess', async (req, res) => {
  const { private_id, alias, room_id, attempt, found } = req.body;

  if (body_is_invalid([private_id, alias, room_id, attempt, found])) {
    return res.status(400).json({error: "Invalid arguments"});
  }

  const player = await Player.findOne({
    private_id: private_id
  })
  if (!player) {
    return res.status(400).json({error: 'Player not found'});
  }

  try {
    // Update player name if needed
    if (player.name !== alias) {
      player.name = alias;
      await player.save();
    }
    
    // Add the room if it does not exist
    const room = await Player.findOne({
      private_id: private_id,
      room: {"$elemMatch": {id: room_id}}
    });
    if (!room) {
      await Player.updateOne({private_id: private_id}, {"$push": {
        room: [{
          id: room_id
        }]
      }});
    }

    // Only allow one game per day
    let currentDate = Date.now();
    currentDate = new Date(currentDate).toLocaleDateString();
    const previousAnswer = await Player.findOne({
      private_id: private_id,
      room: {"$elemMatch": {id: room_id, "guesses.date": currentDate}}
    });

    if (previousAnswer) {
      return res.status(400).json({error: "Bugünlük bu kadar, bay bay"});
    }

    // Push the answer into the room array
    const player = await Player.updateOne(
      {private_id: private_id, room: {"$elemMatch": {id: room_id}}},
      {"$push": {"room.$.guesses": {
        attempt: attempt,
        found: found,
        date: currentDate,
        alias: alias
      }},
      last_guess_date: currentDate,
    });
    return res.status(200).json(player);
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
})

module.exports = router;