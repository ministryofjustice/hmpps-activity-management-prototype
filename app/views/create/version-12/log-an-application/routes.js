const express = require('express')
const router = express.Router()
const crypto = require("crypto");
const {
    DateTime
} = require('luxon')

router.all('*', function (req, res, next) {
    console.log(req.session.data['new-activity'])
    next()
})

//redirect the root url to the start page
router.get('/', function (req, res) {
    res.redirect('log-an-application/prisoner-search')
});

// create activity select category page
router.get('/prisoner-search', function (req, res) {
    res.render(req.protoUrl + '/prisoner-search')
});
// prisoner search page post logic
router.post('/prisoner-search', function (req, res) {
    if(req.session.data['prisoner-search'] != 'match'){
        res.redirect('select-prisoner')
    } else {
        res.redirect('prisoner-existing-applications')
    }
});

// select prisoner page
router.get('/select-prisoner', function (req, res) {
    res.render(req.protoUrl + '/select-prisoner')
});
// select prisoner page post logic
router.post('/select-prisoner', function (req, res) {
    res.redirect('prisoner-existing-applications')
});

// prisoner existing applications page
router.get('/prisoner-existing-applications', function (req, res) {
    res.render(req.protoUrl + '/prisoner-existing-applications')
});
// logic for prisoner existing applications page
router.post('/prisoner-existing-applications', function (req, res) {
    if(req.session.data['log-new-application'] == 'yes'){
        res.redirect('select-activity')
    } else {
        res.redirect('prisoner-existing-applications')
    }
});

// select activity page
router.get('/select-activity', function (req, res) {
    let activities = req.session.data['timetable-complete-1']['activities']

    res.render(req.protoUrl + '/select-activity', {
        activities,
    })
});

module.exports = router