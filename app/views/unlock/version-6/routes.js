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

const addAttendanceDataToPrisoners = (prisoners, attendanceData, activityId, date, period) => {
    if (attendanceData && attendanceData[activityId] && attendanceData[activityId][date] && attendanceData[activityId][date][period]) {
        Object.keys(attendanceData[activityId][date][period]).forEach(prisonerId => {
            const attendanceRecords = attendanceData[activityId][date][period][prisonerId];
            const prisonerObject = prisoners.find(prisonerObject => prisonerObject.id === prisonerId);
            if (prisonerObject) {
                prisonerObject.attendance = {
                    activityId: activityId,
                    date: date,
                    period: period,
                    records: attendanceRecords.map(attendanceRecord => {
                        console.log(attendanceRecord)
                        return {
                            attendance: attendanceRecord.attendance,
                            attendanceDetail: attendanceRecord.attendanceDetail,
                            pay: attendanceRecord.pay,
                            payReason: attendanceRecord.attendanceDetail,
                            unacceptableAbsence: attendanceRecord.unacceptableAbsence,
                            incentiveLevelWarning: attendanceRecord.incentiveLevelWarning,
                            sessionCancelled: attendanceRecord.sessionCancelled,
                            timestamp: attendanceRecord.timestamp
                        }
                    })
                };
                // console.log(prisonerObject.attendance)
            }
        });
    }
    return prisoners;
}

// function to create an attendanceDetails object to pass in to updateAttendanceData and mark all selected prisoners as 'not-attended' and 'standard' pay
function createAttendanceDetailsForMultiplePrisoners(prisoners, attendance, pay, reason, unacceptableAbsence) {
    const attendanceDetails = {};
    prisoners.forEach(prisonerId => {
        attendanceDetails[prisonerId] = {
            attendance: attendance,
            pay: pay,
            payReason: reason,
            'pay-detail': reason,
            attendanceDetail: "Session cancelled",
            unacceptableAbsence: unacceptableAbsence,
            incentiveLevelWarning: ''
        };
    });
    return attendanceDetails;
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
        req.session.data.attendance[activityId][date][period] = {};
    }
    Object.keys(attendanceDetails).forEach(prisonerId => {
        const details = attendanceDetails[prisonerId];

        let payReason;
        if(details['pay'] == 'bonus'){
            payReason = details['bonus-detail']
        } else if(details['pay'] == 'none'){
            payReason = details['no-pay-detail']
        } else {
            payReason = null;
        }

        let attendanceDetail;
        if(details['absence-reason'] == 'sick'){
            attendanceDetail = 'Sick'
            details.pay = 'standard'
        } else if(details['absence-reason'] == 'refused'){
            attendanceDetail = 'Refused to attend'
        } else if(details['absence-reason'] == 'not-required'){
            attendanceDetail = 'Not required or excused'
            details.pay = 'standard'
        } else if(details['absence-reason'] == 'rest-day'){
            attendanceDetail = 'Rest day'
            details.pay = 'standard'
        } else if(details['absence-reason'] == 'other'){
            attendanceDetail = 'Other'
        }

        if (!req.session.data.attendance[activityId][date][period][prisonerId]) {
            req.session.data.attendance[activityId][date][period][prisonerId] = [];
        }

        let sessionCancelled;
        if(details.sessionCancelled == true){
            sessionCancelled = true;
        } else {
            sessionCancelled = false;
        }

        req.session.data.attendance[activityId][date][period][prisonerId].push({
            attendance: details.attendance,
            attendanceDetail: attendanceDetail,
            pay: details.pay,
            payReason: payReason,
            sessionCancelled: sessionCancelled,
            unacceptableAbsence: details.unacceptableAbsence,
            incentiveLevelWarning: details.incentiveLevelWarning,
            timestamp: {
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toTimeString().slice(0, 8)
            }
        });
    });
}

function getActivitiesForPeriod(activities, period, dayOfWeek) {
    return activities.filter(activity => {
        let schedule = activity.schedule.find(day => day.day === dayOfWeek);
        return schedule && schedule[period.toLowerCase()];
    });
}

