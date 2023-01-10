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

const attendAndPaySelectedPrisoners = (selectedPrisoners, activityId, date, period, attendanceData, activityPrisonerList) => {
    // loop through selected prisoners
	selectedPrisoners.forEach(prisoner => {
		const attendanceInfo = attendanceData[prisoner];
		const prisonerObject = activityPrisonerList.find(prisonerObject => prisonerObject.id === prisoner);
		if (prisonerObject) {
			if (!prisonerObject.attendance) {
				prisonerObject.attendance = [];
			}
			const attendanceRecordExists = prisonerObject.attendance.find(attendanceRecord => attendanceRecord.activityId === activityId && attendanceRecord.date === date && attendanceRecord.period.toLowerCase() === period.toLowerCase());
			if (!attendanceRecordExists) {
				prisonerObject.attendance.push({
					prisonerId: prisoner,
					activityId: activityId,
					date: date,
					period: period,
					attendance: attendanceInfo.attendance,
					pay: attendanceInfo.pay,
					payReason: attendanceInfo.payReason,
					unacceptableAbsence: attendanceInfo.unacceptableAbsence,
					incentiveLevelWarning: attendanceInfo.incentiveLevelWarning
				});
			}
		}
	});
	return activityPrisonerList;
}

const addAttendanceDataToPrisoners = (prisoners, attendanceData, activityId, date, period) => {
	if (attendanceData && attendanceData[activityId] && attendanceData[activityId][date] && attendanceData[activityId][date][period]) {
		attendanceData[activityId][date][period].forEach(attendanceRecord => {
			const prisonerObject = prisoners.find(prisonerObject => prisonerObject.id === attendanceRecord.prisonerId);
			if (prisonerObject) {
				prisonerObject.attendance = {
					activityId: activityId,
					date: date,
					period: period,
					attendance: attendanceRecord.attendance,
					pay: attendanceRecord.pay,
					payReason: attendanceRecord.payReason,
					unacceptableAbsence: attendanceRecord.unacceptableAbsence,
					incentiveLevelWarning: attendanceRecord.incentiveLevelWarning
				};
			}
		});
	}
	return prisoners;
}

