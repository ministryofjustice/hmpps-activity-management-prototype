const express = require('express')
const router = express.Router()
const {
	DateTime
} = require('luxon')

// app data
const prisoners = require('../../../data/prisoners-list-1')

//redirect the root url to the start page
router.get('/', function(req, res) {
	res.redirect(req.version + '/config')
});

// CONFIG
router.get('/config', function(req, res) {
	let version = req.version
	req.session.data["config"]["navigation-tiles"][0]["linkURL"] = "/unlock/" + version + "/whereabouts"
	res.render('unlock/' + req.version + '/config', {
		version
	})
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

	if (selectedPrisoners) {
		filteredPrisoners = prisonerList.filter(prisoner => selectedPrisoners.includes(prisoner._id))
	} else {
		filteredPrisoners = prisonerList.slice(0, 3)
	}

	return filteredPrisoners
}

function getWings(data) {
	let locations = {};

	if (data.hasOwnProperty('houseblocks')) {
		data.houseblocks.forEach(houseblock => {
			locations[houseblock] = []
		})

		if (data.hasOwnProperty('wings')) {
			data.wings.forEach(string => {
				const [houseblock, wing] = string.split("-");
				if (locations.hasOwnProperty(houseblock)) {
					locations[houseblock].push(wing);
				}
			});
			console.log(data)
		}
	}

	return locations
}

function updateAttendanceList(req, res) {
	req.session.data['timetable-3'].forEach((activity) => {
		const id = activity.id;
		const scheduledPrisoners = req.session.data['prisoners'].filter((prisoner) => prisoner.activity === id);

		const attendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'attended');
		const notAttendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'not-attended');

		activity['count'] = scheduledPrisoners.length
		activity['attended-count'] = attendedPrisoners.length
		activity['not-attended-count'] = notAttendedPrisoners.length
	})
}

function updateAttendanceAndActivityHistory({attendanceAction, filteredPrisoners, attendanceDetails, activityTimetable, activityId, activityDate}) {
	let timestamp = new Date().toISOString();
	let formattedTimestamp = DateTime.fromISO(timestamp, "yyyy-M-d").setLocale('en-GB').toFormat("h:mma 'on' d MMMM yyyy")

	filteredPrisoners.forEach((prisoner) => {
		let prisonerAttendance = attendanceDetails.find(attendance => attendance._id == prisoner._id);
		let status = attendanceAction == 'not-attended' ? 'not-attended' : 'attended';
		let payment = attendanceAction == 'not-attended' ? prisonerAttendance['absence-payment'] : prisonerAttendance.bonus;
		prisonerAttendance.status = status

		prisoner.attendance = [{
			activityId: activityId,
			date: activityDate,
			attendance: prisonerAttendance,
			payment,
			timestamp,
			formattedTimestamp
		}];

		let activity = activityTimetable.find(activity => activity.id == activityId);

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

		let prisonerAttendanceHistory = attendanceHistory['attendance-data'].find(attendance => attendance.prisonerId == prisoner._id);

		if (!prisonerAttendanceHistory) {
			prisonerAttendanceHistory = {
				prisonerId: prisoner._id,
				timestamp,
				formattedTimestamp,
				activityDate
			};
			attendanceHistory['attendance-data'].push(prisonerAttendanceHistory);
		}

		prisonerAttendanceHistory.status = prisoner.attendance[0].attendance.status;
	});
}

function getActivitiesForPeriod(activities, period, dayOfWeek) {
	return activities.filter(activity => {
		let activityDayMatches = activity.timesAndDays.some(timeAndDay => timeAndDay.day === dayOfWeek);
		let activityPeriodMatches = activity.period === period;
		return activityDayMatches && activityPeriodMatches;
	});
}

function getPrisonersForActivities(prisoners, activities) {
	return prisoners.filter(prisoner => {
		return activities.some(activity => {
			return activity.id === prisoner.activity;
		});
	});
}

function filterPrisonersByLocation(prisoners, locations) {
	if (Object.keys(locations).length === 0) {
		return prisoners;
	}
	return prisoners.filter(prisoner => locations['houseblocks'].includes(prisoner.location.houseblock.toString()));
}



// ATTENDANCE LIST
router.post('/activities/:activityId', function(req, res) {
	res.redirect('add-attendance-details')
});