// Function to filter a list of prisoners who have an activity on a given date (e.g. '2023-02-21') and period (e.g. 'am' or 'pm')
const getPrisonersByDateAndPeriod = (prisoners, activities, date, period, type) => {
    // get day of week
    const dayOfWeek = new Date(date).getDay();

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
const addEventsToPrisoners = (prisoners, activities, date, period, attendanceData) => {
    return prisoners.map(prisoner => {
        let activityIds = [];
        if (prisoner.activity) {
            activityIds = Array.isArray(prisoner.activity) ? prisoner.activity : [prisoner.activity];
        }
        let appointments = [];
        if (prisoner.appointments) {
            appointments = Array.isArray(prisoner.appointments) ? prisoner.appointments : [prisoner.appointments];
        }
        const activitiesForDate = activityIds.map(activityId => {
            const activity = activities.find(activity => activity.id.toString() === activityId.toString());
            const scheduleForDay = activity.schedule.find(schedule => schedule.day === new Date(date).getDay());
            let isSessionCancelled = false;

            if (scheduleForDay) {
                if(scheduleForDay.cancelledSessions){
                    isSessionCancelled = true
                }

                const timesForPeriod = scheduleForDay[period.toLowerCase()];
                
                if (timesForPeriod && timesForPeriod.length > 0) {
                    return {
                        id: activity.id,
                        name: activity.name,
                        location: activity.location,
                        times: timesForPeriod[0],
                        period: period,
                        cancelled: isSessionCancelled,
                        type: 'activity'
                    };
                }
            }

            return null;
        }).filter(activity => activity !== null);

        const appointmentsForDate = appointments.filter(appointment => {
            const appointmentDate = new Date(appointment.date).toDateString();
            const givenDate = new Date(date).toDateString();
            appointment.type = 'appointment';
            return appointmentDate === givenDate;
        });

        // add attendance data to matching events
        const events = [...activitiesForDate, ...appointmentsForDate];
        events.forEach(event => {
            const eventAttendance = attendanceData && attendanceData[event.id] && attendanceData[event.id][date] && attendanceData[event.id][date][event.period];
            if(eventAttendance) {
                Object.keys(eventAttendance).forEach(prisonerId => {
                    if(prisonerId === prisoner.id) {
                        event.attendance = eventAttendance[prisonerId][0].attendance;
                    }
                });
            }
        });


        return {
            ...prisoner,
            events
        };
    });

}



// Function to get a list of activities on a given date
const activitiesByDate = (activities, date) => {
    const dayOfWeek = date.getDay();
    const filteredActivities = {
        morning: [],
        afternoon: []
    };

    activities.forEach(activity => {
        if (activity.schedule.some(schedule => schedule.day === dayOfWeek)) {
            activity.schedule.forEach(schedule => {
                if (schedule.day === dayOfWeek) {
                    if (schedule.am) {
                        let cancelledSessionsAM;
                        if(schedule.cancelledSessions){
                            cancelledSessionsAM = schedule.cancelledSessions.filter(cancellation => cancellation.date === date.toISOString().slice(0,10) && cancellation.period.toLowerCase() === 'am')
                        }
                        filteredActivities.morning.push({
                            ...activity,
                            startTime: schedule.am[0].startTime,
                            endTime: schedule.am[0].endTime,
                            schedule: schedule,
                            cancelledSessions: cancelledSessionsAM
                        });
                    }
                    if (schedule.pm) {
                        let cancelledSessionsPM;
                        if(schedule.cancelledSessions){
                            cancelledSessionsPM = schedule.cancelledSessions.filter(cancellation => cancellation.date === date.toISOString().slice(0,10) && cancellation.period.toLowerCase() === 'pm')
                        }
                        filteredActivities.afternoon.push({
                            ...activity,
                            startTime: schedule.pm[0].startTime,
                            endTime: schedule.pm[0].endTime,
                            schedule: schedule,
                            cancelledSessions: cancelledSessionsPM
                        });
                    }
                }
            });
        }
    });
    return filteredActivities;
}

function getNextSession(activity, selectedDate, selectedPeriod) {
    selectedDate = new Date(selectedDate);
    var currentDay = selectedDate.getDay();

    var nextSession = {
        date: null,
        period: null
    };

    var maxIterations = 8;
    while (maxIterations > 0) {
        if (selectedPeriod === "AM") {
            if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {
                return nextSession = {
                    date: selectedDate.toISOString().slice(0, 10),
                    period: "PM"
                };
            } else {
                currentDay++;
                if (currentDay === 7) {
                    currentDay = 0;
                }
                if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].am !== null) {
                    selectedDate.setDate(selectedDate.getDate() + 1)
                    return nextSession = {
                        date: selectedDate.toISOString().slice(0, 10),
                        period: "AM"
                    };
                } else {
                    if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {
                        selectedDate.setDate(selectedDate.getDate() + 1)
                        return nextSession = {
                            date: selectedDate.toISOString().slice(0, 10),
                            period: "PM"
                        };
                    } else {
                        selectedDate.setDate(selectedDate.getDate() + 1)
                        maxIterations--;
                    }
                }
            }
        } else if (selectedPeriod === "PM") {
            currentDay++;
            if (currentDay === 7) {
                currentDay = 0;
                // selectedDate.setDate(selectedDate.getDate() + 1);
            }
            if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].am !== null) {
                selectedDate.setDate(selectedDate.getDate() + 1)
                return nextSession = {
                    date: selectedDate.toISOString().slice(0, 10),
                    period: "AM"
                };
            } else {
                if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {
                    selectedDate.setDate(selectedDate.getDate() + 1)
                    return nextSession = {
                        date: selectedDate.toISOString().slice(0, 10),
                        period: "PM"
                    };
                } else {
                    selectedDate.setDate(selectedDate.getDate() + 1)
                    maxIterations--;
                }
            }
        }
    }

    return "No upcoming sessions found";
}

