const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Player = require('../models/player');
const isAdmin = require('../models/middleware/isAdmin');


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

  if ([private_id, name].some(x => typeof x !== 'string')) {
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
  const { private_id, alias, room_id, attempt, found, speed } = req.body;

  if ([private_id, alias, room_id, attempt, speed].some(x => typeof x !== 'string')
    || typeof found !== 'boolean') {
    return res.status(400).json({error: "Invalid arguments"});
  }

  const player = await Player.findOne({
    private_id: private_id
  })

  if (!player) {
    return res.status(400).json({error: 'Player not found'});
  }

  if (attempt < 1 || attempt > 6) {
    return res.status(400).json({error: "Invalid attempt"});
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
    currentDate = new Date(currentDate).toLocaleDateString('en-US');
    const previousAnswer = await Player.findOne({
      private_id: private_id,
      room: {"$elemMatch": {id: room_id, "guesses.date": currentDate}}
    });

    if (previousAnswer) {
      return res.status(400).json({error: "Bugünlük bu kadar, bay bay"});
    }

    // Push the answer into the room array
    const playerResult = await Player.updateOne(
      {private_id: private_id, room: {"$elemMatch": {id: room_id}}},
      {"$push": {"room.$.guesses": {
        attempt: attempt,
        found: found,
        date: currentDate,
        alias: alias,
        speed: speed
      }},
      last_guess_date: currentDate,
    });
    return res.status(200).json(playerResult);
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
})

// Delete a game result
router.put('/delete_game', isAdmin, async (req, res) => {
  const { player_public_id, room_id, guess_id } = req.body;

  if ([player_public_id, room_id, guess_id].some(x => typeof x !== 'string')) {
    return res.status(400).json({error: "Invalid arguments"});
  }

  try {
    const deleteGame = await Player.updateOne({
      _id: player_public_id
    }, {
      $pull : {"room.$[room].guesses" : {"_id": guess_id}}
    },
      { arrayFilters: [{ "room.id": room_id}] }
    )
    return res.status(200).json(deleteGame);
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
})

// Add a cheat game
router.put('/cheat', isAdmin, async (req, res) => {
  const { cheater_public_id, room_id, game_date } = req.body;

  if ([cheater_public_id, room_id, game_date].some(x => typeof x !== 'string')) {
    return res.status(400).json({error: "Invalid arguments"});
  }

  try {
    const cheatGame = await Player.updateOne({
      _id: cheater_public_id
    }, {
      "$set": { "room.$[room].guesses.$[guesses].cheat": true}
    },
    { arrayFilters: [
      { "room.id": room_id},
      {"guesses.date": game_date}]
    })
    return res.status(200).json(cheatGame);
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
})

// Edit the date
router.put('/date', isAdmin, async (req, res) => {
  const { player_public_id, room_id, guess_id, new_date } = req.body;

  if ([player_public_id, room_id, guess_id, new_date].some(x => typeof x !== 'string')) {
    return res.status(400).json({error: "Invalid arguments"});
  }

  try {
    const dateToUpdate = await Player.updateOne({
      _id: player_public_id
    }, {
      "$set": { "room.$[room].guesses.$[guesses].date": new_date}
    },
    { arrayFilters: [
      { "room.id": room_id},
      {"guesses._id": guess_id}]
    })
    return res.status(200).json(dateToUpdate);
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
})

// Merge players
router.put('/merge', async (req, res) => {
  const  { private_id_to_merge, private_id_to_be_merged } = req.body;

  if ([private_id_to_merge, private_id_to_be_merged].some(x => typeof x !== 'string')) {
    return res.status(400).json({error: "Invalid arguments"});
  }

  if (private_id_to_merge === private_id_to_be_merged) {
    return res.status(400).json({error: "Dostum sen zaten bu kişisin?!"});
  }

  try {
    const playerOne = await Player.findOne({private_id: private_id_to_merge});
    const playerTwo = await Player.findOne({private_id: private_id_to_be_merged});
    
    if (!playerOne || !playerTwo) {
      return res.status(400).json({error: "Player does not exist"});
    }

    for (let room of playerTwo.room) {
      const oldRoom = await Player.findOne(
        { 
          private_id: private_id_to_merge,
          room: {"$elemMatch": {id: room.id}}
        }, {_id: 1, name: 1, room: {"$elemMatch": {id: room.id}}}
      )
      
      if (!oldRoom) {
        await Player.updateOne({private_id: private_id_to_merge}, {"$push": {
          room: [{
            id: room.id
          }]
        }});
      }

      for (let guess of room.guesses) {
        await Player.updateOne({
          private_id: private_id_to_merge,
          room: {"$elemMatch": {id: room.id}}},
          {"$push": {"room.$[room].guesses": guess}},
          { arrayFilters: [
            { "room.id": room.id},
          ] }
        )
      }
    }

    await Player.deleteOne({private_id: private_id_to_be_merged});
    return res.status(200).json({private_id: playerOne.private_id, public_id: playerOne._id})    
  } catch (err) {
    return res.status(400).json({error: err.message});
  }
});

module.exports = router;