const express = require('express')
const router = express.Router()

	//redirect the root url to the start page
	router.get('/', function(req, res) {
		res.redirect(req.version + '/start')
	});

	

  router.post(`/recurring-single-appointment/appointment-repeat-question`, function (req, res) {
	const appointRepeat = req.session.data['appointment-repeat'];
	if (appointRepeat === 'Yes') {
		res.redirect(`appointment-frequency`);
	} else {
		res.redirect(`check-answers`);
	}
  });

  router.post('/recurring-single-appointment/date-and-time', function(req, res) {
	{
		//Change numerical month to short month name
		req.session.data.month = getMonthName(req.session.data.month)
		req.session.data.dateofappointment = req.session.data.day + " " + req.session.data.month + " " + req.session.data.year
		
	}
});

function getMonthName(monthNumber) {
const date = new Date();
date.setMonth(monthNumber - 1);
return date.toLocaleString('en-US', { month: 'long' });
}
	  
module.exports = router