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
			res.redirect(`clashes`);
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


	  router.post(`/individual-appointment/appointment-repeat-result`, function (req, res) {
		const appointRepeat = req.session.data['appointment-repeat-single'];
		if (appointRepeat === 'Yes') {
			res.redirect(`appointment-frequency`);
		} else {
			res.redirect(`prisoner-comments`);
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
	if (peoleRepeat === 'No') {
		res.redirect(`non-associations`);
	} else {
		res.redirect(`upload-or-per-person`);
	}
  });


  router.post(`/group-appointments/add-more-people-all-removed`, function (req, res) {
	const peoleRepeat = req.session.data['remove-last-person-question'];
	if (peoleRepeat === 'No') {
		res.redirect(`dps-home`);
	} else {
		res.redirect(`upload-or-per-person`);
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

  router.post(`/individual-appointment/prisoner-confirmed-question`, function (req, res) {
	const peoleRepeat = req.session.data['correct-person-single'];
	if (peoleRepeat === 'No') {
		res.redirect(`search-person`);
	} else {
		res.redirect(`appointment-type`);
	}
  });
  
  router.post(`/appointment-management/change-answers/repeat-question`, function (req, res) {
	const appRepeat = req.session.data['appointment-repeat'];
	if (appRepeat === 'Yes') {
		res.redirect(`appointment-frequency`);
	} else {
		res.redirect(`../single-appointment-no-recurrence-edited`);
	}
  });

  router.post(`/appointment-management/cancel-group/cancel-question`, function (req, res) {
	const appRepeat = req.session.data['appointment-cancel'];
	if (appRepeat === 'Yes') {
		res.redirect(`cancel-occurence-question`);
	} else {
		res.redirect(`../single-appointment-no-recurrence-cl`);
	}
  });

  router.post(`/appointment-management/cancel-group-alt/cancel-question`, function (req, res) {
	const appRepeat = req.session.data['appointment-cancel'];
	if (appRepeat === 'Yes') {
		res.redirect(`cancel-occurence-question`);
	} else {
		res.redirect(`../group-appointment-multiple-occurrences`);
	}
  });
	  
  router.post(`/appointment-management/change-answers-multiple/multi-occurrence-question`, function (req, res) {
	const appRepeat = req.session.data['which-occurrence'];
	if (appRepeat === 'This occurrence') {
		res.redirect(`../single-appointment-single-occurrence`);
	} else if (appRepeat === 'This and the following occurrences') {
		res.redirect(`../single-appointment-multiple-occurrences`);
	}
	else if (appRepeat === 'All occurrences') {
		res.redirect(`../single-appointment-multiple-occurrences`);
	}
  });

  router.post(`/appointment-management/change-answers-group-alt/multi-occurrence-question-alt`, function (req, res) {
	const appRepeat = req.session.data['which-occurrence'];
	if (appRepeat === 'This occurrence') {
		res.redirect(`../single-appointment-single-occurrence`);
	} else if (appRepeat === 'This and the following occurrences') {
		res.redirect(`../single-appointment-multiple-occurrences`);
	}
	else if (appRepeat === 'All occurrences') {
		res.redirect(`../single-appointment-multiple-occurrences`);
	}
  });

  router.post(`/appointment-management/change-answers-group-appointments/multi-occurrence-question`, function (req, res) {
	const appRepeat = req.session.data['which-occurrence'];
	if (appRepeat === 'This occurrence') {
		res.redirect(`../group-appointment-single-occurrence`);
	} else if (appRepeat === 'This and the following occurrences') {
		res.redirect(`../group-appointment-multiple-occurrences`);
	}
	else if (appRepeat === 'All occurrences') {
		res.redirect(`../group-appointment-multiple-occurrences`);
	}
  });

  router.post(`/appointment-management/change-answers-group-appointments/multi-occurrence-question`, function (req, res) {
	const appRepeat = req.session.data['which-occurrence'];
	if (appRepeat === 'This occurrence') {
		res.redirect(`../group-appointment-single-occurrence`);
	} else if (appRepeat === 'This and the following occurrences') {
		res.redirect(`../group-appointment-multiple-occurrences`);
	}
	else if (appRepeat === 'All occurrences') {
		res.redirect(`../group-appointment-multiple-occurrences`);
	}
  });

  router.post(`/appointment-management/change-answers-group-alt/multi-occurrence-question`, function (req, res) {
	const appRepeat = req.session.data['which-occurrence-alt'];
	if (appRepeat === 'This occurrence') {
		res.redirect(`../group-appointment-single-occurrence-alt`);
	} else if (appRepeat === 'This and the following occurrences') {
		res.redirect(`../group-appointment-multiple-occurrences-alt`);
	}
	else if (appRepeat === 'All occurrences') {
		res.redirect(`../group-appointment-multiple-occurrences-alt`);
	}
  });
	  
  

  router.post(`/appointment-management/change-answers-group-appointments/add-more-people`, function (req, res) {
	const peoleRepeat = req.session.data['add-another-person-question'];
	if (peoleRepeat === 'No') {
		res.redirect(`non-associations`);
	} else {
		res.redirect(`upload-or-per-person`);
	}
  });


  router.post(`/appointment-management/change-answers-group-appointments/add-people-route`, function (req, res) {
	const peopleRoute = req.session.data['add-people-method'];
	if (peopleRoute === 'upload-file') {
		res.redirect(`upload-file-info`);
	} else {
		res.redirect(`search-person`);
	}
  });

  router.post(`/appointment-management/change-answers-multiple/multi-occurrence-question`, function (req, res) {
	const appRepeat = req.session.data['which-occurrence'];
	if (appRepeat === 'This occurrence') {
		res.redirect(`../single-appointment-single-occurrence`);
	} else if (appRepeat === 'This and the following occurrences') {
		res.redirect(`../single-appointment-multiple-occurrences`);
	}
	else if (appRepeat === 'All occurrences') {
		res.redirect(`../single-appointment-multiple-occurrences`);
	}
  });


  router.post(`/appointment-management/appointment-creation-method`, function (req, res) {
	const appRepeat = req.session.data['appointment-creation-method'];
	if (appRepeat === 'individual or group') {
		res.redirect(`search-results-default`);
	} else if (appRepeat === 'bulk') {
		res.redirect(`search-results-bulk-default`);
	}
	else {
		res.redirect(`search-results-default`);
	}
  });



  router.post(`/appointment-management/change-answers-group-alt/add-more-people`, function (req, res) {
	const peoleRepeat = req.session.data['add-another-person-question'];
	if (peoleRepeat === 'No') {
		res.redirect(`non-associations`);
	} else {
		res.redirect(`upload-or-per-person`);
	}
  });

module.exports = router