router.get('/activities/:activityId', function(req, res) {
	updateAttendanceList(req, res)

	let activityId = req.params.activityId;
	let date = req.session.data['date']

    // remove the confirmation notification on refreshing the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}

	let filteredPrisoners = req.session.data['prisoners'].filter(prisoner => prisoner.activity == activityId)
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

	function getAttendanceHistory(activity, date) {
    	if (!activity['attendance-history']) {
    		return null;
    	}
    	let attendanceHistory = null;
    	activity['attendance-history'].forEach(history => {
    		if (history.date === date) {
    			attendanceHistory = history;
    		}
    	});
    	return attendanceHistory;
    }
    let attendanceHistory = getAttendanceHistory(activity, date);
	
	function countAttendanceStatus(activity, status, date) {
		if (!activity['attendance-history']) {
			return 0;
		}
		let attendanceCount = 0;
		activity['attendance-history'].forEach(history => {
			if (history.date === date) {
				history['attendance-data'].forEach(data => {
					if (data.status === status) {
						attendanceCount++;
					}
				});
			}
		});
		return attendanceCount;
	}
	let notAttendedCount = countAttendanceStatus(activity, "not-attended", date);
	let attendedCount = countAttendanceStatus(activity, "attended", date);

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
    	attendanceHistory,
    	activityId,
    	nextSessionDate,
    	previousSessionDate
    })
});

// cancellation  details
router.get('/activities/:activityId/cancel', function(req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

	res.render('unlock/' + req.version + '/choose-cancellation-reason', {
		activity
	})
})
router.post('/activities/:activityId/cancel', function(req, res) {
	res.redirect('confirm-cancellation')
})
router.get('/activities/:activityId/confirm-cancellation', function(req, res) {
	res.render('unlock/' + req.version + '/confirm-cancellation')
})
router.post('/activities/:activityId/confirm-cancellation', function(req, res) {
	if (req.session.data['confirm-cancellation'] == 'yes') {
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

	res.render('unlock/' + req.version + '/add-attendance-details', {
		filteredPrisoners
	})
});

router.post('/activities/:activityId/add-attendance-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])
	let activityId = req.session.data['activity-id'];
	let date = req.session.data['date']
	let attendanceAction = req.session.data['attendance-action'];
	let activityTimetable = req.session.data['timetable-3'];
	let attendanceDetails = req.session.data['attendance-details'];  

	updateAttendanceAndActivityHistory({attendanceAction, filteredPrisoners, attendanceDetails, activityTimetable, activityId, activityDate: date});

    // set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	let referrer = req.session.data['attendance-url']
	let url = (referrer == 'refusals') ? ('refusals-list') : ('../' + activityId + '?date=' + date)

	res.redirect(url)
});

// refusals
router.get('/add-refusal-details', function(req, res) {
	delete req.session.data['attendance-details']
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	res.render('unlock/' + req.version + '/add-attendance-details', { filteredPrisoners })
});
router.post('/add-refusal-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])
	let activityId = req.session.data['activity-id'];
	let date = req.session.data['date']
	let attendanceAction = req.session.data['attendance-action'];
	let activityTimetable = req.session.data['timetable-3'];
	let attendanceDetails = req.session.data['attendance-details'];

	updateAttendanceAndActivityHistory({attendanceAction, filteredPrisoners, attendanceDetails, activityTimetable, activityId, activityDate: date});

    // set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	res.redirect('refusals-list?date=' + date)
});



// check variable pay
router.get('/activities/:activityId/check-variable-pay', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	res.render('unlock/' + req.version + '/check-variable-pay', {
		filteredPrisoners
	})
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

		let activityId = req.session.data['activity-id'];
		let date = req.session.data['date'];
		let attendanceAction = req.session.data['attendance-action'];
		let activityTimetable = req.session.data['timetable-3'];
		let attendanceDetails = req.session.data['attendance-details'];

		updateAttendanceAndActivityHistory({attendanceAction, filteredPrisoners, attendanceDetails, activityTimetable, activityId, activityDate: date});

		req.session.data['attendance-confirmation'] = 'true'
		res.redirect('../' + activityId + '?date=' + req.session.data['date'])
	}
});

