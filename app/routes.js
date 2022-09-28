const express = require('express')
const router = express.Router()

// Add your routes here - above the module.exports line

module.exports = router

//CREATE
require('./routes/create/routes-v1.js')(router);
require('./routes/create/routes-v2.js')(router);
require('./routes/create/routes-v3.js')(router);


//UNLOCK
