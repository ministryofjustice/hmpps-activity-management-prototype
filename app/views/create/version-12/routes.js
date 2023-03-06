const express = require('express')
const router = express.Router()
const {
    DateTime
} = require('luxon')

// app data
const prisoners = require('../../../data/prisoners-list-3')

//redirect the root url to the start page
router.get('/', function (req, res) {
    res.render('create/' + req.version + '/dps-home')
});

// manage activities page
router.get('/manage-activities', function (req, res) {
    res.render('create/' + req.version + '/manage-activities')
});

// create activity start page redirect
router.get('/create-activity', function (req, res) {
    res.redirect('create-activity/select-category')
});

// create activity select category page
router.get('/create-activity/select-category', function (req, res) {
    res.render('create/' + req.version + '/create-activity-select-category')
});
router.post('/create-activity/select-category', function (req, res) {
    res.redirect('activity-name')
});

// create activity activity name page
router.get('/create-activity/activity-name', function (req, res) {
    res.render('create/' + req.version + '/activity-name')
});
//redirect to create activity risk assessment page
router.post('/create-activity/activity-name', function (req, res) {
    res.redirect('risk-assessment-levels')
});

// risk assessment levels page
router.get('/create-activity/risk-assessment-levels', function (req, res) {
    res.render('create/' + req.version + '/risk-assessment-levels')
});
    
module.exports = router