function getPreviousSession(activity, selectedDate, selectedPeriod) {
    selectedDate = new Date(selectedDate);
    var currentDay = selectedDate.getDay();

    var previousSession = {
        date: null,
        period: null
    };

    var maxIterations = 8;
    while (maxIterations > 0) {
        if (selectedPeriod === "PM") {
            if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].am !== null) {
                return previousSession = {
                    date: selectedDate.toISOString().slice(0, 10),
                    period: "AM"
                };
            } else {
                currentDay--;
                if (currentDay === -1) {
                    currentDay = 6;
                    selectedDate.setDate(selectedDate.getDate() - 0);
                }
                if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {

                    selectedDate.setDate(selectedDate.getDate() - 1)
                    return previousSession = {
                        date: selectedDate.toISOString().slice(0, 10),
                        period: "PM"
                    };
                } else {
                    if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].am !== null) {
                        selectedDate.setDate(selectedDate.getDate() - 1)
                        return previousSession = {
                            date: selectedDate.toISOString().slice(0, 10),
                            period: "AM"
                        };
                    } else {
                        selectedDate.setDate(selectedDate.getDate() - 1)
                        maxIterations--;
                    }
                }
            }
        } else if (selectedPeriod === "AM") {
            currentDay--;
            if (currentDay === -1) {
                currentDay = 6;
            }
            if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {
                selectedDate.setDate(selectedDate.getDate() - 1)
                return previousSession = {
                    date: selectedDate.toISOString().slice(0, 10),
                    period: "PM"
                };
            } else {
                if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].am !== null) {
                    selectedDate.setDate(selectedDate.getDate() - 1)
                    return previousSession = {
                        date: selectedDate.toISOString().slice(0, 10),
                        period: "AM"
                    };
                } else {
                    selectedDate.setDate(selectedDate.getDate() - 1)
                    maxIterations--;
                }
            }
        }
    }

    return "No upcoming sessions found";
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
    if (!data[activityId] || !data[activityId][date] || !data[activityId][date][period]) {
        return 0;
    }

    // Initialise a counter for the number of prisoners with the status "attended"
    let attendedCount = 0;

    // Iterate through the prisoners in the class on the given date
    for (const prisonerId in data[activityId][date][period]) {
        // Check if the prisoner's status is "attended"
        if (data[activityId][date][period][prisonerId][0]["attendance"] === status) {
            // If the prisoner's status is "attended", increment the attendedCount
            attendedCount++;
        }
    }

    // Return the attendedCount
    return attendedCount;

}

const addAttendanceCountsToActivities = (activities, attendanceData, selectedDate, prisonersList) => {
    const scheduledKey = 'scheduled';
    const notRecordedKey = 'not-recorded';
    const attendedKey = 'attended';
    const notAttendedKey = 'not-attended';
    for (let activity of activities) {
        let attendanceCountAM = {
            [scheduledKey]: 0,
            [notRecordedKey]: 0,
            [attendedKey]: 0,
            [notAttendedKey]: 0
        };

        let attendanceCountPM = {
            [scheduledKey]: 0,
            [notRecordedKey]: 0,
            [attendedKey]: 0,
            [notAttendedKey]: 0
        };

        activity.attendanceCount = {
            morning: "",
            afternoon: ""
        }
        let prisonerList = prisonersList.filter(prisoner => prisoner.activity && prisoner.activity.includes(activity.id));
        for (let i = 0; i < prisonerList.length; i++) {
            let prisoner = prisonerList[i];
            let date = new Date(selectedDate).toISOString().slice(0, 10)

            attendanceCountAM[scheduledKey] = prisonerList.length;
            attendanceCountAM[notRecordedKey] = prisonerList.length;

            attendanceCountPM[scheduledKey] = prisonerList.length;
            attendanceCountPM[notRecordedKey] = prisonerList.length;

            if(!attendanceData || (!attendanceData[activity.id.toString()] || !attendanceData[activity.id.toString()][date] || !attendanceData[activity.id.toString()][date].AM)) {
                activity.attendanceCount.morning = attendanceCountAM;
            } else if (attendanceData && attendanceData[activity.id.toString()] && attendanceData[activity.id.toString()][date] && attendanceData[activity.id.toString()][date].AM) {
                const amAttendance = attendanceData[activity.id.toString()][date].AM;
                for (let prisonerId in amAttendance) {
                    if (prisonerId === prisoner.id.toString()) {
                        if (amAttendance[prisonerId][0].attendance === 'attended') {
                            attendanceCountAM[attendedKey]++;
                        } else if (amAttendance[prisonerId][0].attendance === 'not-attended') {
                            attendanceCountAM[notAttendedKey]++;
                        }
                    }
                    attendanceCountAM[notRecordedKey]--;
                }
                activity.attendanceCount.morning = attendanceCountAM;
            } else {
                activity.attendanceCount.morning = attendanceCountAM;
            }
            
            if (attendanceData == undefined || (!attendanceData[activity.id.toString()] || !attendanceData[activity.id.toString()][date] || !attendanceData[activity.id.toString()][date].PM)) {
                activity.attendanceCount.afternoon = attendanceCountPM;
            } else if (attendanceData && attendanceData[activity.id.toString()] && attendanceData[activity.id.toString()][date] && attendanceData[activity.id.toString()][date].PM) {
                const pmAttendance = attendanceData[activity.id.toString()][date].PM;
                for (let prisonerId in pmAttendance) {
                    if (prisonerId === prisoner.id.toString()) {
                        if (pmAttendance[prisonerId][0].attendance === 'attended') {
                            attendanceCountPM[attendedKey]++;
                        } else if (pmAttendance[prisonerId][0].attendance === 'not-attended') {
                            attendanceCountPM[notAttendedKey]++;
                        }
                    }
                    attendanceCountPM[notRecordedKey]--;
                }
                activity.attendanceCount.afternoon = attendanceCountPM;
            } else {
                activity.attendanceCount.afternoon = attendanceCountPM;
            }
        }
    }
}


