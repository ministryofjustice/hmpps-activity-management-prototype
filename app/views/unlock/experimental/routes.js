const express = require('express')
const router = express.Router()


module.exports = router


router.get('/get-prisoners-1', function(req, res) {
	const activities = req.session.data['timetable-complete-1']['activities']
	const prisoners = req.session.data['timetable-complete-1']['prisoners']

	const filterByLocation = (prisoners, locations) => {
		const filteredPrisoners = prisoners.filter(prisoner => {
			return locations.includes(prisoner.location.houseblock);
		});
		return filteredPrisoners;
	};
	const filterByActivityDate = (prisoners, activities, date, period) => {
		const filteredPrisoners = prisoners.filter(prisoner => {
			if(prisoner.activity && prisoner.activity.length){
				const activityIds = prisoner.activity;
				for (let i = 0; i < activities.length; i++) {
					const activity = activities[i];
					if (activity.startDate <= date && activity.endDate >= date && activity[period] !== null) {
						if (activityIds.includes(activity.id)) {
							return true;
						}
					}
				}
				return false;
			}
		});
		return filteredPrisoners;
	};

	const addByAppointmentDate = (prisoners, date) => {
		const filteredPrisoners = prisoners.filter(prisoner => {
			if(prisoner.appointments && prisoner.appointments.length){
				const prisonerAppointments = prisoner.appointments;
				for (let i = 0; i < prisonerAppointments.length; i++) {
					const appointment = prisonerAppointments[i];
					if (appointment.date === date) {
						return true;
					}
				}
				return false;
			}
		});
		return filteredPrisoners;
	};

	const addEventData = (prisoners, events) => {
		const filteredPrisoners = prisoners.map(prisoner => {
			if(prisoner.activity && prisoner.activity.length){
				const activityIds = prisoner.activity;
				for (let i = 0; i < events.length; i++) {
					const event = events[i];
					if (activityIds.includes(event.id)) {
						prisoner.event = event;
						break;
					}
				}
				return prisoner;
			}
		});
		return filteredPrisoners;
	};

	const filterPrisoners = (prisoners, locations, activities, date, period) => {
		let filteredPrisoners = filterByLocation(prisoners, locations);
		filteredPrisoners = filterByActivityDate(filteredPrisoners, activities, date, period);
		filteredPrisoners = addByAppointmentDate(filteredPrisoners, date);
		// filteredPrisoners = addEventData(filteredPrisoners, events);
		return filteredPrisoners;
	};

	const filteredPrisoners = filterPrisoners(prisoners, ['1'], activities, "2023-04-06", "AM")
	console.log(filteredPrisoners)
	res.render('unlock/' + req.version + '/get-prisoners-1', {
		filteredPrisoners
	})
})


router.get('/get-sessions-by-date', function(req, res) {
	const timetable = req.session.data['timetable']
	const activitySeriesData = timetable.activitySeries
	const activityData = timetable.activities
	const sessionsData = timetable.sessions

	function getSessionsByDateAndPeriod(timetable, date, period) {
		// Convert the given date to a day of the week
		const dayOfWeek = new Date(date).getDay();

		// Filter the activity series to only include those that occur on the given day of the week
		// and are currently active (i.e. between their start and end dates)
		const filteredActivities = timetable.activitySeries
		.filter(activity => activity.days_of_week.includes(dayOfWeek))
		.filter(activity => {
			const start = new Date(activity.start_date);
			const end = new Date(activity.end_date);
			const current = new Date(date);
			return current >= start && current <= end;
		});

		// Filter the sessions to only include those that occur during the given period
		const sessions = timetable.sessions.filter(session => session.period === period);

		// Map the filtered activities to their corresponding sessions and filter out any sessions that
		// do not exist for the given activity series
		const matchingSessions = filteredActivities
		.map(activity => sessions.find(session => session.activity_series_id === activity.activity_series_id))
		.filter(session => session !== undefined);

		// Map the matching sessions to their session details
		return matchingSessions.map(session => {
			// Find the activity series associated with the current session
			const activitySeries = filteredActivities.find(act => act.activity_series_id === session.activity_series_id);
			// Find the activity associated with the current activity series
			const activity = timetable.activities.find(act => act.activity_id === activitySeries.activity_id);

			// Calculate the duration of the session in milliseconds
			const duration = activitySeries.duration * 60 * 1000;

			// Calculate the start and end times of the session
			const startTime = new Date(date + " " + session.time);
			const endTime = new Date(startTime.getTime() + duration);

			// Filter the prisoners to only include those attending the current session
			const attendingPrisoners = timetable.prisonerActivities.filter(prisoner => {
				if (prisoner.activities && prisoner.activities.includes(activitySeries.activity_series_id)) {
					return true;
				}
				return false;
			});

			// Return the session details object
			return {
				session_id: session.session_id,
				activity_series_id: session.activity_series_id,
				activity_id: activity.activity_id,
				activity_name: activity.activity_name,
				period: session.period,
				time: startTime.toLocaleTimeString('en-us', {timeStyle: 'short'}),
				end_time: endTime.toLocaleTimeString('en-us', {timeStyle: 'short'}),
				capacity: session.capacity,
				location: activitySeries.location,
				prisoners: attendingPrisoners
			};
		});
	}

	const sessions = getSessionsByDateAndPeriod(timetable, req.session.data['date'], req.session.data['period']);

	res.render('unlock/' + req.version + '/get-sessions-by-date', { sessions })
})


