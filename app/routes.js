const express = require('express')
const router = express.Router()


//CREATE
require('./routes/create/routes-v1')(router);
require('./routes/create/routes-v2')(router);
require('./routes/create/routes-v3')(router);

//UNLOCK
router.use(/\/unlock\/version-([0-9]+)/, (req, res, next) => {
	req.version = req.originalUrl.split('/')[2]

	require(`./views/unlock/version-${req.params[0]}/routes`)(req, res, next);
})


module.exports = router 