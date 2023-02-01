module.exports = (req, res, next) => {
  if (!req.body.admin_id) {
    return res.status(401).json();
  }

  if (typeof req.body.admin_id !== 'string') {
    return res.status(400).json({error: "Invalid arguments"});
  }

  if (req.body.admin_id !== process.env.ADMIN_ID) {
    return res.status(401).json({error: "Go away dude.."});
  }
  next();
};