router.get('/get-sessions-by-date-2', function(req, res) {
	const timetable = req.session.data['timetable-2']
	const activityLocations = req.session.data['activity-locations-2']
	const activities = req.session.data['activities-2']
	const prisoners = req.session.data['prisoners-2']

	function getScheduledActivities(date,time,activitiesList,locationsList,prisoners) {
		var scheduledActivities = [];
		var d = new Date(date);
		var day = d.getDay();
		timetable.forEach(activity => {
			var startDate = new Date(activity.startDate);
			var endDate = new Date(activity.endDate);
			if (d >= startDate && d <= endDate) {
				for (var j = 0; j < activity.timesAndDays.length; j++) {
					var timeAndDay = activity.timesAndDays[j];
					if (time == timeAndDay.time && day == timeAndDay.day) {
						var scheduledActivity = {
							"activity_id": activity.activity_id,
							"location_id": activity.location_id,
							"startDate": activity.startDate,
							"endDate": activity.endDate,
							"timesAndDays": activity.timesAndDays,
							"prisoner_ids": []
						};
						for (var k = 0; k < activitiesList.length; k++) {
							var activityListItem = activitiesList[k];
							if (activityListItem.id == activity.activity_id) {
								scheduledActivity.name = activityListItem.name;
								break;
							}
						}
						for (var l = 0; l < locationsList.length; l++) {
							var locationListItem = locationsList[l];
							if (locationListItem.id == activity.location_id) {
								scheduledActivity.location = locationListItem.name;
								break;
							}
						}
						prisoners.forEach(prisoner => {
							if (prisoner.activities && prisoner.activities.includes(activity.activity_id)) {
								scheduledActivity.prisoner_ids.push(prisoner.id);
							}
						});
						scheduledActivities.push(scheduledActivity);
					}
				}
			}
		});
		return scheduledActivities;
	}


	const sessions = getScheduledActivities(req.session.data['date'], req.session.data['period'], activities, activityLocations, prisoners)

	res.render('unlock/' + req.version + '/get-sessions-by-date-2', { sessions })
})

