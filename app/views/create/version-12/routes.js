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
// redirect to payment details page
router.post('/create-activity/risk-assessment-levels', function (req, res) {
    res.redirect('payment-details')
});

// payment details page
router.get('/create-activity/payment-details', function (req, res) {
    res.render('create/' + req.version + '/payment-details')
});
// redirect to payment details check page
router.post('/create-activity/payment-details', function (req, res) {
    res.redirect('payment-details-list')
});

// payment details check page
router.get('/create-activity/payment-details-list', function (req, res) {
    res.render('create/' + req.version + '/payment-details-list')
});
// redirect to education level page
router.post('/create-activity/payment-details-list', function (req, res) {
    res.redirect('education-level-check')
});

// education level check page
router.get('/create-activity/education-level-check', function (req, res) {
    res.render('create/' + req.version + '/education-level-check')
});
// logic for education level check page
router.post('/create-activity/education-level-check', function (req, res) {
    if (req.session.data['education-level-check'] === 'yes') {
        res.redirect('select-education-level')
    } else {
        res.redirect('start-date')
    }
});

// select education level page
router.get('/create-activity/select-education-level', function (req, res) {
    res.render('create/' + req.version + '/select-education-level')
});
// redirect to education level list page
router.post('/create-activity/select-education-level', function (req, res) {
    res.redirect('education-level-list')
});

// education level list page
router.get('/create-activity/education-level-list', function (req, res) {
    res.render('create/' + req.version + '/education-level-list')
});
// redirect to start date page
router.post('/create-activity/education-level-list', function (req, res) {
    res.redirect('start-date')
});

// start date page
router.get('/create-activity/start-date', function (req, res) {
    res.render('create/' + req.version + '/start-date')
});
// redirect to end date check page
router.post('/create-activity/start-date', function (req, res) {
    res.redirect('end-date-check')
});

// end date check page
router.get('/create-activity/end-date-check', function (req, res) {
    res.render('create/' + req.version + '/end-date-check')
});
// redirect logic for end date check page
router.post('/create-activity/end-date-check', function (req, res) {
    if (req.session.data['end-date-check'] === 'yes') {
        res.redirect('end-date')
    } else {
        res.redirect('days-and-times')
    }
});

// end date page
router.get('/create-activity/end-date', function (req, res) {
    res.render('create/' + req.version + '/end-date')
});
// redirect to days and times page
router.post('/create-activity/end-date', function (req, res) {
    res.redirect('days-and-times')
});

// days and times page
router.get('/create-activity/days-and-times', function (req, res) {
    res.render('create/' + req.version + '/days-and-times')
});

module.exports = router