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

// Function to get prisoners by houseblock
const getPrisonersByHouseblock = (prisoners, houseblock) => {
	return prisoners.filter(prisoner => prisoner.location.houseblock === houseblock);
}

// Function to return prisoner details
const findMatchingPrisoner = (prisoners, prisonerIds) => {
  let selectedPrisoners = [];
  if (Array.isArray(prisonerIds)) {
    prisonerIds.forEach(id => {
      let matchingPrisoner = prisoners.find(prisoner => {
        return prisoner.id === id;
      });
      selectedPrisoners.push({
        firstname: matchingPrisoner.name.firstname,
        surname: matchingPrisoner.name.surname,
        id: matchingPrisoner.id
      });
    });
  } else {
    let matchingPrisoner = prisoners.find(prisoner => {
      return prisoner.id === prisonerIds;
    });
    selectedPrisoners.push({
        firstname: matchingPrisoner.name.firstname,
        surname: matchingPrisoner.name.surname,
        id: matchingPrisoner.id
      });
  }
  return selectedPrisoners;
};

// Function to filter a list of prisoners who have an activity on a given date (e.g. '2023-02-21') and period (e.g. 'am' or 'pm')
const getPrisonersByDateAndPeriod = (prisoners, activities, date, period, type) => {
    // get day of week
	const dayOfWeek = new Date(date).getDay() + 1;

    // get list of prisoners with activity ids
	const prisonersWithActivityIds = prisoners.filter(prisoner => {
		if (Array.isArray(prisoner.activity)) {
			return prisoner.activity.length > 0;
		} else {
			return prisoner.activity;
		}
	});


    // filter prisoners by activity ids
    const filteredPrisoners = prisonersWithActivityIds.filter(prisoner => {
        const activityIds = Array.isArray(prisoner.activity) ? prisoner.activity : [prisoner.activity];
        return activityIds.some(activityId => {
            // get activity
            const activity = activities.find(activity => activity.id.toString() === activityId.toString());

            // check if activity has schedule for given day
            if (activity) {
                const scheduleForDay = activity.schedule.find(schedule => schedule.day === dayOfWeek);
                if (scheduleForDay) {
                	console.log(scheduleForDay)
                    const timesForPeriod = scheduleForDay[period.toLowerCase()];
                    if (timesForPeriod && timesForPeriod.length > 0) {
                        return true;
                    }
                }
            }

            return false;
        });
    });

    // filter prisoners by appointments
	const prisonersWithAppointments = prisoners.filter(prisoner => {
		if (Array.isArray(prisoner.appointments) && prisoner.appointments.length > 0) {
			return prisoner.appointments.some(appointment => {
				const appointmentDate = new Date(appointment.date).toDateString();
				const givenDate = new Date(date).toDateString();
				return appointmentDate === givenDate;
			});
		}
	});

    // return merged array of prisoners if type is unlock
	if (type === 'unlock') {
		return [...filteredPrisoners, ...prisonersWithAppointments];
	}
	// return filtered prisoners if type is attendance
	if (type === 'attendance') {
        return [...filteredPrisoners];
    }
}

// Function to add a new "events" array of objects to each filtered prisoner, containing each activity or appointment the prisoner has on the given date
const addEventsToPrisoners = (prisoners, activities, date, period) => {
	return prisoners.map(prisoner => {
        // get prisoner's activity ids
		let activityIds = [];
		if (prisoner.activity) {
			activityIds = Array.isArray(prisoner.activity) ? prisoner.activity : [prisoner.activity];
		}

        // get prisoner's appointments
		let appointments = [];
		if (prisoner.appointments) {
			appointments = Array.isArray(prisoner.appointments) ? prisoner.appointments : [prisoner.appointments];
		}

        // filter prisoner's activities for given date and period
		const activitiesForDate = activityIds.map(activityId => {
			const activity = activities.find(activity => activity.id.toString() === activityId.toString());

            // check if activity has schedule for given day
			const scheduleForDay = activity.schedule.find(schedule => schedule.day === new Date(date).getDay() + 1);
			if (scheduleForDay) {
				const timesForPeriod = scheduleForDay[period.toLowerCase()];
				if (timesForPeriod && timesForPeriod.length > 0) {
					return {
						id: activity.id,
						name: activity.name,
						location: activity.location,
						times: timesForPeriod[0],
						period: period,
						type: 'activity'
					};
				}
			}

			return null;
		}).filter(activity => activity !== null);

        // filter prisoner's appointments for given date
		const appointmentsForDate = appointments.filter(appointment => {
			const appointmentDate = new Date(appointment.date).toDateString();
			const givenDate = new Date(date).toDateString();
			return appointmentDate === givenDate;
		}).map(appointment => {
			return {
				id: appointment.id,
				name: appointment.name,
				location: appointment.location,
				times: {
					startTime: appointment.time
				},
				period: appointment.period,
				type: 'appointment'
			}
		});

        // add new events array to prisoner object
		return {
			...prisoner,
			events: [...activitiesForDate, ...appointmentsForDate]
		};
	});
}

