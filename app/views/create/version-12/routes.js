const express = require('express')
const router = express.Router()
const {
    DateTime
} = require('luxon')

//redirect the root url to the start page
router.get('/', function (req, res) {
    res.render('create/' + req.version + '/dps-home')
});

// manage activities page
router.get('/manage-activities', function (req, res) {
    res.render('create/' + req.version + '/manage-activities')
});

// create activity journey
router.use('/create-activity', (req, res, next) => {
    let serviceName = req.originalUrl.split('/')[1];
    let version = req.originalUrl.split('/')[2];
    let journey = req.originalUrl.split('/')[3];

    req.protoUrl = serviceName + '/' + version + '/' + journey;
	require('./create-activity/routes')(req, res, next);
});

// log an application journey
router.use('/log-an-application', (req, res, next) => {
    let serviceName = req.originalUrl.split('/')[1];
    let version = req.originalUrl.split('/')[2];
    let journey = req.originalUrl.split('/')[3];

    req.protoUrl = serviceName + '/' + version + '/' + journey;
    require('./log-an-application/routes')(req, res, next);
});

module.exports = router