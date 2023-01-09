const express = require('express')
const router = express.Router()
const {
	DateTime
} = require('luxon')

// app data
const prisoners = require('../../../data/prisoners-list-3')

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
		if (sessionDay === currentDay) {
			sessionDate.setDate(sessionDate.getDate() + 7)
		} else if (sessionDay < currentDay) {
			sessionDate.setDate(sessionDate.getDate() + (7 - currentDay + sessionDay));
		} else {
			sessionDate.setDate(sessionDate.getDate() + (sessionDay - currentDay));
		}
	} else if (direction === 'previous') {
		if (sessionDay === currentDay) {
			sessionDate.setDate(sessionDate.getDate() - 7);
		} else if (sessionDay > currentDay) {
			sessionDate.setDate(sessionDate.getDate() - (currentDay + (7 - sessionDay)));
		} else {
			sessionDate.setDate(sessionDate.getDate() - (currentDay - sessionDay));
		}
	}

	return formatDate(sessionDate);
}

function formatDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

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
		locations[data.houseblocks] = []

		if (data.hasOwnProperty('wings')) {
			data.wings.forEach(string => {
				const [houseblock, wing] = string.split("-");
				if (locations.hasOwnProperty(houseblock)) {
					locations[houseblock].push(wing);
				}
			});
		}
	}

	return locations
}

function updateAttendanceListFigures(req, res) {
	req.session.data['timetable-3'].forEach((activity) => {
		const id = activity.id;
		const scheduledPrisoners = req.session.data['prisoners-3'].filter((prisoner) => prisoner.activity === id);

		const attendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'attended');
		const notAttendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'not-attended');

		activity['count'] = scheduledPrisoners.length
		activity['attended-count'] = attendedPrisoners.length
		activity['not-attended-count'] = notAttendedPrisoners.length
	})
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
		if (Array.isArray(prisoner.activity)) {
			return prisoner.activity.some(activityId => {
				return activities.some(activity => {
					return activity.id === activityId;
				});
			});
		} else {
			return activities.some(activity => {
				return activity.id === prisoner.activity;
			});
		}
	});
}

function filterPrisonersByLocation(prisoners, locations) {
	if (Object.keys(locations).length === 0) {
		return prisoners;
	}
	return prisoners.filter(prisoner => locations['houseblocks'].includes(prisoner.location.houseblock.toString()));
}

function updateAttendanceData(req, activityID, activityDate, data) {
    // create attendance-data object if it doesn't exist
	if (!req.session.data['attendance-data']) {
		req.session.data['attendance-data'] = {};
	}

    // create nested objects for activityID and activityDate if they don't exist
	if (!req.session.data['attendance-data'][activityID]) {
		req.session.data['attendance-data'][activityID] = {};
	}
	if (!req.session.data['attendance-data'][activityID][activityDate]) {
		req.session.data['attendance-data'][activityID][activityDate] = {};
	}

    // add attendance data for each prisoner
	for (let i = 0; i < data.length; i++) {
		let prisonerID = data[i]['_id'];
		req.session.data['attendance-data'][activityID][activityDate][prisonerID] = data[i];
	}
}

function getAttendanceData(date, activityId, attendanceData, filteredPrisoners) {
	let updatedFilteredPrisoners = [];
	if (attendanceData && attendanceData[activityId] && attendanceData[activityId][date]) {
		for (let i = 0; i < filteredPrisoners.length; i++) {
			let prisoner = filteredPrisoners[i];
			let activityIds = prisoner.activity.map(activityId => activityId.toString());
			if (activityIds.includes(activityId.toString())) {
				let prisonerAttendanceData = attendanceData[activityId][date][prisoner._id];
				if (prisonerAttendanceData) {
					prisoner.attendance = {
						status: prisonerAttendanceData.status,
						pay: prisonerAttendanceData.pay,
						warningDetail: prisonerAttendanceData['incentive-level-warning-detail'],
						date
					}
					updatedFilteredPrisoners.push(prisoner);
				} else {
                    // Remove attendance data for this prisoner if the dates are not equal
					if (prisoner.attendance && prisoner.attendance.date !== date) {
						prisoner.attendance = null;
					}
					updatedFilteredPrisoners.push(prisoner);
				}
			} else {
                // Remove attendance data for this prisoner if the activity IDs are not equal
				if (prisoner.attendance && prisoner.attendance.activityId !== activityId) {
					prisoner.attendance = null;
				}
				updatedFilteredPrisoners.push(prisoner);
			}
		}
		return updatedFilteredPrisoners;
	} else {
        // Remove attendance data for all prisoners if attendance data is not available for the specified activity ID and date
		for (let i = 0; i < filteredPrisoners.length; i++) {
			let prisoner = filteredPrisoners[i];
			prisoner.attendance = null;
			updatedFilteredPrisoners.push(prisoner);
		}
		return updatedFilteredPrisoners;
	}
}

