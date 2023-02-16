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

	  router.post(`/group-appointments/appointment-repeat-option`, function (req, res) {
		const appRepeat = req.session.data['appointment-repeat'];
		if (appRepeat === 'Yes') {
			res.redirect(`appointment-frequency`);
		} else {
			res.redirect(`upload-or-per-person`);
		}
	  });

	  router.post(`/appointment-management/version-2/appointment-view-options`, function (req, res) {
		const appGroup = req.session.data['group'];
		if (appGroup === 'Yes') {
			res.redirect(`appointment-view`);
		} else {
			res.redirect(`appointment-view#Bulk`);
		}
	  });


	  router.post(`/individual-appointment/prisoner-confirm-question`, function (req, res) {
		const correctPerson = req.session.data['correct-person'];
		if (correctPerson === 'Yes') {
			res.redirect(`appointment-type`);
		} else {
			res.redirect(`search-person`);
		}
	  });


	  router.post(`/individual-appointment/appointment-repeat-question`, function (req, res) {
		const appointRepeat = req.session.data['appointment-repeat'];
		if (appointRepeat === 'Yes') {
			res.redirect(`appointment-frequency`);
		} else {
			res.redirect(`check-answers`);
		}
	  });


	  
module.exports = router