// ATTENDANCE LIST
router.get('/activities/:selectedDate/:selectedPeriod/:activityId', function(req, res) {
    let activityId = req.params.activityId;
    let date = req.params.selectedDate
    let period = req.params.selectedPeriod;

    let activities = req.session.data['timetable-complete-1']['activities'];
    let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)
    let newActivities = activities.filter(activity => activity.id.toString() === activityId.toString());

    let attendanceData = req.session.data['attendance'];

    let prisonersData = req.session.data['timetable-complete-1']['prisoners']
    let prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisonersData, newActivities, date, period, 'attendance')
    let prisonersWithEvents = addEventsToPrisoners(prisonersByDateAndPeriod, activities, date, period, attendanceData);
    let prisonersList = addAttendanceDataToPrisoners(prisonersWithEvents, attendanceData, activityId, date, period);

    prisonersList.forEach(prisoner => {
        // remove the current activity from the list of events - we don't need it
        prisoner.events = prisoner.events.filter(event => event.id != activityId);

        // remove other attendance data
        if (prisoner.attendance) {
            let records = prisoner.attendance.records;
            let record;
            if (prisoner.attendance.activityId === activityId && prisoner.attendance.date === date && prisoner.attendance.period === period) {
                record = records.reduce((mostRecentRecord, currentRecord) => {
                    return new Date(currentRecord.timestamp.date + ' ' + currentRecord.timestamp.time) > new Date(mostRecentRecord.timestamp.date + ' ' + mostRecentRecord.timestamp.time) ? currentRecord : mostRecentRecord;
                });
            } else {
                record = [];
            }
            prisoner.attendance = record;
        }
    })

    let notAttendedCount = countAttendance(req.session.data['attendance'], activityId, date, period, "not-attended");
    let attendedCount = countAttendance(req.session.data['attendance'], activityId, date, period, "attended");

    let nextSessionDate = getNextSession(activity, date, period);
    let previousSessionDate = getPreviousSession(activity, date, period);

    let day = new Date(date).getDay()
    let activitySchedule = activity.schedule.filter(schedule => schedule.day.toString() === day.toString());
    let activityTimes = activitySchedule[0][period.toLowerCase()][0]

    // remove the confirmation notification on refreshing the page
    if (req.session.data['attendance-confirmation'] == 'true') {
        delete req.session.data['attendance-confirmation']
    }

    res.render('unlock/' + req.version + '/activity-list', {
        activity,
        day,
        date,
        period,
        activityTimes,
        prisonersList,
        notAttendedCount,
        attendedCount,
        activityId,
        nextSessionDate,
        previousSessionDate,
        activitySchedule
    })
});

router.post('/activities/:selectedDate/:selectedPeriod/:activityId', function(req, res) {
    res.redirect('add-attendance-details')
});

// cancellation  details
router.get('/activities/:selectedDate/:selectedPeriod/:activityId/cancel', function(req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)

    res.render('unlock/' + req.version + '/choose-cancellation-reason', {
        activity
    })
})
router.post('/activities/:selectedDate/:selectedPeriod/:activityId/cancel', function(req, res) {
    res.redirect('confirm-cancellation')
})
router.get('/activities/:selectedDate/:selectedPeriod/:activityId/confirm-cancellation', function(req, res) {
    res.render('unlock/' + req.version + '/confirm-cancellation')
})
router.post('/activities/:selectedDate/:selectedPeriod/:activityId/confirm-cancellation', function(req, res) {
    let date = req.params.selectedDate
    let period = req.params.selectedPeriod
    let activityId = req.params.activityId;

    if (req.session.data['confirm-cancellation'] == 'yes') {
        let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId);
        let day = new Date(date).getDay();
        let reason = req.session.data['cancellation-reason'];
        let activitySchedule = activity.schedule.find(schedule => schedule.day.toString() === day.toString());

        if ( ! activitySchedule.cancelledSessions){
            activitySchedule.cancelledSessions = []
        }

        activitySchedule.cancelledSessions.push({date, period, reason});

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
        
        let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(getPrisonerIds(prisonersByDateAndPeriod), 'not-attended', 'standard', reason, 'no')
        Object.keys(attendanceDetails).forEach(prisonerId => {
            const details = attendanceDetails[prisonerId];
            details.sessionCancelled = true
        })
        // console.log(attendanceDetails)
        updateAttendanceData(req, activityId, date, period, attendanceDetails)
    }

    res.redirect('/unlock/' + req.version + '/activities/' + date + '/' + period + '/' + activityId)
})