function countAttendance(data, activityId, date, status) {
	// Return 0 if data is undefined or null
	if (!data) {
		return 0;
	}

  // Check if the activityId and date exist in the data
	if (!data[activityId] || !data[activityId][date]) {
		return 0;
	}

  // Initialise a counter for the number of prisoners with the status "attended"
	let attendedCount = 0;

  // Iterate through the prisoners in the class on the given date
	for (const studentId in data[activityId][date]) {
    // Check if the prisoner's status is "attended"
		if (data[activityId][date][studentId]["status"] === status) {
      // If the prisoner's status is "attended", increment the attendedCount
			attendedCount++;
		}
	}

  // Return the attendedCount
	return attendedCount;
}

function addAttendanceCounts(prisoners, filteredActivities, attendanceData, date) {
	const scheduledKey = 'scheduled';
	const notRecordedKey = 'not-recorded';
	const attendedKey = 'attended';
	const notAttendedKey = 'not-attended';
	for (let activity of filteredActivities.morning.concat(filteredActivities.afternoon)) {
		let attendanceCount = {
			[scheduledKey]: 0,
			[notRecordedKey]: 0,
			[attendedKey]: 0,
			[notAttendedKey]: 0
		};
		let prisonerList = prisoners.filter(prisoner => prisoner.activity.includes(activity.id));
		for (let i = 0; i < prisonerList.length; i++) {
			let prisoner = prisonerList[i];
			if (prisoner.activity.includes(activity.id)) {
				attendanceCount[scheduledKey]++;
				attendanceCount[notRecordedKey]++;
			}
		}
		if (attendanceData && attendanceData[activity.id.toString()] && attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)]) {
			console.log(attendanceData)
			for (let participant in attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)]) {
				if (attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)][participant].status === "attended") {
					attendanceCount[attendedKey]++;
					attendanceCount[notRecordedKey]--;
				} else {
					attendanceCount[notAttendedKey]++;
					attendanceCount[notRecordedKey]--;
				}
			}
		}
		activity.attendanceCount = attendanceCount;
	}
}


// ATTENDANCE LIST
router.post('/activities/:activityId', function(req, res) {
	res.redirect('add-attendance-details')
});

router.get('/activities/:activityId', function(req, res) {
	// updateAttendanceListFigures(req, res)

	let activityId = req.params.activityId;
	let date = req.session.data['date']
	let dateObject = new Date(date);
	let dayOfWeek = dateObject.getDay();

    // remove the confirmation notification on refreshing the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}

	let prisonerList = req.session.data['prisoners-3'].filter(prisoner => {
		if (Array.isArray(prisoner.activity)) {
			return prisoner.activity.map(a => a.toString()).includes(activityId.toString());
		} else {
			return prisoner.activity == activityId.toString();
		}
	})
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

	let activities = req.session.data['timetable-3'];
	let filteredActivities = getActivitiesForPeriod(activities, req.session.data['period'], dayOfWeek);
	let filteredPrisoners = getAttendanceData(date, activityId, req.session.data['attendance-data'], prisonerList);

	for (const prisoner of filteredPrisoners) {
		prisoner.activityInfo = [];

		for (const activityId of prisoner.activity) {
			const activityInfo = filteredActivities.find(activity => activity.id === activityId);

			if (activityInfo) {
				prisoner.activityInfo.push(activityInfo);
			}
		}
	}

	let notAttendedCount = countAttendance(req.session.data['attendance-data'], activityId, date, "not-attended");
	let attendedCount = countAttendance(req.session.data['attendance-data'], activityId, date, "attended");

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
		let filteredPrisoners = req.session.data['prisoners-3'].filter(prisoner => prisoner.activity == activityId)

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
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners-3'])

	res.render('unlock/' + req.version + '/add-attendance-details', {
		filteredPrisoners
	})
});