// Function to get a list of activities on a given date
const activitiesByDate = (activities, date) => {
	const dayOfWeek = date.getDay() + 1;
	const filteredActivities = {
		morning: [],
		afternoon: []
	};

	activities.forEach(activity => {
		if (activity.schedule.some(schedule => schedule.day === dayOfWeek)) {
			activity.schedule.forEach(schedule => {
				if (schedule.day === dayOfWeek) {
					if (schedule.am) {
						filteredActivities.morning.push({
							...activity,
							startTime: schedule.am[0].startTime,
							schedule: undefined
						});
					}
					if (schedule.pm) {
						filteredActivities.afternoon.push({
							...activity,
							startTime: schedule.pm[0].startTime,
							schedule: undefined
						});
					}
				}
			});
		}
	});
	return filteredActivities;
}

function getSessionDate(date, activity, direction) {
	const currentDay = new Date(date).getDay() + 1;
	let sessionDay;

	if (direction === 'next') {
		for (const day of activity.schedule) {
			if (day.day > currentDay) {
				sessionDay = day.day;
				break;
			}
			if (day.am || day.pm) {
				sessionDay = day.day;
			}
		}
	} else if (direction === 'previous') {
		for (let i = activity.schedule.length - 1; i >= 0; i--) {
			if (activity.schedule[i].day < currentDay) {
				sessionDay = activity.schedule[i].day;
				break;
			}
			if (activity.schedule[i].am || activity.schedule[i].pm) {
				sessionDay = activity.schedule[i].day;
			}
		}
	}

    // If no next/previous session day was found, it means the next/previous session is in the following/previous week
	if (!sessionDay) {
		if (direction === 'next') {
			sessionDay = activity.schedule[0].day;
		} else if (direction === 'previous') {
			sessionDay = activity.schedule[activity.schedule.length - 1].day;
		}
	}

    // Check if the next/previous session day is in the same week as the current day
	const sessionDate = new Date(date);
	if (direction === 'next') {
		if (sessionDay === currentDay) {
			sessionDate.setDate(sessionDate.getDate() + 7);
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
		filteredPrisoners = prisonerList.filter(prisoner => selectedPrisoners.includes(prisoner.id))
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
	req.session.data['timetable-complete-1']['activities'].forEach((activity) => {
		const id = activity.id;
		const scheduledPrisoners = req.session.data['timetable-complete-1']['prisoners'].filter((prisoner) => prisoner.activity === id);

		const attendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'attended');
		const notAttendedPrisoners = scheduledPrisoners.filter((prisoner) => prisoner.attendance == 'not-attended');

		activity['count'] = scheduledPrisoners.length
		activity['attended-count'] = attendedPrisoners.length
		activity['not-attended-count'] = notAttendedPrisoners.length
	})
}

function getActivitiesForPeriod(activities, period, dayOfWeek) {
	return activities.filter(activity => {
		let schedule = activity.schedule.find(day => day.day === dayOfWeek);
		return schedule && schedule[period.toLowerCase()];
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
		let prisonerID = data[i]['id'];
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
				let prisonerAttendanceData = attendanceData[activityId][date][prisoner.id];
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
		let prisonerList = prisoners.filter(prisoner => prisoner.activity && prisoner.activity.includes(activity.id));
		for (let i = 0; i < prisonerList.length; i++) {
			let prisoner = prisonerList[i];
			if (prisoner.activity.includes(activity.id)) {
				attendanceCount[scheduledKey]++;
				attendanceCount[notRecordedKey]++;
			}
		}
		if (attendanceData && attendanceData[activity.id.toString()] && attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)]) {
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
	let activityId = req.params.activityId;
	let date = req.session.data['date']
	let period = req.session.data['period'];

	let activities = req.session.data['timetable-complete-1']['activities'];
	let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)
	let newActivities = activities.filter(activity => activity.id.toString() === activityId.toString());

	let prisoners = req.session.data['timetable-complete-1']['prisoners']
	let prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisoners, newActivities, date, period, 'attendance')
	let prisonersWithEvents = addEventsToPrisoners(prisonersByDateAndPeriod, activities, date, period);
	let notAttendedCount = countAttendance(req.session.data['attendance-data'], activityId, date, "not-attended");
	let attendedCount = countAttendance(req.session.data['attendance-data'], activityId, date, "attended");

	let nextSessionDate = getSessionDate(date, activity, 'next');
	let previousSessionDate = getSessionDate(date, activity, 'previous');

	// remove the confirmation notification on refreshing the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}

	res.render('unlock/' + req.version + '/activity-list', {
		activity,
		prisonersWithEvents,
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
	let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)

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
		let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId);
		if (activity) {
			activity.cancelled = true;
		}
		let filteredPrisoners = req.session.data['timetable-complete-1']['prisoners'].filter(prisoner => prisoner.activity == activityId)

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
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

	res.render('unlock/' + req.version + '/add-attendance-details', {
		filteredPrisoners
	})
});