// ATTENDANCE DETAILS
router.get('/activities/:selectedDate/:selectedPeriod/:activityId/add-attendance-details', function(req, res) {
    delete req.session.data['attendance-details']
    let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

    res.render('unlock/' + req.version + '/add-attendance-details', {
        filteredPrisoners
    })
});
router.post('/activities/:selectedDate/:selectedPeriod/:activityId/add-attendance-details', function(req, res) {
    let selectedPrisoners = req.session.data['selected-prisoners'];
    let prisoners = req.session.data['timetable-complete-1']['prisoners'];
    let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], prisoners);
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;

    // let attendanceAction = req.session.data['attendance-action'];
    let attendanceDetails = req.session.data['attendance-details'];

    // let activity = req.session.data['timetable-complete-1']['activities'].filter(activity => activity.id.toString() === activityId)
    // let activityPrisonerList = getPrisonersByDateAndPeriod(prisoners, activity, date, period, 'attendance')

    updateAttendanceData(req, activityId, date, period, attendanceDetails)

    // set the confirmation dialog to display
    req.session.data['attendance-confirmation'] = 'true'

    let referrer = req.session.data['attendance-url']
    let url = (referrer == 'refusals') ? ('refusals-list') : ('../' + activityId)

    res.redirect(url)
});

// refusals
router.get('/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock/add-refusal-details', function(req, res) {
    delete req.session.data['attendance-details']
    let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

    let pageToRender;
    if(req.session.data['refusal-type'] == 'sickness'){
        refusalPage = 'add-sickness-details'
    } else if(req.session.data['refusal-type'] == 'refused'){
        refusalPage = 'add-refusal-details'
    } else {
        refusalPage = 'add-absent-details'
    }
    res.render('unlock/' + req.version + '/' + refusalPage, {
        filteredPrisoners
    })
});
router.post('/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock/add-refusal-details', function(req, res) {
    let prisoners = req.session.data['timetable-complete-1']['prisoners'];
    let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], prisoners);

    let date = req.params.selectedDate;
    let dateObject = new Date(date)

    let period = req.params.selectedPeriod;
    let periodWord = period === 'AM' ? "morning" : "afternoon";

    let houseblock = req.params.selectedHouseblock;
    let attendanceDetails = req.session.data['attendance-details'];

    // get a list of all activities for the selected date
    let activitiesForDate = activitiesByDate(req.session.data['timetable-complete-1']['activities'], dateObject);

    // for each prisoner in filteredPrisoners
    filteredPrisoners.forEach(prisoner => {
        // and for each activity in each prisoner
        prisoner.activity.forEach(prisonerActivity => {
            // get the activity detail
            let activity = activitiesForDate[periodWord].filter(a => a.id === prisonerActivity)            
            let activityId;

            // if there's an activity and it has an ID, set it and update the prisoner's attendance for each activity
            if(activity[0] && activity[0].id){
                activityId = activity[0].id
                updateAttendanceData(req, activityId, date, period, attendanceDetails)
            }
        })
    })

    // set the confirmation dialog to display
    req.session.data['attendance-confirmation'] = 'true'

    // set the confirmation dialog to display
    req.session.data['attendance-confirmation'] = 'true'

    res.redirect('../' + houseblock)
});

// attend and pay
router.post('/activities/:selectedDate/:selectedPeriod/:activityId/attend-and-pay', function(req, res) {
    let selectedPrisoners = req.session.data['selected-prisoners']
    let activityId = req.params.activityId
    let period = req.params.selectedPeriod
    let date = req.params.selectedDate

    let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(selectedPrisoners, 'attended', 'standard', '', 'no')

    updateAttendanceData(req, activityId, date, period, attendanceDetails)

    req.session.data['attendance-confirmation'] = 'true'
    res.redirect('../' + activityId)
});




// check variable pay
router.get('/activities/:selectedDate/:selectedPeriod/:activityId/check-variable-pay', function(req, res) {
    let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

    res.render('unlock/' + req.version + '/check-variable-pay', {
        filteredPrisoners
    })
});
router.post('/activities/:selectedDate/:selectedPeriod/:activityId/check-variable-pay', function(req, res) {
    let selectedPrisoners = req.session.data['selected-prisoners']
    let activityId = req.params.activityId
    let period = req.params.selectedPeriod
    let date = req.params.selectedDate

    if (req.session.data['standard-pay-all'] == 'no') {
        res.redirect('add-attendance-details')
    } else {
    	let attendanceAction = req.session.data['attendance-action']
        let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(selectedPrisoners, 'attended', 'standard', '', 'no')

        updateAttendanceData(req, activityId, date, period, attendanceDetails)

        req.session.data['attendance-confirmation'] = 'true'
        res.redirect('../' + activityId)
    }
});