router.post('/activities/:activityId/add-attendance-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners-3'])
	let activityId = req.session.data['activity-id'];
	let date = req.session.data['date']
	let attendanceAction = req.session.data['attendance-action'];
	let attendanceDetails = req.session.data['attendance-details'];

	attendanceDetails.forEach(detail => {
		detail.status = attendanceAction;
	});

	updateAttendanceData(req, activityId, date, attendanceDetails)
	
    // set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	let referrer = req.session.data['attendance-url']
	let url = (referrer == 'refusals') ? ('refusals-list') : ('../' + activityId + '?date=' + date)

	res.redirect(url)
});

// refusals
router.get('/add-refusal-details', function(req, res) {
	delete req.session.data['attendance-details']
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners-3'])

	res.render('unlock/' + req.version + '/add-attendance-details', { filteredPrisoners })
});
router.post('/add-refusal-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners-3'])
	let activityId = req.session.data['activity-id'];
	let date = req.session.data['date']
	let attendanceAction = req.session.data['attendance-action'];
	let activityTimetable = req.session.data['timetable-3'];
	let attendanceDetails = req.session.data['attendance-details'];

    // set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	res.redirect('refusals-list?date=' + date)
});



// check variable pay
router.get('/activities/:activityId/check-variable-pay', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners-3'])

	res.render('unlock/' + req.version + '/check-variable-pay', {
		filteredPrisoners
	})
});
router.post('/activities/:activityId/check-variable-pay', function(req, res) {
	let selectedPrisoners = req.session.data['selected-prisoners']
	let filteredPrisoners = getFilteredPrisoners(selectedPrisoners, req.session.data['prisoners-3'])

	if (req.session.data['standard-pay-all'] == 'no') {
		res.redirect('add-attendance-details')
	} else {
		req.session.data['attendance-details'] = [];
		selectedPrisoners.forEach(prisonerID => {
			req.session.data['attendance-details'].push({
				"_id": prisonerID,
				"pay": ["standard", {
					"pay-detail": []
				}],
				"status": req.session.data['attendance-action']
			});
		});

		let activityId = req.session.data['activity-id'];
		let date = req.session.data['date'];
		let attendanceAction = req.session.data['attendance-action'];
		let activityTimetable = req.session.data['timetable-3'];
		let attendanceDetails = req.session.data['attendance-details'];

		updateAttendanceData(req, activityId, date, attendanceDetails)

		req.session.data['attendance-confirmation'] = 'true'
		res.redirect('../' + activityId + '?date=' + req.session.data['date'])
	}
});

// attendance  details
router.get('/activities/:activityId/:prisonerId', function(req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['timetable-3'].find(activity => activity.id.toString() === activityId)

	let prisonerId = req.params.prisonerId;
	let prisoner = req.session.data['prisoners-3'].find(prisoner => prisoner._id === prisonerId)

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
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['prisoners-3'])

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
	let prisoners = req.session.data['prisoners-3'];
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
	let prisoners = req.session.data['prisoners-3'];
	let locations = getWings(req.session.data['selected-locations']);

	let filteredActivities = getActivitiesForPeriod(activities, period, dayOfWeek);
	let filteredPrisoners = getPrisonersForActivities(prisoners, filteredActivities);
	filteredPrisoners = filterPrisonersByLocation(filteredPrisoners, req.session.data['selected-locations']);

	for (const prisoner of filteredPrisoners) {
		prisoner.activityInfo = [];

		for (const activityId of prisoner.activity) {
			const activityInfo = filteredActivities.find(activity => activity.id === activityId);

			if (activityInfo) {
				prisoner.activityInfo.push(activityInfo);
			}
		}
	}

    // remove the confirmation notification on loading the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}

	res.render('unlock/' + req.version + '/unlock-list', {
		filteredPrisoners,
		filteredActivities,
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
			req.session.data['chosen-date'] = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
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

    let today = DateTime.local().startOf("day");
    let dateLuxon = DateTime.fromFormat(chosenDate, "yyyy-MM-dd").startOf("day");
    let diff = Math.abs(today.diff(dateLuxon, "days").days);
    console.log(diff)
    if (diff <= 1) {
    	relativeDate = dateLuxon.toRelativeCalendar();
    }

    addAttendanceCounts(req.session.data['prisoners-3'], filteredActivities, req.session.data['attendance-data'], date)

    res.render('unlock/' + req.version + '/activities', {
    	filteredActivities,
    	relativeDate,
    	selectedDate
    })
});

module.exports = router