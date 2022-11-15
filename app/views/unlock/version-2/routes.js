const express = require('express')
const router = express.Router()

// app data
const prisoners = require('../../../data/prisoners-list-1')

	//redirect the root url to the start page
router.get('/', function(req, res) {
	res.redirect(req.version + '/config')
});

	// CONFIG
router.post('/config', function(req, res) {
	res.redirect('whereabouts')
});

	// ATTENDANCE LIST
router.get('/attendance-list', function(req, res) {
	if(req.session.data['attendance-confirmation'] == 'true'){
		delete req.session.data['attendance-confirmation']
	}

	let filteredPrisoners = []
	if( req.session.data['selected-prisoners'] ) {
		filteredPrisoners = req.session.data['prisoners'].filter(prisoner => req.session.data['selected-prisoners'].includes(prisoner._id))
	} else {
		filteredPrisoners = req.session.data['prisoners'].slice(0,3)
	}

	if(req.session.data['config'] && req.session.data['config']['attend-pattern'] == 'modals') {
		res.redirect('attendance-list--modals')
	} else {
		if(req.session.data['config'] && req.session.data['config']['attendance-list-layout'] == 'sub-navigation') {
			res.render('unlock/' + req.version + '/attendance-list--nav')
		} else if(req.session.data['config'] && req.session.data['config']['attendance-list-layout'] == 'tabs') {
			res.render('unlock/' + req.version + '/attendance-list')
		} else if(req.session.data['config'] && req.session.data['config']['attendance-list-layout'] == 'basic') {
			res.render('unlock/' + req.version + '/attendance-list--basic')
		} else {
			res.render('unlock/' + req.version + '/attendance-list--toolbar', { filteredPrisoners })
		}
	}
});
router.post('/attendance-list', function(req, res) {
	res.redirect('add-attendance-details')
});

	// ATTENDANCE DETAILS MULTIPLE
router.get('/add-attendance-details--multiple', function(req, res) {
	let selectedPrisoners = req.session.data['selected-prisoners']
	let filteredPrisoners = req.session.data['prisoners'].filter(function(prisoner){
		return selectedreq.session.data['prisoners'].indexOf(prisoner._id) > -1;
	});

	res.render('unlock/' + req.version + '/add-attendance-details--multiple', { filteredPrisoners, selectedPrisoners })
});

	// ATTENDANCE DETAILS
router.get('/add-attendance-details', function(req, res) {
	delete req.session.data['attendance-details']
	let filteredPrisoners = []

	if( req.session.data['selected-prisoners'] ) {
		filteredPrisoners = req.session.data['prisoners'].filter(prisoner => req.session.data['selected-prisoners'].includes(prisoner._id))
	} else {
		filteredPrisoners = req.session.data['prisoners'].slice(0,3)
	}

	if(req.session.data['config'] && req.session.data['config']['attendance-list-layout'] == 'toolbar') {
		res.render('unlock/' + req.version + '/add-attendance-details--toolbar', { filteredPrisoners })
	} else {
		res.render('unlock/' + req.version + '/add-attendance-details', { filteredPrisoners })
	}
});
router.post('/add-attendance-details', function(req, res) {
	if(req.session.data['config'] && req.session.data['config']['attendance-list-layout'] == 'toolbar') {
		req.session.data['attendance-confirmation'] = 'true'
		res.redirect('attendance-list')
	} else {
		res.redirect('check-attendance-details')
	}
});


// check variable pay
router.get('/check-variable-pay', function(req, res) {
	let filteredPrisoners = []

	if( req.session.data['selected-prisoners'] ) {
		filteredPrisoners = req.session.data['prisoners'].filter(prisoner => req.session.data['selected-prisoners'].includes(prisoner._id))
	} else {
		filteredPrisoners = req.session.data['prisoners'].slice(0,3)
	}

	res.render('unlock/' + req.version + '/check-variable-pay', { filteredPrisoners })
});
router.post('/check-variable-pay', function(req, res) {
	if(req.session.data['non-standard-pay'] == 'no'){
		res.redirect('add-attendance-details')
	} else {
		req.session.data['attendance-confirmation'] = 'true'
		res.redirect('attendance-list')
	}
});

	// CHECK ATTENDANCE DETAILS
router.get('/check-attendance-details', function(req, res) {
	let attendanceDetails = req.session.data['attendance-details']
	let filteredPrisoners = []

	if( req.session.data['selected-prisoners'] ) {
		filteredPrisoners = req.session.data['prisoners'].filter(prisoner => req.session.data['selected-prisoners'].includes(prisoner._id))
	} else {
		filteredPrisoners = req.session.data['prisoners'].slice(0,3)
	}		

	res.render('unlock/' + req.version + '/check-attendance-details', { attendanceDetails })
});
router.post('/check-attendance-details', function(req, res) {
	res.redirect('attendance-confirmation')
});

	// REFUSALS LIST
router.get('/refusals-list', function(req, res) {
	if(req.session.data['config'] && req.session.data['config']['attend-pattern'] == 'modals') {
		res.redirect('refusals-list--modals')
	} else {
		res.render('unlock/' + req.version + '/refusals-list')
	}
});
router.post('/refusals-list', function(req, res) {
	if(req.session.data['selected-prisoners'].length > 1) {
		res.redirect('add-attendance-details--multiple')
	} else {
		res.redirect('add-attendance-details--single')
	}
});

	// SELECT UNLOCK LOCATIONS	
router.post('/select-unlock-locations', function(req, res) {
	res.redirect('unlock-list')
});

	// SELECT REFUSALS LOCATIONS
router.post('/select-refusals-locations', function(req, res) {
	res.redirect('refusals-list')
});

	// SELECT-ACTIVITY
router.get('/select-activity', function(req, res) {
	if(req.session.data['config'] && req.session.data['config']['select-activity-pattern'] == 'select-date-table') {
		res.redirect('select-activity-2')
	} else if(req.session.data['config'] && req.session.data['config']['select-activity-pattern'] == 'table') {
		res.redirect('select-activity-3')
	} else {
		res.render('unlock/' + req.version + '/select-activity')
	}
});
router.post('/select-activity', function(req, res) {
		// req.session.data['activity-date'] = req.session.data['date'].split("/")

	res.redirect('attendance-list')
});

	// SELECT-ACTIVITY-2
router.post('/select-activity-2', function(req, res) {		
	res.redirect('select-activity-2__results')
});

module.exports = router