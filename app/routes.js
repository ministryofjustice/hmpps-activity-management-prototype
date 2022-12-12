const express = require('express')
const router = express.Router()


//CREATE
require('./routes/create/routes-v1')(router);
require('./routes/create/routes-v2')(router);
require('./routes/create/routes-v3')(router);
require('./routes/create/routes-v4')(router);
require('./routes/create/routes-v5')(router);
require('./routes/create/routes-v6')(router);
require('./routes/create/routes-v7')(router);

//UNLOCK
router.use(/\/unlock\/version-([0-9]+)/, (req, res, next) => {
	req.version = req.originalUrl.split('/')[2]
	require(`./views/unlock/version-${req.params[0]}/routes`)(req, res, next);
})
router.use(/\/unlock\/experimental/, (req, res, next) => {
	req.version = req.originalUrl.split('/')[2]
	require(`./views/unlock/experimental/routes`)(req, res, next);
})


//APPOINTMENTS
router.use(/\/appointments\/version-([0-9]+)/, (req, res, next) => {
	req.version = req.originalUrl.split('/')[2]
	require(`./views/appointments/version-${req.params[0]}/routes`)(req, res, next);
})


module.exports = router