// attendance  details
router.get('/activities/:activityId/:prisonerId', function(req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

	let prisonerId = req.params.prisonerId;
	let prisoner = req.session.data['prisoners'].find(prisoner => prisoner._id === prisonerId)

	function getAttendanceData(activity, prisonerId) {
		if (!activity || !activity['attendance-history'] || !activity['attendance-history'].length) {
			return null;
		}

		for (let i = 0; i < activity['attendance-history'].length; i++) {
			const attendanceData = activity['attendance-history'][i]['attendance-data'];
			for (let j = 0; j < attendanceData.length; j++) {
				if (attendanceData[j].prisonerId === prisonerId) {
					return attendanceData[j];
				}
			}
		}
		return null;
	}

	const attendanceData = getAttendanceData(activity, prisonerId);

	res.render('unlock/' + req.version + '/attendance-details', {
		prisoner,
		activity,
		attendanceData
	})
})

// CHECK ATTENDANCE DETAILS
router.get('/check-attendance-details', function(req, res) {
	let attendanceDetails = req.session.data['attendance-details']
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])

	res.render('unlock/' + req.version + '/check-attendance-details', {
		attendanceDetails
	})
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
	let period = req.session.data['times'].toUpperCase();
	let chosenDate = req.session.data['chosen-date'];
	let date = new Date(chosenDate);
	let dayOfWeek = date.getDay();

	let activities = req.session.data['timetable-3'];
	let prisoners = req.session.data['prisoners'];
	let locations = getWings(req.session.data['selected-locations']);

	let filteredActivities = getActivitiesForPeriod(activities, period, dayOfWeek);
	let filteredPrisoners = getPrisonersForActivities(prisoners, filteredActivities);
	filteredPrisoners = filterPrisonersByLocation(filteredPrisoners, req.session.data['selected-locations']);

    // remove the confirmation notification on loading the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}

	res.render('unlock/' + req.version + '/refusals-list', {
		filteredPrisoners,
		locations
	})
});
router.post('/refusals-list', function(req, res) {
	if (req.session.data['selected-prisoners'].length > 1) {
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
	let period = req.session.data['times'].toUpperCase();
	let chosenDate = req.session.data['chosen-date'];
	let date = new Date(chosenDate);
	let dayOfWeek = date.getDay();

	let activities = req.session.data['timetable-3'];
	let prisoners = req.session.data['prisoners'];
	let locations = getWings(req.session.data['selected-locations']);

	let filteredActivities = getActivitiesForPeriod(activities, period, dayOfWeek);
	let filteredPrisoners = getPrisonersForActivities(prisoners, filteredActivities);
	filteredPrisoners = filterPrisonersByLocation(filteredPrisoners, req.session.data['selected-locations']);

    // remove the confirmation notification on loading the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}

	res.render('unlock/' + req.version + '/unlock-list', {
		filteredPrisoners,
		locations
	})
});

router.get('/unlock-list/download', function(req, res) {
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

	if (chosenDate == 'other-date') {
		if (req.session.data['other-date-year'] !== undefined && req.session.data['other-date-month'] !== undefined && req.session.data['other-date-day'] !== undefined) {
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
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners'])
	let chosenDate = req.session.data['chosen-date']

	let period = req.session.data['times'].toUpperCase()
	let date = new Date(chosenDate)
    let dayOfWeek = date.getDay(); // Get the day of the week (0-6, with 0 being Sunday)

    let filteredActivities = { morning: [], afternoon: [] };
    req.session.data['timetable-3'].forEach(activity => {
    	if (activity.timesAndDays.some(timeAndDay => timeAndDay.day === dayOfWeek)) {
    		if (activity.period === 'AM') filteredActivities.morning.push(activity);
    		else if (activity.period === 'PM') filteredActivities.afternoon.push(activity);
    	}
    });

    let selectedDate, relativeDate;

    if (chosenDate == 'other-date') {
    	chosenDate = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
    }

    let today = new Date();
    let dateObj2 = new Date(today);
    let timeDiff = Math.abs(date.getTime() - dateObj2.getTime());
    let hourDiff = timeDiff / (1000 * 60 * 60);
    if (hourDiff <= 48) {
    	relativeDate = DateTime.fromFormat(chosenDate, "yyyy-M-d").toRelativeCalendar();
    }

    let activitiesCount = filteredActivities.morning.length + filteredActivities.afternoon.length

    res.render('unlock/' + req.version + '/activities', {
    	filteredActivities,
    	relativeDate,
    	selectedDate,
    	activitiesCount
    })
});

module.exports = router