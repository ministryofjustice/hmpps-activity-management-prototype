const express = require('express')
const router = express.Router()

	//redirect the root url to the start page
	router.get('/', function(req, res) {
		res.redirect(req.version + '/whereabouts')
	});

	router.post('/select-unlock-locations', function(req, res) {
		res.redirect('unlock-list')
	});

	router.post('/select-activity', function(req, res) {
		res.redirect('attendance-list')
	});
	
	
	module.exports = router