router.get('/get-prisoners-by-date', function(req, res) {
	const timetable = req.session.data['timetable-2']
	const activityLocations = req.session.data['activity-locations-2']
	const activities = req.session.data['activities-2']
	const prisonersList = req.session.data['prisoners-2']

	// function getScheduledPrisoners(date,time,activitiesList,locationsList,prisoners) {
	// 	var scheduledPrisoners = [];
	// 	var d = new Date(date);
	// 	var day = d.getDay();
	// 	timetable.forEach(activity => {
	// 		var startDate = new Date(activity.startDate);
	// 		var endDate = new Date(activity.endDate);
	// 		if (d >= startDate && d <= endDate) {
	// 			for (var j = 0; j < activity.timesAndDays.length; j++) {
	// 				var timeAndDay = activity.timesAndDays[j];
	// 				if (time == timeAndDay.time && day == timeAndDay.day) {
	// 					for (var k = 0; k < prisoners.length; k++) {
	// 						var prisoner = prisoners[k];
	// 						if (prisoner.activities && prisoner.activities.includes(activity.activity_id)) {
	// 							scheduledPrisoners.push(prisoner);
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}
	// 	});
	// 	return scheduledPrisoners;
	// }


	function getScheduledPrisoners(date,time,activitiesList,locationsList,prisoners) {
		var scheduledPrisoners = [];
		var d = new Date(date);
		var day = d.getDay();
		timetable.forEach(activity => {
			var startDate = new Date(activity.startDate);
			var endDate = new Date(activity.endDate);
			if (d >= startDate && d <= endDate) {
				for (var j = 0; j < activity.timesAndDays.length; j++) {
					var timeAndDay = activity.timesAndDays[j];
					if (time == timeAndDay.time && day == timeAndDay.day) {
						for (var k = 0; k < prisoners.length; k++) {
							var prisoner = prisoners[k];
							if (prisoner.activities && prisoner.activities.includes(activity.activity_id)) {
								var scheduledPrisoner = {
									"id": prisoner.id,
									"first_name": prisoner.first_name,
									"last_name": prisoner.last_name,
									"alerts": prisoner.alerts,
									"location": prisoner.location,
									"activity_id": activity.activity_id,
									"activity_name": "",
									"location_id": activity.location_id,
									"location_name": ""
								};
								for (var l = 0; l < activitiesList.length; l++) {
									var activityListItem = activitiesList[l];
									if (activityListItem.id == activity.activity_id) {
										scheduledPrisoner.activity_name = activityListItem.name;
										break;
									}
								}
								for (var m = 0; m < activitiesList.length; m++) {
									var locationsListItem = locationsList[m];
									if (locationsListItem.id == activity.location_id) {
										scheduledPrisoner.location_name = locationsListItem.name;
										break;
									}
								}
								scheduledPrisoners.push(scheduledPrisoner);
							}
						}
					}
				}
			}
		})
		return scheduledPrisoners;
	}

	function getScheduledActivities(date,time,activitiesList,locationsList,prisoners) {
		var scheduledActivities = [];
		var d = new Date(date);
		var day = d.getDay();
		timetable.forEach(activity => {
			var startDate = new Date(activity.startDate);
			var endDate = new Date(activity.endDate);
			if (d >= startDate && d <= endDate) {
				for (var j = 0; j < activity.timesAndDays.length; j++) {
					var timeAndDay = activity.timesAndDays[j];
					if (time == timeAndDay.time && day == timeAndDay.day) {
						var scheduledActivity = {
							"activity_id": activity.activity_id,
							"location_id": activity.location_id,
							"startDate": activity.startDate,
							"endDate": activity.endDate,
							"timesAndDays": activity.timesAndDays,
							"prisoner_ids": []
						};
						for (var k = 0; k < activitiesList.length; k++) {
							var activityListItem = activitiesList[k];
							if (activityListItem.id == activity.activity_id) {
								scheduledActivity.name = activityListItem.name;
								break;
							}
						}
						for (var l = 0; l < locationsList.length; l++) {
							var locationListItem = locationsList[l];
							if (locationListItem.id == activity.location_id) {
								scheduledActivity.location = locationListItem.name;
								break;
							}
						}
						prisoners.forEach(prisoner => {
							if (prisoner.activities && prisoner.activities.includes(activity.activity_id)) {
								scheduledActivity.prisoner_ids.push(prisoner.id);
							}
						});
						scheduledActivities.push(scheduledActivity);
					}
				}
			}
		});
		return scheduledActivities;
	}

	function getPrisonersWithScheduledActivities(date, time, activitiesList, locationsList, prisoners, houseblocks, landing) {
		var scheduledActivities = getScheduledActivities(date, time, activitiesList, locationsList, prisoners);
		var prisonerIds = [];
		var prisonersWithScheduledActivities = [];
		scheduledActivities.forEach(scheduledActivity => {
			scheduledActivity.prisoner_ids.forEach(prisonerId => {
				if (!prisonerIds.includes(prisonerId)) {
					var prisoner = prisoners.find(prisoner => prisoner.id == prisonerId);
					if (houseblocks==undefined || houseblocks.includes(prisoner.location.houseblock)) {
						if (landing==undefined ||prisoner.location.landing == landing) {
							prisonerIds.push(prisonerId);
							var prisonerWithScheduledActivity = {
								id: prisonerId,
								first_name: prisoner.first_name,
								last_name: prisoner.last_name,
								location: prisoner.location,
								scheduled_activities: []
							};
							scheduledActivities.forEach(scheduledActivity => {
								if (scheduledActivity.prisoner_ids.includes(prisonerId)) {
									prisonerWithScheduledActivity.scheduled_activities.push({
										scheduled_activity_id: scheduledActivity.activity_id,
										scheduled_activity_name: scheduledActivity.name,
										scheduled_activity_location: scheduledActivity.location
									});
								}
							});
							prisonersWithScheduledActivities.push(prisonerWithScheduledActivity)
						}
					}
				}
			})
		});
		return prisonersWithScheduledActivities.reduce((a, c) => (a[c.location.houseblock] = a[c.location.houseblock] || {}, a[c.location.houseblock][c.location.landing] = a[c.location.houseblock][c.location.landing] || [], a[c.location.houseblock][c.location.landing].push(c), a), {});
	}



	const prisoners = getPrisonersWithScheduledActivities(req.session.data['date'], req.session.data['period'], activities, activityLocations, prisonersList)

	res.render('unlock/' + req.version + '/get-prisoners-by-date', { prisoners })
})