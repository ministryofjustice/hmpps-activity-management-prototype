const express = require('express')
const router = express.Router()

	//redirect the root url to the start page
	router.get('/', function(req, res) {
		res.redirect(req.version + '/start')
	});

	
	

	router.post(`/group-appointments/add-people-route`, function (req, res) {
		const peopleRoute = req.session.data['add-people-method'];
		if (peopleRoute === 'upload-file') {
			res.redirect(`upload-file`);
		} else {
			res.redirect(`search-person`);
		}
	  });





	  router.post(`/group-appointments/single-or-multiple`, function (req, res) {
		const schedType = req.session.data['schedule-type'];
		if (schedType === 'single-time') {
			res.redirect(`appointment-time`);
		} else {
			res.redirect(`schedule-builder`);
		}
	  });

	  
module.exports = router