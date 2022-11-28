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
	res.redirect('dps-home')
});

router.post('/reset-config', function(req, res) {
	delete req.session.data['config']
	res.redirect('config')
})

function getFilteredPrisoners(selectedPrisoners, prisonerList) {
	let filteredPrisoners = []

	if( selectedPrisoners ) {
		filteredPrisoners = prisonerList.filter(prisoner => selectedPrisoners.includes(prisoner._id))
	} else {
		filteredPrisoners = prisonerList.slice(0,3)
	}

	return filteredPrisoners
}

function getWings(req, res) {
	let locations = {};
	let data = req.session.data['selected-locations']

	data.houseblocks.forEach(houseblock => {
		locations[houseblock] = []
	})

	if(data.wings.length > 0){
		data.wings.forEach(string => {
			const [houseblock, wing] = string.split("-");
			if(locations.hasOwnProperty(houseblock)){
				locations[houseblock].push(wing);
			}
		});
	}
	return locations
}

function updateAttendanceList(req, res) {
	req.session.data['activities'].forEach(( activity ) => {
		const id = activity.id;
		const scheduledPrisoners = req.session.data['prisoners'].filter((prisoner) => prisoner.activity === id);

		const attendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'attended');
		const notAttendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'not-attended');;

		activity['count'] = scheduledPrisoners.length
		activity['attended-count'] = attendedPrisoners.length
		activity['not-attended-count'] = notAttendedPrisoners.length
	})
}

	// ATTENDANCE LIST
router.post('/activities/:activityId', function(req, res) {
	res.redirect('add-attendance-details')
});

router.get('/activities/:activityId', function(req, res) {
	updateAttendanceList(req, res)

	let activityId = req.params.activityId;
	let activity = req.session.data['activities'].find(activity => activity.id.toString() === activityId)

	// remove the confirmation notification on refreshing the page
	if(req.session.data['attendance-confirmation'] == 'true'){
		delete req.session.data['attendance-confirmation']
	}

	let filteredPrisoners = req.session.data['prisoners'].filter(prisoner => prisoner.activity == activityId)
	let notAttendedCount = filteredPrisoners.filter(prisoner => prisoner.attendance == 'not-attended').length
	let attendedCount = filteredPrisoners.filter(prisoner => prisoner.attendance == 'attended').length

	res.render('unlock/' + req.version + '/activity-list', { activity, filteredPrisoners, notAttendedCount, attendedCount, activityId })
});


// attendance  details
router.get('/activities/:activityId/:prisonerId', function (req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['activities'].find(activity => activity.id.toString() === activityId)

	let prisonerId = req.params.prisonerId;
	let prisoner = req.session.data['prisoners'].find(prisoner => prisoner._id === prisonerId)

	res.render('unlock/' + req.version + '/attendance-details', {prisoner, activity})
})



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

	let activityId = req.session.data['activity-id']

	// set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	let referrer = req.session.data['attendance-url']
	let url = (referrer == 'refusals') ? ('refusals-list') : ('activities/'+activityId)

	res.redirect(url)
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
		let activityId = req.session.data['activity-id']
		res.redirect('activities/'+activityId)
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

	// SELECT REFUSALS LOCATIONS
router.post('/select-refusals-locations', function(req, res) {
	res.redirect('refusals-list')
});

	// REFUSALS LIST
router.get('/refusals-list', function(req, res) {
	let period = req.session.data['times'].toUpperCase()
	let filteredActivities = req.session.data['activities'].filter(activity => activity.period == period);
	let filteredPrisoners = req.session.data['prisoners'];
	let houseblocks = req.session.data['selected-locations']['houseblocks'];
	let locations = {}

	if(req.session.data['selected-locations'] && req.session.data['selected-locations']['houseblocks'] && req.session.data['selected-locations']['houseblocks'].length > 0){
		locations = getWings(req, res)
		filteredPrisoners = filteredPrisoners.filter( prisoner => houseblocks.includes( prisoner.location.houseblock.toString() ) )
	}

	filteredPrisoners = filteredPrisoners.filter((prisoner) => {
		return filteredActivities.some((activity) => {
			return activity.id === prisoner.activity;
		});
	});

	res.render('unlock/' + req.version + '/refusals-list', { filteredPrisoners, locations })
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
	let period = req.session.data['times'].toUpperCase()
	let filteredActivities = req.session.data['activities'].filter(activity => activity.period == period);
	let filteredPrisoners = req.session.data['prisoners'];
	let houseblocks = req.session.data['selected-locations']['houseblocks'];
	let locations = {}

	if(req.session.data['selected-locations'] && req.session.data['selected-locations']['houseblocks'] && req.session.data['selected-locations']['houseblocks'].length > 0){
		locations = getWings(req, res)
		filteredPrisoners = filteredPrisoners.filter( prisoner => houseblocks.includes( prisoner.location.houseblock.toString() ) )
	}

	filteredPrisoners = filteredPrisoners.filter((prisoner) => {
		return filteredActivities.some((activity) => {
			return activity.id === prisoner.activity;
		});
	});

	res.render('unlock/' + req.version + '/unlock-list', { filteredPrisoners, locations })
});

router.get('/unlock-list/download', function(req, res){
	const file = `public/downloads/List concept.pdf`;
  res.download(file); // Set disposition and send it.
});


	// SELECT-ACTIVITY
router.get('/select-activity', function(req, res) {
	res.render('unlock/' + req.version + '/select-activity')
});
router.post('/select-activity', function(req, res) {
	res.redirect('activities')
});
// SELECT ACTIVITY RESULTS
router.get('/activities', function(req, res) {
	updateAttendanceList(req, res)

	let period = req.session.data['times'].toUpperCase()
	let filteredActivities = req.session.data['activities'].filter(activity => activity.period == period && activity.count > 0);

	res.render('unlock/' + req.version + '/activities', {filteredActivities})
});

module.exports = router