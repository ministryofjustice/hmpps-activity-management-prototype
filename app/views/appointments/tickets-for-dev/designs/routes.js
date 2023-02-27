const express = require('express')
const router = express.Router()

	//redirect the root url to the start page
	router.get('/', function(req, res) {
		res.redirect(req.version + '/start')
	});

	

  router.post(`/recurring-single-appointment/appointment-repeat-question`, function (req, res) {
	const appointRepeat = req.session.data['appointment-repeat'];
	if (appointRepeat === 'No') {
		res.redirect(`check-answers`);
	} else {
		res.redirect(`appointment-frequency`);
	}
  });

  
	  
module.exports = router