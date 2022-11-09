const express = require('express')
const router = express.Router()

	//redirect the root url to the start page
	router.get('/', function(req, res) {
		res.redirect(req.version + '/config')
	});

	router.post('/config', function(req, res) {
		res.redirect('whereabouts')
	});

	router.get('/attendance-list', function(req, res) {
		if(req.session.data['config'] && req.session.data['config']['attend-pattern'] == 'modals') {
			res.redirect('attendance-list--modals')
		} else {
			res.render('unlock/' + req.version + '/attendance-list')
		}
	});
	router.post('/attendance-list', function(req, res) {
		if(req.session.data['selected-prisoners'].length > 1) {
			res.redirect('add-attendance-details--multiple')
		} else {
			res.redirect('add-attendance-details--single')
		}
	});

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

	router.post('/select-unlock-locations', function(req, res) {
		res.redirect('unlock-list')
	});

	router.post('/select-refusals-locations', function(req, res) {
		res.redirect('refusals-list')
	});

	router.post('/select-activity', function(req, res) {
		req.session.data['activity-date'] = req.session.data['date'].split("/")
		
		res.redirect('attendance-list')
	});
	
	
	module.exports = router