function updateAttendanceData(req, activityId, date, period, attendanceDetails) {
	if (!req.session.data.attendance) {
		req.session.data.attendance = {};
	}
	if (!req.session.data.attendance[activityId]) {
		req.session.data.attendance[activityId] = {};
	}
	if (!req.session.data.attendance[activityId][date]) {
		req.session.data.attendance[activityId][date] = {};
	}
	if (!req.session.data.attendance[activityId][date][period]) {
		req.session.data.attendance[activityId][date][period] = [];
	}
	Object.keys(attendanceDetails).forEach(prisonerId => {
		const details = attendanceDetails[prisonerId];
		const existingRecord = req.session.data.attendance[activityId][date][period].find(record => record.prisonerId === prisonerId);
		if (!existingRecord) {
			req.session.data.attendance[activityId][date][period].push({
				prisonerId: prisonerId,
				attendance: details.attendance,
				pay: details.pay,
				payReason: details.payReason,
				unacceptableAbsence: details.unacceptableAbsence,
				incentiveLevelWarning: details.incentiveLevelWarning,
				timestamp: new Date()
			});
		} else {
			Object.assign(existingRecord, {
				attendance: details.attendance,
				pay: details.pay,
				payReason: details.payReason,
				unacceptableAbsence: details.unacceptableAbsence,
				incentiveLevelWarning: details.incentiveLevelWarning,
				timestamp: new Date()
			});
		}
	});
}

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
							endTime: schedule.am[0].endTime,
							schedule: undefined
						});
					}
					if (schedule.pm) {
						filteredActivities.afternoon.push({
							...activity,
							startTime: schedule.pm[0].startTime,
							endTime: schedule.pm[0].endTime,
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

// function updateAttendanceData(req, activityID, activityDate, data) {
//     // create attendance-data object if it doesn't exist
// 	if (!req.session.data['attendance-data']) {
// 		req.session.data['attendance-data'] = {};
// 	}

//     // create nested objects for activityID and activityDate if they don't exist
// 	if (!req.session.data['attendance-data'][activityID]) {
// 		req.session.data['attendance-data'][activityID] = {};
// 	}
// 	if (!req.session.data['attendance-data'][activityID][activityDate]) {
// 		req.session.data['attendance-data'][activityID][activityDate] = {};
// 	}

//     // add attendance data for each prisoner
// 	for (let i = 0; i < data.length; i++) {
// 		let prisonerID = data[i]['id'];
// 		req.session.data['attendance-data'][activityID][activityDate][prisonerID] = data[i];
// 	}
// }

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

function countAttendance(data, activityId, date, period, status) {
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
	for (const prisonerId in data[activityId][date][period]) {
        // Check if the prisoner's status is "attended"
		if (data[activityId][date][period][prisonerId]["attendance"] === status) {
            // If the prisoner's status is "attended", increment the attendedCount
			attendedCount++;
		}
	}

    // Return the attendedCount
	return attendedCount;
}
const addAttendanceCountsToActivities = (activities, attendanceData, date, prisonersList) => {
	const scheduledKey = 'scheduled';
	const notRecordedKey = 'not-recorded';
	const attendedKey = 'attended';
	const notAttendedKey = 'not-attended';
    // // concat morning and afternoon activities
    // const allActivities = [...activitiesForDate.morning, ...activitiesForDate.afternoon];

    // loop through activities
	for (let activity of activities) {
        // initialize attendance count object
		let attendanceCount = {
			[scheduledKey]: 0,
			[notRecordedKey]: 0,
			[attendedKey]: 0,
			[notAttendedKey]: 0
		};
        // filter prisoners list for activity
		let prisonerList = prisonersList.filter(prisoner => prisoner.activity && prisoner.activity.includes(activity.id));
        // loop through prisoners
		for (let i = 0; i < prisonerList.length; i++) {
			let prisoner = prisonerList[i];
			if (prisoner.activity.includes(activity.id)) {
				attendanceCount[scheduledKey]++;
				attendanceCount[notRecordedKey]++;
			}
		}

        // check if attendance data exists for activity
		if (attendanceData && attendanceData[activity.id.toString()] && attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)]) {
			for (let timeSlot in attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)]) {
				for (let participant in attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)][timeSlot]) {
					if (attendanceData[activity.id.toString()][date.toISOString().slice(0, 10)][timeSlot][participant].attendance === "attended") {
						attendanceCount[attendedKey]++;
						attendanceCount[notRecordedKey]--;
					} else {
						attendanceCount[notAttendedKey]++;
						attendanceCount[notRecordedKey]--;
					}
				}
			}
		}
        // add attendanceCount to activity
		activity.attendanceCount = attendanceCount;
	}
	return activities;
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

	let attendanceData = req.session.data['attendance'];

	let prisonersData = req.session.data['timetable-complete-1']['prisoners']
	let prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisonersData, newActivities, date, period, 'attendance')
	let prisonersWithEvents = addEventsToPrisoners(prisonersByDateAndPeriod, activities, date, period);

	let prisonersList = addAttendanceDataToPrisoners(prisonersWithEvents, attendanceData, activityId, date, period);

	let notAttendedCount = countAttendance(req.session.data['attendance'], activityId, date, period, "not-attended");
	let attendedCount = countAttendance(req.session.data['attendance'], activityId, date, period, "attended");

	let nextSessionDate = getSessionDate(date, activity, 'next');
	let previousSessionDate = getSessionDate(date, activity, 'previous');

	// remove the confirmation notification on refreshing the page
	if (req.session.data['attendance-confirmation'] == 'true') {
		delete req.session.data['attendance-confirmation']
	}

	res.render('unlock/' + req.version + '/activity-list', {
		activity,
		prisonersList,
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
	let date = req.session.data.date
	let period = req.session.data.period

	if (req.session.data['confirm-cancellation'] == 'yes') {
		let activityId = req.params.activityId;
		let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId);
		
		// hacky way to add a cancelled flag
		if (activity) {
			activity.cancelled = true;
		}

		// function to create an attendanceDetails object to pass in to updateAttendanceData and mark all selected prisoners as 'not-attended' and 'standard' pay
		function createAttendanceDetailsForMultiplePrisoners(prisoners) {
			const attendanceDetails = {};
			prisoners.forEach(prisonerId => {
				attendanceDetails[prisonerId] = {
					attendance: 'not-attended',
					pay: 'standard',
					payReason: '',
					unacceptableAbsence: '',
					incentiveLevelWarning: ''
				};
			});
			return attendanceDetails;
		}
		let newActivities = req.session.data['timetable-complete-1']['activities'].filter(activity => activity.id.toString() === activityId.toString());
		let prisonersData = req.session.data['timetable-complete-1']['prisoners']
		let prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisonersData, newActivities, date, period, 'attendance')

		// make an array of prisoners from the attendance details
		const getPrisonerIds = array => {
			const idArray = [];
			array.forEach(item => {
				idArray.push(item.id);
			});
			return idArray;
		};
		let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(getPrisonerIds(prisonersByDateAndPeriod))
		updateAttendanceData(req, activityId, date, period, attendanceDetails)
	}

	res.redirect('/unlock/' + req.version + '/activities/' + req.params.activityId + '?date=' + date + '&period=' + period)
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
	let selectedPrisoners = req.session.data['selected-prisoners'];
	let prisoners = req.session.data['timetable-complete-1']['prisoners'];
	let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], prisoners);
	let activityId = req.params.activityId;
	let date = req.session.data['date'];
	let period = req.session.data['times'];

	// let attendanceAction = req.session.data['attendance-action'];
	let attendanceDetails = req.session.data['attendance-details'];

	let activity = req.session.data['timetable-complete-1']['activities'].filter(activity => activity.id.toString() === activityId)
	let activityPrisonerList = getPrisonersByDateAndPeriod(prisoners, activity, date, period, 'attendance')

	updateAttendanceData(req, activityId, date, period, attendanceDetails)

	// let updatedPrisoners = attendAndPaySelectedPrisoners(selectedPrisoners, activityId, date, period, attendanceDetails, activityPrisonerList)

	// attendanceDetails.forEach(detail => {
	// 	detail.status = attendanceAction;
	// });

    // set the confirmation dialog to display
	req.session.data['attendance-confirmation'] = 'true'

	let referrer = req.session.data['attendance-url']
	let url = (referrer == 'refusals') ? ('refusals-list') : ('../' + activityId + '?date=' + date + '&period=' + period.toUpperCase())

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
	let activityId = req.params.activityId
	let period = req.session.data.period
	let date = req.session.data.date

	if (req.session.data['standard-pay-all'] == 'no') {
		res.redirect('add-attendance-details')
	} else {
    	// function to create an attendanceDetails object to pass in to updateAttendanceData and mark all selected prisoners as 'attended' and 'standard' pay
		function createAttendanceDetailsForMultiplePrisoners(prisoners) {
			const attendanceDetails = {};
			prisoners.forEach(prisonerId => {
				attendanceDetails[prisonerId] = {
					attendance: 'attended',
					pay: 'standard',
					payReason: '',
					unacceptableAbsence: '',
					incentiveLevelWarning: ''
				};
			});
			return attendanceDetails;
		}

		let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(selectedPrisoners)
		updateAttendanceData(req, activityId, date, period, attendanceDetails)

        // function to create an attendanceDetails object to pass in to updateAttendanceData and mark selected prisoners as 'not attended'
		function createAbsentAttendanceDetailsForMultiplePrisoners(prisoners) {
			const attendanceDetails = {};
			prisoners.forEach(prisonerId => {
				attendanceDetails[prisonerId] = {
					attendance: 'not-attended',
					pay: '',
					payReason: '',
					unacceptableAbsence: '',
					incentiveLevelWarning: ''
				};
			});
			return attendanceDetails;
		}

		req.session.data['attendance-confirmation'] = 'true'
		res.redirect('../' + activityId + '?date=' + date + '&period=' + period.toUpperCase())
	}
});