// attendance  details
router.get('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId', function(req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)

    const attendanceData = req.session.data.attendance[activityId][date][period][prisonerId]

    res.render('unlock/' + req.version + '/attendance-details', {
        prisoner,
        date,
        period,
        activity,
        attendanceData
    })
})

router.post('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId', function(req, res) {
    res.redirect(req.params.prisonerId + '/change')
});


router.get('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-attendance', function(req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)

    let attendanceData = req.session.data['attendance']

    let prisonerAttendanceRecord = req.session.data.attendance[activityId][date][period][prisonerId][0]

    res.render('unlock/' + req.version + '/change-attendance', {
        prisoner,
        date,
        period,
        activityId,
        activity,
        prisonerAttendanceRecord
    })
})

router.post('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-attendance', function(req, res) {
    let attendance = req.session.data['attendance-action']

    // let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)
    // req.session.data = [prisoner.id]

    // createAttendanceDetailsForMultiplePrisoners(selectedPrisoner, 'not-attended', 'standard', '', 'no')

    if(attendance == 'attended'){
        res.redirect('change-pay')
    } else if(attendance == 'not-attended'){
        res.redirect('../add-attendance-details')
    } else if(attendance == 'unknown'){
        res.redirect('confirm-remove-attendance')
    }
})

router.get('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/confirm-remove-attendance', function(req, res) {
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)

    res.render('unlock/' + req.version + '/confirm-remove-attendance', {
        prisoner
    })
})
router.post('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/confirm-remove-attendance', function(req, res) {
    let prisonerId = req.params.prisonerId;
    let attendanceData = req.session.data.attendance
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let attendanceDataForActivity = attendanceData[activityId][date][period]

    for (let prisonerId in attendanceDataForActivity) {
        if (attendanceDataForActivity.hasOwnProperty(prisonerId)) {
            delete attendanceDataForActivity[prisonerId];
            break;
        }
    }

    res.redirect('../../'+req.params.activityId)
})

router.get('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-attendance-details', function(req, res) {
    let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], req.session.data['timetable-complete-1']['prisoners'])

    res.render('unlock/' + req.version + '/add-attendance-details', {
        filteredPrisoners
    })
})

router.get('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-pay', function(req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data['timetable-complete-1']['activities'].find(activity => activity.id.toString() === activityId)
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)

    res.render('unlock/' + req.version + '/change-pay', {
        prisoner,
        date,
        period,
        activityId,
        activity
    })
})

router.post('/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-pay', function(req, res) {
    let prisonerId = req.params.prisonerId;
    let attendanceData = req.session.data.attendance
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let attendanceDataForActivity = attendanceData[activityId][date][period]

    let selectedPrisoners = req.session.data['selected-prisoners'];
    let prisoners = req.session.data['timetable-complete-1']['prisoners'];
    let filteredPrisoners = getFilteredPrisoners(req.session.data['selected-prisoners'], prisoners);

    let attendanceDetails = req.session.data['attendance-details'];

    updateAttendanceData(req, activityId, date, period, attendanceDetails)

    // set the confirmation dialog to display
    req.session.data['attendance-confirmation'] = 'true'

    res.redirect('../../'+req.params.activityId)
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
    let date = req.session.data['date']
    let period = req.session.data['period'].toUpperCase()
    let locations = getWings(req.session.data['selected-locations']);
    let houseblock = Object.keys(locations)[0]

    if (date == 'other-date') {
        if (req.session.data['other-date-year'] !== undefined && req.session.data['other-date-month'] !== undefined && req.session.data['other-date-day'] !== undefined) {
            date = req.session.data['date'] = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
            res.redirect('refusals-list/' + date + '/' + period + '/' + houseblock)
        } else {
            res.redirect('select-refusals-locations');
        }
    } else {
        res.redirect('refusals-list/' + date + '/' + period + '/' + houseblock)
    }
});

// REFUSALS LIST
router.get('/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock', function(req, res) {
    let period = req.params.selectedPeriod;
    let date = req.params.selectedDate;
    let dayOfWeek = new Date(date).getDay();

    let activities = req.session.data['timetable-complete-1']['activities'];
    let prisoners = req.session.data['timetable-complete-1']['prisoners'];
    let locations = getWings(req.session.data['selected-locations']);
    let houseblock = req.params.selectedHouseblock

    let attendanceData = req.session.data['attendance'];

    const prisonersByHouseblock = getPrisonersByHouseblock(prisoners, houseblock);
    const prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisonersByHouseblock, activities, date, period, 'unlock');
    let prisonersWithEvents = addEventsToPrisoners(prisonersByDateAndPeriod, activities, date, period, attendanceData);

    prisonersWithEvents.forEach(prisoner => {
        // remove other attendance data
        if (prisoner.attendance) {
            let records = prisoner.attendance.records;
            let record;
            if (prisoner.attendance.activityId === activityId && prisoner.attendance.date === date && prisoner.attendance.period === period) {
                record = records.reduce((mostRecentRecord, currentRecord) => {
                    return new Date(currentRecord.timestamp.date + ' ' + currentRecord.timestamp.time) > new Date(mostRecentRecord.timestamp.date + ' ' + mostRecentRecord.timestamp.time) ? currentRecord : mostRecentRecord;
                });
            } else {
                record = [];
            }
            prisoner.attendance = record;
        }
    })

    // remove the confirmation notification on loading the page
    if (req.session.data['attendance-confirmation'] == 'true') {
        delete req.session.data['attendance-confirmation']
    }

    //landing filters
    if (req.session.data['filters'] && req.session.data['filters']['landings']) {
        let landings = req.session.data['filters']['landings'];

        const removeLanding = req.query['remove-landing'];
        if (removeLanding) {
            landings = landings.filter(landing => landing !== removeLanding);
            if(landings.length === 0) {
                delete req.session.data['filters']['landings']
            } else {
                req.session.data['filters']['landings'] = landings;
            }
            delete req.query['remove-landing'];
        }

        if (landings !== '_unchecked' && landings.length > 0) {
            landings = landings.map(landing => landing.toString());
            prisonersWithEvents = prisonersWithEvents.filter(prisoner => landings.includes(prisoner.location.landing.toString()));
        }
    }

    res.render('unlock/' + req.version + '/refusals-list', {
        locations,
        prisonersWithEvents,
        prisonersByHouseblock,
        date,
        period,
        houseblock
    })
});

