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
	req.session.data['timetable-3'].forEach(( activity ) => {
		const id = activity.id;
		const scheduledPrisoners = req.session.data['prisoners'].filter((prisoner) => prisoner.activity === id);

		const attendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'attended');
		const notAttendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'not-attended');

		activity['count'] = scheduledPrisoners.length
		activity['attended-count'] = attendedPrisoners.length
		activity['not-attended-count'] = notAttendedPrisoners.length
	})
}

function updateAttendanceHistory(activities, date) {
	activities.forEach(activity => {
		if (activity['attendance-history'].length === 0) {
			activity['attendance-history'].push({
				date: date,
				attendance: []
			});
		}
	});
}

function updateAttendance(req, filteredPrisoners) {
	const attendanceAction = req.session.data['attendance-action'];
	const activityTimetable = req.session.data['timetable-3'];
	const activityId = req.session.data['activity-id'];
	const activityDate = req.session.data['date'];

	filteredPrisoners.forEach((prisoner) => {
		const prisonerAttendance = req.session.data['attendance-details'].find(attendance => attendance._id == prisoner._id);
		const status = attendanceAction == 'not-attended' ? 'not-attended' : 'attended';
		const payment = attendanceAction == 'not-attended' ? prisonerAttendance['absence-payment'] : prisonerAttendance.bonus;

		prisoner.attendance = [{
			activityId: activityId,
			date: activityDate,
			attendance: status,
			payment,
		}];
	});

	updateActivityAttendanceHistory(activityTimetable, activityId, activityDate, filteredPrisoners);
}

function updateActivityAttendanceHistory(activityTimetable, activityId, activityDate, prisoners) {
	const activity = activityTimetable.find(activity => activity.id == activityId);

	if (!activity['attendance-history']) {
		activity['attendance-history'] = [];
	}

	let attendanceHistory = activity['attendance-history'].find(history => history.date == activityDate);

	if (!attendanceHistory) {
		attendanceHistory = {
			date: activityDate,
			'attendance-data': [],
		};
		activity['attendance-history'].push(attendanceHistory);
	}

	prisoners.forEach((prisoner) => {
		let prisonerAttendance = attendanceHistory['attendance-data'].find(attendance => attendance.prisonerId == prisoner._id);

		if (!prisonerAttendance) {
			prisonerAttendance = {
				prisonerId: prisoner._id,
			};
			attendanceHistory['attendance-data'].push(prisonerAttendance);
		}

		prisonerAttendance.status = prisoner.attendance[0].attendance;
	});
}

	// ATTENDANCE LIST
router.post('/activities/:activityId', function(req, res) {
	res.redirect('add-attendance-details')
});

