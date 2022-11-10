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
		if(req.session.data['config'] && req.session.data['config']['attend-pattern'] == 'modals') {
			res.redirect('attendance-list--modals')
		} else {
			res.render('unlock/' + req.version + '/attendance-list')
		}
	});
	router.post('/attendance-list', function(req, res) {
		// if(req.session.data['selected-prisoners'].length > 1) {
		// 	res.redirect('add-attendance-details--multiple')
		// } else {
		// 	res.redirect('add-attendance-details--single')
		// }

		res.redirect('add-attendance-details')
	});

	// ATTENDANCE DETAILS
	router.get('/add-attendance-details', function(req, res) {
		let filteredPrisoners = []

		if( req.session.data['selected-prisoners'] ) {
			filteredPrisoners = prisoners.filter(prisoner => req.session.data['selected-prisoners'].includes(prisoner._id))
		} else {
			filteredPrisoners = prisoners.slice(0,3)
		}

		res.render('unlock/' + req.version + '/add-attendance-details', { filteredPrisoners })
	});
	router.post('/add-attendance-details', function(req, res) {
		res.redirect('check-attendance-details')
	});

	// ATTENDANCE DETAILS MULTIPLE
	router.get('/add-attendance-details--multiple', function(req, res) {
		let selectedPrisoners = req.session.data['selected-prisoners']
		let filteredPrisoners = prisoners.filter(function(prisoner){
			return selectedPrisoners.indexOf(prisoner._id) > -1;
		});

		res.render('unlock/' + req.version + '/add-attendance-details--multiple', { filteredPrisoners, selectedPrisoners })
	});

	// CHECK ATTENDANCE DETAILS
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
		if(req.session.data['config'] && req.session.data['config']['select-activity-pattern'] == 'table') {
			res.redirect('select-activity-2')
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