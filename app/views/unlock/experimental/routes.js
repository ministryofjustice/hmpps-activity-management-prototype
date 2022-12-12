const express = require('express')
const router = express.Router()


module.exports = router

router.get('/get-sessions-by-date', function(req, res) {
	const timetable = req.session.data['timetable']
	const activitySeriesData = timetable.activitySeries
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
			const activity = filteredActivities.find(act => act.activity_series_id === session.activity_series_id);

			// Calculate the duration of the session in milliseconds
			const duration = activity.duration * 60 * 1000;

			// Calculate the start and end times of the session
			const startTime = new Date(date + " " + session.time);
			const endTime = new Date(startTime.getTime() + duration);

			// Filter the prisoners to only include those attending the current session
			const attendingPrisoners = timetable.prisonerActivities.filter(prisoner => {
				if (prisoner.activities && prisoner.activities.includes(activity.activity_series_id)) {
					return true;
				}
				return false;
			});

			// Return the session details object
			return {
				session_id: session.session_id,
				activity_id: session.activity_series_id,
				period: session.period,
				time: startTime.toLocaleTimeString('en-us', {timeStyle: 'short'}),
				end_time: endTime.toLocaleTimeString('en-us', {timeStyle: 'short'}),
				capacity: session.capacity,
				location: activity.location,
				prisoners: attendingPrisoners
			};
		});
	}

	const sessions = getSessionsByDateAndPeriod(timetable, req.session.data['date'], req.session.data['period']);

	res.render('unlock/' + req.version + '/get-sessions-by-date', { sessions })
})