router.get('/activities/:activityId', function(req, res) {
	updateAttendanceList(req, res)

	let activityId = req.params.activityId;
	let date = req.session.data['date']
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

	// remove the confirmation notification on refreshing the page
	if(req.session.data['attendance-confirmation'] == 'true'){
		delete req.session.data['attendance-confirmation']
	}

	let filteredPrisoners = req.session.data['prisoners'].filter(prisoner => prisoner.activity == activityId)

	function countPrisonerAttendance(date, attendanceHistory, status) {
		let numNotAttended = 0;
		let attendanceHistoryData;
		if(attendanceHistory){
			attendanceHistoryData = attendanceHistory.filter(record => record.date === date)

			for (const item of attendanceHistoryData) {
				if (item.status === status) {
					numNotAttended++;
				}
			}
		}

		return numNotAttended;
	}

	let notAttendedCount = countPrisonerAttendance(date, activity['attendance-history'], 'not-attended');
	let attendedCount = 0;

	function getSessionDate(date, activity, direction) {
		const currentDay = new Date(date).getDay();

		let sessionDay;
		if (direction === 'next') {
			for (const timeAndDay of activity.timesAndDays) {
				if (timeAndDay.day > currentDay) {
					sessionDay = timeAndDay.day;
					break;
				}
			}
		} else if (direction === 'previous') {
			for (let i = activity.timesAndDays.length - 1; i >= 0; i--) {
				if (activity.timesAndDays[i].day < currentDay) {
					sessionDay = activity.timesAndDays[i].day;
					break;
				}
			}
		}

        // If no next/previous session day was found, it means the next/previous session is in the following/previous week
		if (!sessionDay) {
			if (direction === 'next') {
				sessionDay = activity.timesAndDays[0].day;
			} else if (direction === 'previous') {
				sessionDay = activity.timesAndDays[activity.timesAndDays.length - 1].day;
			}
		}

        // Check if the next/previous session day is in the same week as the current day
		const sessionDate = new Date(date);
		if (direction === 'next') {
			if (sessionDay < currentDay) {
				sessionDate.setDate(sessionDate.getDate() + (7 - currentDay + sessionDay));
			} else {
				sessionDate.setDate(sessionDate.getDate() + (sessionDay - currentDay));
			}
		} else if (direction === 'previous') {
			if (sessionDay > currentDay) {
				sessionDate.setDate(sessionDate.getDate() - (currentDay + (7 - sessionDay)));
			} else {
				sessionDate.setDate(sessionDate.getDate() - (currentDay - sessionDay));
			}
		}

		return formatDate(sessionDate);
	}

	function formatDate(date) {
		const year = date.getFullYear();
        const month = date.getMonth() + 1; // months are 0-based
        const day = date.getDate();
        return `${year}-${month}-${day}`;
    }

    let nextSessionDate = getSessionDate(date, activity, 'next');
    let previousSessionDate = getSessionDate(date, activity, 'previous');

    res.render('unlock/' + req.version + '/activity-list', {
    	activity,
    	filteredPrisoners,
    	notAttendedCount,
    	attendedCount,
    	activityId,
    	nextSessionDate,
    	previousSessionDate
    })
});

// cancellation  details
router.get('/activities/:activityId/cancel', function (req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

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
		let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId);
		if (activity) {
			activity.cancelled = true;
		}
		let filteredPrisoners = req.session.data['prisoners'].filter(prisoner => prisoner.activity == activityId)

		// set prisoner attendance
		filteredPrisoners.forEach((prisoner, index) => {
			prisoner.attendance = [];
			prisoner.attendance.push({
				activityId: req.session.data['activity-id'],
				date: req.session.data['date'],
				attendance: "not-attended"
			});
		})
	}
	res.redirect('/unlock/' + req.version + '/activities/' + req.params.activityId + '?date=' + req.session.data['date'])
})

	// ATTENDANCE DETAILS
router.get('/activities/:activityId/add-attendance-details', function(req, res) {
	delete req.session.data['attendance-details']
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	res.render('unlock/' + req.version + '/add-attendance-details', { filteredPrisoners })
});

router.post('/activities/:activityId/add-attendance-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])
	let activityId = req.session.data['activity-id'];
	let date = req.session.data['date']

	updateAttendance(req, filteredPrisoners)

	// set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	let referrer = req.session.data['attendance-url']
	let url = (referrer == 'refusals') ? ('refusals-list') : ('../'+activityId+'?date='+date)

	res.redirect(url)
});


// check variable pay
router.get('/activities/:activityId/check-variable-pay', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	res.render('unlock/' + req.version + '/check-variable-pay', { filteredPrisoners })
});
router.post('/activities/:activityId/check-variable-pay', function(req, res) {
	let selectedPrisoners = req.session.data['selected-prisoners']
	let filteredPrisoners = getFilteredPrisoners(selectedPrisoners, req.session.data['prisoners'])

	if (req.session.data['standard-pay-all'] == 'no') {
		res.redirect('add-attendance-details')
	} else {
		req.session.data['attendance-details'] = [];
		selectedPrisoners.forEach(prisonerID => {
			req.session.data['attendance-details'].push({
				"_id": prisonerID,
				"pay": ["standard", {
					"pay-detail": []
				}]
			});
		});

		updateAttendance(req, filteredPrisoners)

		req.session.data['attendance-confirmation'] = 'true'
		let activityId = req.session.data['activity-id']
		res.redirect('../'+activityId+'?date='+req.session.data['date'])
	}
});