router.post('/activities/:activityId/add-attendance-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])
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
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

	res.render('unlock/' + req.version + '/add-attendance-details', {
		filteredPrisoners
	})
});
router.post('/add-refusal-details', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])
	let activityId = req.session.data['activity-id'];
	let date = req.session.data['date']
	let attendanceAction = req.session.data['attendance-action'];
	let activityTimetable = req.session.data['timetable-complete-1']['activities'];
	let attendanceDetails = req.session.data['attendance-details'];

    // set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	res.redirect('refusals-list?date=' + date)
});



// check variable pay
router.get('/activities/:activityId/check-variable-pay', function(req, res) {
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

	res.render('unlock/' + req.version + '/check-variable-pay', {
		filteredPrisoners
	})
});
router.post('/activities/:activityId/check-variable-pay', function(req, res) {
	let selectedPrisoners = req.session.data['selected-prisoners']
	let filteredPrisoners = getFilteredPrisoners(selectedPrisoners, req.session.data['timetable-complete-1']['prisoners'])

	if (req.session.data['standard-pay-all'] == 'no') {
		res.redirect('add-attendance-details')
	} else {
		attendAndPaySelectedPrisoners(prisoners, activityId, date, period)
		req.session.data['attendance-details'] = [];
		selectedPrisoners.forEach(prisonerID => {
			req.session.data['attendance-details'].push({
				"id": prisonerID,
				"pay": ["standard", {
					"pay-detail": []
				}],
				"status": req.session.data['attendance-action']
			});
		});

		let activityId = req.session.data['activity-id'];
		let date = req.session.data['date'];
		let attendanceAction = req.session.data['attendance-action'];
		let activityTimetable = req.session.data['timetable-complete-1']['activities'];
		let attendanceDetails = req.session.data['attendance-details'];

		updateAttendanceData(req, activityId, date, attendanceDetails)

		req.session.data['attendance-confirmation'] = 'true'
		res.redirect('../' + activityId + '?date=' + req.session.data['date'])
	}
});