// SELECT UNLOCK LOCATIONS	
router.post('/select-unlock-locations', function(req, res) {
    let date = req.session.data['date']
    let period = req.session.data['period'].toUpperCase()
    let locations = getWings(req.session.data['selected-locations']);
    let houseblock = Object.keys(locations)[0]

    if (date == 'other-date') {
        if (req.session.data['other-date-year'] !== undefined && req.session.data['other-date-month'] !== undefined && req.session.data['other-date-day'] !== undefined) {
            date = req.session.data['date'] = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
            res.redirect('unlock-list/' + date + '/' + period + '/' + houseblock)
        } else {
            res.redirect('select-unlock-locations');
        }
    } else {
        res.redirect('unlock-list/' + date + '/' + period + '/' + houseblock)
    }
});

// unlock list
router.get('/unlock-list/:selectedDate/:selectedPeriod/:selectedHouseblock', function(req, res) {
    let period = req.params.selectedPeriod;
    let date = req.params.selectedDate;
    let dayOfWeek = new Date(date).getDay();

    let activities = req.session.data['timetable-complete-1']['activities'];
    let prisoners = req.session.data['timetable-complete-1']['prisoners'];
    let houseblock = req.params.selectedHouseblock
    let locations = getWings(req.session.data['selected-locations']);

    let attendanceData = req.session.data['attendance'];

    const prisonersByHouseblock = getPrisonersByHouseblock(prisoners, houseblock);
    const prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(prisonersByHouseblock, activities, date, period, 'unlock');
    let prisonersWithEvents = addEventsToPrisoners(prisonersByDateAndPeriod, activities, date, period, attendanceData);

    let filteredActivities = getActivitiesForPeriod(activities, period, dayOfWeek);

    let relativeDate;
    let today = DateTime.local().startOf("day");
    let dateLuxon = DateTime.fromFormat(date, "yyyy-MM-dd").startOf("day");
    let diff = Math.abs(today.diff(dateLuxon, "days").days);
    if (diff <= 1) {
        relativeDate = dateLuxon.toRelativeCalendar();
    }

    // remove the confirmation notification on loading the page
    if (req.session.data['attendance-confirmation'] == 'true') {
        delete req.session.data['attendance-confirmation']
    }

    //landing filters
    if (req.session.data['filters'] && req.session.data['filters']['landings']) {
        let landings = req.session.data['filters']['landings'];

        const removeLanding = req.query['remove-landing'];
        if (removeLanding) {
            landings = landings.filter(landing => landing !== removeLanding);
            if(landings.length === 0) {
                delete req.session.data['filters']['landings']
            } else {
                req.session.data['filters']['landings'] = landings;
            }
            delete req.query['remove-landing'];
        }

        if (landings !== '_unchecked' && landings.length > 0) {
            landings = landings.map(landing => landing.toString());
            prisonersWithEvents = prisonersWithEvents.filter(prisoner => landings.includes(prisoner.location.landing.toString()));
        }
    }

    res.render('unlock/' + req.version + '/unlock-list', {
        locations,
        prisonersWithEvents,
        date,
        relativeDate,
        period,
        houseblock,
        filteredActivities
    })
});

router.get('/unlock-list/download', function(req, res) {
    const file = `public/downloads/Unlock list concept.pdf`;
    res.download(file);
});


