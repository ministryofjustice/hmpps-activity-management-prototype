const express = require('express')
const router = express.Router()

// Add your routes here - above the module.exports line

module.exports = router

require('./routes/routes-v1.js')(router);