// attendance  details
router.get('/activities/:activityId/:prisonerId', function(req, res) {
	let activityId = req.params.activityId;
	let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)
	let date = req.session.data.date;
	let period = req.session.data.period;
	let prisonerId = req.params.prisonerId;
	let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)

	const getAttendanceData = (prisonerId, activityId, date, period, req) => {
		if (!req.session.data.attendance[activityId] || !req.session.data.attendance[activityId][date] || !req.session.data.attendance[activityId][date][period]) {
			return null;
		}

		for (let i = 0; i < req.session.data.attendance[activityId][date][period].length; i++) {
			if (req.session.data.attendance[activityId][date][period][i].prisonerId === prisonerId) {
				return req.session.data.attendance[activityId][date][period][i];
			}
		}
		return null;
	};

	const attendanceData = getAttendanceData(prisonerId, activityId, date, period, req);

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

	let activitiesForDateWithCounts = {'morning':[], 'afternoon':[]}
	activitiesForDateWithCounts.morning = addAttendanceCountsToActivities(activitiesForDate.morning, req.session.data['attendance'], date, req.session.data['timetable-complete-1']['prisoners']);
	activitiesForDateWithCounts.afternoon = addAttendanceCountsToActivities(activitiesForDate.afternoon, req.session.data['attendance'], date, req.session.data['timetable-complete-1']['prisoners']);
	// console.log(activitiesForDateWithCounts)

	if (req.query.search) {
		const searchTerm = req.query.search.toLowerCase();
		activitiesForDate.morning = activitiesForDate.morning.filter(activity => activity.name.toLowerCase().includes(searchTerm));
		activitiesForDate.afternoon = activitiesForDate.afternoon.filter(activity => activity.name.toLowerCase().includes(searchTerm));
	}

	res.render('unlock/' + req.version + '/activities', {
		relativeDate,
		activitiesForDate,
		activitiesForDateWithCounts
	})
});

module.exports = router