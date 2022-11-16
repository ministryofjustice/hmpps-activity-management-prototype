const express = require('express')
const router = express.Router()

// app data
const prisoners = require('../../../data/prisoners-list-1')

	//redirect the root url to the start page
router.get('/', function(req, res) {
	res.redirect(req.version + '/whereabouts')
});

	// CONFIG
router.post('/config', function(req, res) {
	res.redirect('whereabouts')
});

function getFilteredPrisoners(selectedPrisoners, prisonerList) {
	let filteredPrisoners = []

	if( selectedPrisoners ) {
		filteredPrisoners = prisonerList.filter(prisoner => selectedPrisoners.includes(prisoner._id))
	} else {
		filteredPrisoners = prisonerList.slice(0,3)
	}

	return filteredPrisoners
}

	// ATTENDANCE LIST
// router.get('/attendance-list', function(req, res) {
// 	// remove the confirmation notification on refreshing the page
// 	if(req.session.data['attendance-confirmation'] == 'true'){
// 		delete req.session.data['attendance-confirmation']
// 	}

// 	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

// 	let notAttendedCount = req.session.data['prisoners'].filter(prisoner => prisoner.attendance == 'not-attended').length
// 	let attendedCount = req.session.data['prisoners'].filter(prisoner => prisoner.attendance == 'attended').length

// 	res.render('unlock/' + req.version + '/attendance-list', { filteredPrisoners, notAttendedCount, attendedCount })
// });
router.post('/attendance-list', function(req, res) {
	res.redirect('add-attendance-details')
});

router.get('/attendance-list/:activityId', function(req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['activities'].find(activity => activity.id.toString() === activityId)

	// remove the confirmation notification on refreshing the page
	if(req.session.data['attendance-confirmation'] == 'true'){
		delete req.session.data['attendance-confirmation']
	}

	let filteredPrisoners = req.session.data['prisoners']

	let notAttendedCount = req.session.data['prisoners'].filter(prisoner => prisoner.attendance == 'not-attended').length
	let attendedCount = req.session.data['prisoners'].filter(prisoner => prisoner.attendance == 'attended').length

	res.render('unlock/' + req.version + '/attendance-list', { activity, filteredPrisoners, notAttendedCount, attendedCount })
});



	// ATTENDANCE DETAILS
router.get('/add-attendance-details', function(req, res) {
	delete req.session.data['attendance-details']
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	res.render('unlock/' + req.version + '/add-attendance-details', { filteredPrisoners })
});
router.post('/add-attendance-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	// set prisoner attendance
	req.session.data['attendance-details'].forEach(( attendance ) => {
		const prisoner = req.session.data['prisoners'].find(prisoner => prisoner._id == attendance._id);

		if(req.session.data['attendance-action'] == 'not-attended'){
			let absencePayment = attendance['absence-payment']

			prisoner['attendance'] = "not-attended"
			prisoner['absence-payment'] = absencePayment
		} else {
			let bonus = attendance['bonus']
			
			prisoner['attendance'] = "attended"
			prisoner['bonus'] = bonus
		}
	})

	// set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'
	res.redirect('attendance-list')
});


// check variable pay
router.get('/check-variable-pay', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	res.render('unlock/' + req.version + '/check-variable-pay', { filteredPrisoners })
});
router.post('/check-variable-pay', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	if(req.session.data['standard-pay-all'] == 'no'){
		res.redirect('add-attendance-details')
	} else {
		// set prisoner attendance
		filteredPrisoners.forEach((prisoner, index) => {
			prisoner.attendance = "attended"
		})

		req.session.data['attendance-confirmation'] = 'true'

		res.redirect('attendance-list')
	}
});

	// CHECK ATTENDANCE DETAILS
router.get('/check-attendance-details', function(req, res) {
	let attendanceDetails = req.session.data['attendance-details']
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])		

	res.render('unlock/' + req.version + '/check-attendance-details', { attendanceDetails })
});
router.post('/check-attendance-details', function(req, res) {
	res.redirect('attendance-confirmation')
});


// attendance  details
router.get('/attendance-details/:prisonerId', function (req, res) {
	let prisonerId = req.params.prisonerId;
	let prisoner = req.session.data['prisoners'].find(prisoner => prisoner._id === prisonerId)

	res.render('unlock/' + req.version + '/attendance-details', {prisoner})
})

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

// unlock list
router.get('/unlock-list', function(req, res) {
	res.render('unlock/' + req.version + '/unlock-list')
});

router.get('/unlock-list/download', function(req, res){
  const file = `public/downloads/List concept.pdf`;
  res.download(file); // Set disposition and send it.
});

	// SELECT REFUSALS LOCATIONS
router.post('/select-refusals-locations', function(req, res) {
	res.redirect('refusals-list')
});

	// SELECT-ACTIVITY
router.get('/select-activity', function(req, res) {
	res.render('unlock/' + req.version + '/select-activity')
});
router.post('/select-activity', function(req, res) {
	res.redirect('select-activity-results')
});

	// SELECT-ACTIVITY-2
router.post('/select-activity-2', function(req, res) {		
	res.redirect('select-activity-2__results')
});

module.exports = router