const express = require('express')
const router = express.Router()
const {
    DateTime
} = require('luxon')

//redirect the root url to the start page
router.get('/', function (req, res) {
    res.redirect('create-activity/select-category')
});

// create activity select category page
router.get('/select-category', function (req, res) {
    res.render(req.protoUrl + '/select-category')
});
router.post('/select-category', function (req, res) {
    res.redirect('activity-name')
});

// create activity activity name page
router.get('/activity-name', function (req, res) {
    res.render(req.protoUrl + '/activity-name')
});
//redirect to create activity risk assessment page
router.post('/activity-name', function (req, res) {
    res.redirect('risk-assessment-levels')
});

// risk assessment levels page
router.get('/risk-assessment-levels', function (req, res) {
    res.render(req.protoUrl + '/risk-assessment-levels')
});
// redirect to payment details page
router.post('/risk-assessment-levels', function (req, res) {
    res.redirect('payment-details')
});

// payment details page
router.get('/payment-details', function (req, res) {
    res.render(req.protoUrl + '/payment-details')
});
// redirect to payment details check page
router.post('/payment-details', function (req, res) {
    res.redirect('payment-details-list')
});

// payment details check page
router.get('/payment-details-list', function (req, res) {
    res.render(req.protoUrl + '/payment-details-list')
});
// redirect to education level page
router.post('/payment-details-list', function (req, res) {
    res.redirect('education-level-check')
});

// education level check page
router.get('/education-level-check', function (req, res) {
    res.render(req.protoUrl + '/education-level-check')
});
// logic for education level check page
router.post('/education-level-check', function (req, res) {
    if (req.session.data['education-level-check'] === 'yes') {
        res.redirect('select-education-level')
    } else {
        res.redirect('start-date')
    }
});

// select education level page
router.get('/select-education-level', function (req, res) {
    res.render(req.protoUrl + '/select-education-level')
});
// redirect to education level list page
router.post('/select-education-level', function (req, res) {
    res.redirect('education-level-list')
});

// education level list page
router.get('/education-level-list', function (req, res) {
    res.render(req.protoUrl + '/education-level-list')
});
// redirect to start date page
router.post('/education-level-list', function (req, res) {
    res.redirect('start-date')
});

// start date page
router.get('/start-date', function (req, res) {
    res.render(req.protoUrl + '/start-date')
});
// redirect to end date check page
router.post('/start-date', function (req, res) {
    res.redirect('end-date-check')
});

// end date check page
router.get('/end-date-check', function (req, res) {
    res.render(req.protoUrl + '/end-date-check')
});
// redirect logic for end date check page
router.post('/end-date-check', function (req, res) {
    if (req.session.data['end-date-check'] === 'yes') {
        res.redirect('end-date')
    } else {
        res.redirect('days-and-times')
    }
});

// end date page
router.get('/end-date', function (req, res) {
    res.render(req.protoUrl + '/end-date')
});
// redirect to days and times page
router.post('/end-date', function (req, res) {
    res.redirect('days-and-times')
});

// days and times page
router.get('/days-and-times', function (req, res) {
    res.render(req.protoUrl + '/days-and-times')
});
// redirect to bank holiday check page
router.post('/days-and-times', function (req, res) {
    res.redirect('bank-holiday-check')
});

// bank holiday check page
router.get('/bank-holiday-check', function (req, res) {
    res.render(req.protoUrl + '/bank-holiday-check')
});
// redirect activity location select page
router.post('/bank-holiday-check', function (req, res) {
    res.redirect('select-activity-location')
});

// activity location select page
router.get('/select-activity-location', function (req, res) {
    res.render(req.protoUrl + '/select-activity-location')
});
// redirect to allocation count page
router.post('/select-activity-location', function (req, res) {
    res.redirect('allocation-count')
});

// allocation count page
router.get('/allocation-count', function (req, res) {
    res.render(req.protoUrl + '/allocation-count')
});
// redirect to new activity check answers page
router.post('/allocation-count', function (req, res) {
    res.redirect('check-answers')
});

// create activity check answers page
router.get('/check-answers', function (req, res) {
    res.render(req.protoUrl + '/check-answers')
});
// redirect to confirmation page
router.post('/check-answers', function (req, res) {
    res.redirect('confirmation')
});

// confirmation page
router.get('/confirmation', function (req, res) {
    res.render(req.protoUrl + '/confirmation')
});

module.exports = router