// attendance  details
router.get('/activities/:activityId/:prisonerId', function(req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)

	let prisonerId = req.params.prisonerId;
	let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)

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
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

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
	let date = req.session.data['date'];
	if (date == 'other-date' && req.session.data['other-date-year'] && req.session.data['other-date-month'] && req.session.data['other-date-day']){
		date = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
	}

	let dayOfWeek = new Date(date).getDay() + 1;

	let activities = req.session.data['timetable-complete-1']['activities'];
	let prisoners = req.session.data['timetable-complete-1']['prisoners'];
	let selectedPrisoners;
	let locations = getWings(req.session.data['selected-locations']);
	let houseblock = Object.keys(locations)[0]

	const prisonersByHouseblock = getPrisonersByHouseblock(prisoners, houseblock);
	const prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisonersByHouseblock, activities, date, period, 'unlock');
	cons
	const prisonersWithEvents = addEventsToPrisoners(prisonersByDateAndPeriod, activities, date, period);

    // remove the confirmation notification on loading the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		selectedPrisoners = findMatchingPrisoner(prisoners, req.session.data['selected-prisoners'])

		delete req.session.data['attendance-confirmation']
	}

	res.render('unlock/' + req.version + '/refusals-list', {
		locations,
		prisonersWithEvents,
		selectedPrisoners,
		date
	})
});

// SELECT UNLOCK LOCATIONS	
router.post('/select-unlock-locations', function(req, res) {
	let chosenDate = req.session.data['date']
	let today = new Date()

	if (chosenDate == 'other-date') {
		if (req.session.data['other-date-year'] !== undefined && req.session.data['other-date-month'] !== undefined && req.session.data['other-date-day'] !== undefined) {
			req.session.data['date'] = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
			res.redirect('unlock-list')
		} else {
			res.redirect('select-unlock-locations');
		}
	} else {
		res.redirect('unlock-list')
	}
});

// unlock list
router.get('/unlock-list', function(req, res) {
	let period = req.session.data['times'].toUpperCase();
	let date = req.session.data['date'];
	if (date == 'other-date' && req.session.data['other-date-year'] && req.session.data['other-date-month'] && req.session.data['other-date-day']){
		date = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
	}

	let dayOfWeek = new Date(date).getDay() + 1;

	let activities = req.session.data['timetable-complete-1']['activities'];
	let prisoners = req.session.data['timetable-complete-1']['prisoners'];
	let locations = getWings(req.session.data['selected-locations']);
	let houseblock = Object.keys(locations)[0]

	const prisonersByHouseblock = getPrisonersByHouseblock(prisoners, houseblock);
	const prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisonersByHouseblock, activities, date, period, 'unlock');
	const prisonersWithEvents = addEventsToPrisoners(prisonersByDateAndPeriod, activities, date, period);

    // remove the confirmation notification on loading the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}    

	res.render('unlock/' + req.version + '/unlock-list', {
		locations,
		prisonersWithEvents,
		date
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
	let chosenDate = req.session.data['date']
	let today = new Date()

	if (chosenDate == 'other-date') {
		if (req.session.data['other-date-year'] !== undefined && req.session.data['other-date-month'] !== undefined && req.session.data['other-date-day'] !== undefined) {
			req.session.data['date'] = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
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
	let chosenDate = req.session.data['date']
	let period = req.session.data['times'].toUpperCase()
	let date = new Date(chosenDate)
	let activitiesForDate = activitiesByDate(req.session.data['timetable-complete-1']['activities'], date);

	if (chosenDate == 'other-date') {
		chosenDate = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
	}

	let relativeDate;
	let today = DateTime.local().startOf("day");
	let dateLuxon = DateTime.fromFormat(chosenDate, "yyyy-MM-dd").startOf("day");
	let diff = Math.abs(today.diff(dateLuxon, "days").days);
	if (diff <= 1) {
		relativeDate = dateLuxon.toRelativeCalendar();
	}

	addAttendanceCounts(req.session.data['timetable-complete-1']['prisoners'], activitiesForDate, req.session.data['attendance-data'], date)

	if (req.query.search) {
		const searchTerm = req.query.search.toLowerCase();
		activitiesForDate.morning = activitiesForDate.morning.filter(activity => activity.name.toLowerCase().includes(searchTerm));
		activitiesForDate.afternoon = activitiesForDate.afternoon.filter(activity => activity.name.toLowerCase().includes(searchTerm));
	}

	res.render('unlock/' + req.version + '/activities', {
		relativeDate,
		activitiesForDate
	})
});

module.exports = router