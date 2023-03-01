const express = require('express')
const router = express.Router()

	//redirect the root url to the start page
	router.get('/', function(req, res) {
		res.redirect(req.version + '/start')
	});

	
	

	router.post(`/group-appointments/add-people-route`, function (req, res) {
		const peopleRoute = req.session.data['add-people-method'];
		if (peopleRoute === 'upload-file') {
			res.redirect(`upload-file-info`);
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

	  router.post(`/group-appointments/appointment-repeat-question`, function (req, res) {
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
		const appointRepeat = req.session.data['appointment-repeat-single'];
		if (appointRepeat === 'Yes') {
			res.redirect(`appointment-frequency`);
		} else {
			res.redirect(`check-answers`);
		}
	  });


	  router.post(`/individual-appointment/check-answer/appointment-repeat-question-check-answer`, function (req, res) {
		const appointRepeat = req.session.data['appointment-repeat'];
		if (appointRepeat === 'Yes') {
			res.redirect(`appointment-frequency`);
		} else {
			res.redirect(`../check-answers`);
		}
	  });

	 
	 


router.post('/individual-appointment/appointment-date', function(req, res) {
	{
		//Change numerical month to short month name
		req.session.data.month = getMonthName(req.session.data.month)
		req.session.data.dateofappointmentsingle = req.session.data.day + " " + req.session.data.month + " " + req.session.data.year
		res.redirect('appointment-time')
	}
});

function getMonthName(monthNumber) {
const date = new Date();
date.setMonth(monthNumber - 1);
return date.toLocaleString('en-US', { month: 'long' });
}



router.post(`/bulk-appointments/bulk-more-people`, function (req, res) {
	const peoleRepeat = req.session.data['add-another-person-question-bulk'];
	if (peoleRepeat === 'Yes') {
		res.redirect(`upload-file`);
	} else {
		res.redirect(`appointment-time`);
	}
  });


  router.post(`/group-appointments/add-more-people`, function (req, res) {
	const peoleRepeat = req.session.data['add-another-person-question'];
	if (peoleRepeat === 'Yes') {
		res.redirect(`upload-or-per-person`);
	} else {
		res.redirect(`non-associations`);
	}
  });

  router.post(`../../tickets-for-dev/designs/recurring-single-appointment/appointment-repeat-question`, function (req, res) {
	const appointRepeat = req.session.data['appointment-repeat'];
	if (appointRepeat === 'Yes') {
		res.redirect(`appointment-frequency`);
	} else {
		res.redirect(`check-answers`);
	}
  });


	  
module.exports = router