// attendance  details
router.get('/activities/:activityId/:prisonerId', function (req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

	let prisonerId = req.params.prisonerId;
	let prisoner = req.session.data['prisoners'].find(prisoner => prisoner._id === prisonerId)

	res.render('unlock/' + req.version + '/attendance-details', {prisoner, activity})
})

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
	let chosenDate = req.session.data['chosen-date']
	let date = new Date(chosenDate); // Replace with the actual date
	let dayOfWeek = date.getDay(); // Replace with the actual day of the week

	let filteredActivities = req.session.data['timetable-3'].filter(activity => {
        // Check if the activity occurs on the current day of the week
		let activityDayMatches = activity.timesAndDays.some(timeAndDay => timeAndDay.day === dayOfWeek);
         // Check if the activity occurs in the given period
		let activityPeriodMatches = activity.period === period;
		return activityDayMatches && activityPeriodMatches;
	});


	let filteredPrisoners = req.session.data['prisoners'].filter((prisoner) => {
		return filteredActivities.some((activity) => {
			return activity.id === prisoner.activity;
		});
	});

	let locations = getWings(req.session.data['selected-locations'])
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
	let chosenDate = req.session.data['chosen-date']
	let date = new Date(chosenDate); // Replace with the actual date
	let dayOfWeek = date.getDay(); // Replace with the actual day of the week

	let filteredActivities = req.session.data['timetable-3'].filter(activity => {
        // Check if the activity occurs on the current day of the week
		let activityDayMatches = activity.timesAndDays.some(timeAndDay => timeAndDay.day === dayOfWeek);
         // Check if the activity occurs in the given period
		let activityPeriodMatches = activity.period === period;
		return activityDayMatches && activityPeriodMatches;
	});


	let filteredPrisoners = req.session.data['prisoners'].filter((prisoner) => {
		return filteredActivities.some((activity) => {
			return activity.id === prisoner.activity;
		});
	});

	let locations = getWings(req.session.data['selected-locations'])
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

	let chosenDate = req.session.data['chosen-date']
	let period = req.session.data['times'].toUpperCase()
	let date = new Date(chosenDate)
	let dayOfWeek = date.getDay(); // Get the day of the week (0-6, with 0 being Sunday)

	// updateAttendanceHistory(req.session.data['timetable-3'], chosenDate);

	let filteredActivities = {
		morning: [],
		afternoon: []
	};
	req.session.data['timetable-3'].filter(activity => {
        // Check if the activity occurs on the current day of the week
		let activityDayMatches = activity.timesAndDays.some(timeAndDay => timeAndDay.day === dayOfWeek);
		if (activityDayMatches) {
            // Check if the activity occurs in the desired time period
			if (activity.period === 'AM') {
				filteredActivities.morning.push(activity);
			} else if (activity.period === 'PM') {
				filteredActivities.afternoon.push(activity);
			}
		}
	});

	let selectedDate, relativeDate;

	if(chosenDate == 'other-date'){
		chosenDate = req.session.data['other-date-year'] + '-' + req.session.data['other-date-month'] + '-' + req.session.data['other-date-day']
	}

	let today = new Date()	

	function compareDays(date1, date2) {
        // Convert the date strings to Date objects
		let dateObj1 = new Date(date1);
		let dateObj2 = new Date(date2);

        // Get the day of the week for each date (0-6, with 0 being Sunday)
		let day1 = dateObj1.getDay();
		let day2 = dateObj2.getDay();

        // Calculate the difference in days
		let dayDiff = Math.abs(day1 - day2);

         // Calculate the difference in milliseconds between the two dates
		let timeDiff = Math.abs(dateObj1.getTime() - dateObj2.getTime());

  		// Convert the difference in milliseconds to hours
		let hourDiff = timeDiff / (1000 * 60 * 60);

        // Check if the difference is greater than 1
		return hourDiff <= 48 && dayDiff <= 1;
	}
	if (compareDays(chosenDate, today)) {
		relativeDate = DateTime.fromFormat(chosenDate, "yyyy-M-d").toRelativeCalendar();
	}

	let activitiesCount = filteredActivities.morning.length + filteredActivities.afternoon.length

	res.render('unlock/' + req.version + '/activities', {filteredActivities, relativeDate, selectedDate, activitiesCount})
});

module.exports = router