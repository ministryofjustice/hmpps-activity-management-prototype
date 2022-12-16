const express = require('express')
const router = express.Router()
const { DateTime } = require('luxon')

// app data
const prisoners = require('../../../data/prisoners-list-1')

	//redirect the root url to the start page
router.get('/', function(req, res) {
	res.redirect(req.version + '/config')
});

	// CONFIG
router.get('/config', function(req, res) {
	let version = req.version
	req.session.data["config"]["navigation-tiles"][0]["linkURL"] = "/unlock/"+version+"/whereabouts"
	res.render('unlock/' + req.version + '/config', {version})
});
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

function getWings(data) {
	let locations = {};

	if(data.hasOwnProperty('houseblocks')){
		data.houseblocks.forEach(houseblock => {
			locations[houseblock] = []
		})

		if(data.hasOwnProperty('wings')){
			data.wings.forEach(string => {
				const [houseblock, wing] = string.split("-");
				if(locations.hasOwnProperty(houseblock)){
					locations[houseblock].push(wing);
				}
			});
			console.log(data)
		}
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

// cancellation  details
router.get('/activities/:activityId/cancel', function (req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['activities'].find(activity => activity.id.toString() === activityId)

	res.render('unlock/' + req.version + '/choose-cancellation-reason', {activity})
})
router.post('/activities/:activityId/cancel', function (req, res) {
	res.redirect('confirm-cancellation')
})
router.get('/activities/:activityId/confirm-cancellation', function (req, res) {
	res.render('unlock/' + req.version + '/confirm-cancellation')
})
router.post('/activities/:activityId/confirm-cancellation', function (req, res) {
	if(req.session.data['confirm-cancellation'] == 'yes'){
		let activityId = req.params.activityId;
		let activity = req.session.data['activities'].find(activity => activity.id.toString() === activityId);
		if (activity) {
			activity.cancelled = true;
		}
		let filteredPrisoners = req.session.data['prisoners'].filter(prisoner => prisoner.activity == activityId)
		filteredPrisoners.forEach((prisoner) => {
			prisoner.attendance = "not-attended"
		})
	}
	res.redirect('/unlock/' + req.version + '/activities/' + req.params.activityId)
})

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
router.post('/mark-as-attended', function(req, res) {
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
	let locations = getWings(req.session.data['selected-locations'])
	let filteredPrisoners = req.session.data['prisoners'].filter((prisoner) => {
		return filteredActivities.some((activity) => {
			return activity.id === prisoner.activity;
		});
	});

	if( Object.keys(locations).length !== 0 ){
		filteredPrisoners = filteredPrisoners.filter( prisoner => req.session.data['selected-locations']['houseblocks'].includes( prisoner.location.houseblock.toString() ) )
	}

	// remove the confirmation notification on loading the page
	if(req.session.data['attendance-confirmation'] == 'true'){
		delete req.session.data['attendance-confirmation']
	}

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
	let locations = getWings(req.session.data['selected-locations'])
	let filteredPrisoners = req.session.data['prisoners'].filter((prisoner) => {
		return filteredActivities.some((activity) => {
			return activity.id === prisoner.activity;
		});
	});

	if( Object.keys(locations).length !== 0 ){
		filteredPrisoners = filteredPrisoners.filter( prisoner => req.session.data['selected-locations']['houseblocks'].includes( prisoner.location.houseblock.toString() ) )
	}

	// remove the confirmation notification on loading the page
	if(req.session.data['attendance-confirmation'] == 'true'){
		delete req.session.data['attendance-confirmation']
	}

	res.render('unlock/' + req.version + '/unlock-list', { filteredPrisoners, locations })
});

router.get('/unlock-list/download', function(req, res){
	const file = `public/downloads/Unlock list concept.pdf`;
  res.download(file); // Set disposition and send it.
});


	// SELECT-ACTIVITY
router.get('/select-activity', function(req, res) {
	res.render('unlock/' + req.version + '/select-activity')
});
router.post('/select-activity', function(req, res) {
	let chosenDate = req.session.data['chosen-date']
	let today = new Date()

	if(chosenDate == 'other-date'){
		if(req.session.data['other-date-year'] !== undefined && req.session.data['other-date-month'] !== undefined && req.session.data['other-date-day'] !== undefined){
			res.redirect('activities')
		} else {
			res.redirect('select-activity');
		}
	} else {
		res.redirect('activities')
	}
});
// SELECT ACTIVITY RESULTS
router.get('/activities', function(req, res) {
	updateAttendanceList(req, res)

	let period = req.session.data['times'].toUpperCase()
	let filteredActivities = req.session.data['activities'].filter(activity => activity.period == period && activity.count > 0);

	let selectedDate, relativeDate;
	let chosenDate = req.session.data['chosen-date']

	if(chosenDate == 'other-date'){
		chosenDate = req.session.data['other-date-year'] + '-' + req.session.data['other-date-month'] + '-' + req.session.data['other-date-day']
	}

	let today = new Date()	

    function compareDays(date1, date2) {
        // Convert the date strings to Date objects
        const dateObj1 = new Date(date1);
        const dateObj2 = new Date(date2);

        // Get the day of the week for each date (0-6, with 0 being Sunday)
        const day1 = dateObj1.getDay();
        const day2 = dateObj2.getDay();

        // Calculate the difference in days
        const dayDiff = Math.abs(day1 - day2);

        // Check if the difference is greater than 1
        return dayDiff <= 1;
    }
	if (compareDays(chosenDate, today)) {
		relativeDate = DateTime.fromFormat(chosenDate, "yyyy-M-d").toRelativeCalendar();
	}

	res.render('unlock/' + req.version + '/activities', {filteredActivities, relativeDate, selectedDate})
});

module.exports = router