// SELECT-ACTIVITY
router.get('/select-activity', function(req, res) {
    res.render('unlock/' + req.version + '/select-activity')
});
router.post('/select-activity', function(req, res) {
    let date = req.session.data['date']

    if (date == 'other-date') {
        if (req.session.data['other-date-year'] !== undefined && req.session.data['other-date-month'] !== undefined && req.session.data['other-date-day'] !== undefined) {
            date = req.session.data['date'] = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
            res.redirect('activities/' + date)
        } else {
            res.redirect('select-activity');
        }
    } else {
        res.redirect('activities/' + date)
    }
});
// SELECT ACTIVITY RESULTS
router.get('/activities/:selectedDate', function(req, res) {
    let selectedDate = req.params.selectedDate
    let period = req.session.data['times'].toUpperCase()
    let date = new Date(selectedDate)
    let activitiesForDate = activitiesByDate(req.session.data['timetable-complete-1']['activities'], date);

    if (selectedDate == 'other-date') {
        selectedDate = `${req.session.data['other-date-year']}-${req.session.data['other-date-month']}-${req.session.data['other-date-day']}`;
    }

    let relativeDate;
    let today = DateTime.local().startOf("day");
    let dateLuxon = DateTime.fromFormat(selectedDate, "yyyy-MM-dd").startOf("day");
    let diff = Math.abs(today.diff(dateLuxon, "days").days);
    if (diff <= 1) {
        relativeDate = dateLuxon.toRelativeCalendar();
    }

    let activitiesForDateWithCounts = {
        'morning': [],
        'afternoon': []
    }
    activitiesForDateWithCounts.morning = addAttendanceCountsToActivities(activitiesForDate.morning, req.session.data['attendance'], date, req.session.data['timetable-complete-1']['prisoners']);
    activitiesForDateWithCounts.afternoon = addAttendanceCountsToActivities(activitiesForDate.afternoon, req.session.data['attendance'], date, req.session.data['timetable-complete-1']['prisoners']);

    if (req.query.search) {
        const searchTerm = req.query.search.toLowerCase().replace(/\s/g, "");
        activitiesForDate.morning = activitiesForDate.morning.filter(activity => activity.name.toLowerCase().replace(/\s/g, "").includes(searchTerm));
        activitiesForDate.afternoon = activitiesForDate.afternoon.filter(activity => activity.name.toLowerCase().replace(/\s/g, "").includes(searchTerm));
    }

    let locations = [];
    let attendanceTotals = {};

        // 'scheduled': 0,
        // 'not-attended': 0,
        // 'attended': 0,
        // 'not-recorded': 0
    
    for (const period in activitiesForDate) {
        attendanceTotals[period] = attendanceTotals[period] || {};
        for (const activity of activitiesForDate[period]) {
            for (const type in activity.attendanceCount[period]) {
                attendanceTotals[period][type] = (attendanceTotals[period][type] || 0) +
                (activity.attendanceCount[period][type] > 0 ? activity.attendanceCount[period][type] : 0);
            }
        }
    }

    res.render('unlock/' + req.version + '/activities', {
        locations,
        attendanceTotals,
        selectedDate,
        relativeDate,
        activitiesForDate,
        activitiesForDateWithCounts
    })
});

// prisoner profile
router.get('/prisoner/:prisonerId', function(req, res) {
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data['timetable-complete-1']['prisoners'].find(prisoner => prisoner.id === prisonerId)

    res.render('unlock/' + req.version + '/prisoner-profile', {
        prisoner
    })
})

router.get('/attendance-dashboard-3', function(req, res) {
    let attendanceData = req.session.data['attendance-data-1']
    let date = new Date().toISOString().slice(0, 10);

    delete req.session.data['attendance-data-1']['daily'];

    function calculateTotals(data) {
        let totals = {};
        for (const period of Object.keys(data)) {
            for (const key of Object.keys(data[period])) {
                if (typeof data[period][key] === 'object') {
                    if (!totals[key]) {
                        totals[key] = {};
                    }
                    for (const subKey of Object.keys(data[period][key])) {
                        if (!totals[key][subKey]) {
                            totals[key][subKey] = 0;
                        }
                        totals[key][subKey] += data[period][key][subKey];
                    }
                } else {
                    if (!totals[key]) {
                        totals[key] = 0;
                    }
                    totals[key] += data[period][key];
                }
            }
        }
        return totals;
    }

    const totals = calculateTotals(attendanceData)
    req.session.data['attendance-data-1']['daily'] = totals;

    res.render('unlock/' + req.version + '/attendance-dashboard-3', {date})
});

router.get('/attendance-dashboard-4', function(req, res) {
    let attendanceData = req.session.data['attendance-data-1']
    let date = new Date().toISOString().slice(0, 10);

    delete req.session.data['attendance-data-1']['daily'];

    function calculateTotals(data) {
        let totals = {};
        for (const period of Object.keys(data)) {
            for (const key of Object.keys(data[period])) {
                if (typeof data[period][key] === 'object') {
                    if (!totals[key]) {
                        totals[key] = {};
                    }
                    for (const subKey of Object.keys(data[period][key])) {
                        if (!totals[key][subKey]) {
                            totals[key][subKey] = 0;
                        }
                        totals[key][subKey] += data[period][key][subKey];
                    }
                } else {
                    if (!totals[key]) {
                        totals[key] = 0;
                    }
                    totals[key] += data[period][key];
                }
            }
        }
        return totals;
    }

    const totals = calculateTotals(attendanceData)
    req.session.data['attendance-data-1']['daily'] = totals;

    res.render('unlock/' + req.version + '/attendance-dashboard-4', {date})
});

module.exports = router