const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

//redirect the root url to the start page
router.get("/", function (req, res) {
  res.redirect(req.version + "/config");
});

// Function to get prisoners by houseblock
const getPrisonersByHouseblock = (prisoners, houseblock) => {
  return prisoners.filter(
    (prisoner) => prisoner.location.houseblock === houseblock
  );
};

const addAttendanceDataToPrisoners = (
  prisoners,
  attendanceData,
  activityId,
  date,
  period
) => {
  if (
    attendanceData &&
    attendanceData[activityId] &&
    attendanceData[activityId][date] &&
    attendanceData[activityId][date][period]
  ) {
    Object.keys(attendanceData[activityId][date][period]).forEach(
      (prisonerId) => {
        const attendanceRecords =
          attendanceData[activityId][date][period][prisonerId];
        const prisonerObject = prisoners.find(
          (prisonerObject) => prisonerObject.id === prisonerId
        );
        if (prisonerObject) {
          prisonerObject.attendance = {
            activityId: activityId,
            date: date,
            period: period,
            records: attendanceRecords.map((attendanceRecord) => {
              return {
                attendance: attendanceRecord.attendance,
                attendanceStatus: attendanceRecord.attendanceStatus,
                pay: attendanceRecord.pay,
                caseNote: attendanceRecord.incentiveLevelWarning,
                incentiveLevelWarning: attendanceRecord.incentiveLevelWarning,
                sessionCancelled: attendanceRecord.sessionCancelled,
                timestamp: attendanceRecord.timestamp,
              };
            }),
          };
        }
      }
    );
  }
  return prisoners;
};

// function to create an attendanceDetails object to pass in to updateAttendanceData and mark all selected prisoners as 'not-attended' and 'standard' pay
function createAttendanceDetailsForMultiplePrisoners(
  prisoners,
  { attendance, attendanceStatus, pay, caseNote, incentiveLevelWarning }
) {
  const attendanceDetails = {};
  prisoners.forEach((prisonerId) => {
    attendanceDetails[prisonerId] = {
      attendance: attendance,
      attendanceStatus,
      pay,
      "case-note": caseNote,
      "incentive-level-warning": incentiveLevelWarning,
      // attendanceDetail: "Session cancelled",
      // unacceptableAbsence: unacceptableAbsence,
    };
  });
  return attendanceDetails;
}

function updateAttendanceData(
  req,
  activityId,
  date,
  period,
  attendanceDetails
) {
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
  Object.keys(attendanceDetails).forEach((prisonerId) => {
    const details = attendanceDetails[prisonerId];
    let reason = details["absence-reason"];

    switch (reason) {
      // If the prisoner is sick, on a rest day, or for some other reason and pay is required, set pay to the value of the pay-prisoner radio button
      case "sick":
      case "rest-day":
      case "other":
        details.pay = details["pay-prisoner"] == "yes";
        break;

      // If the prisoner refused to work or the work is not required, set pay to false
      case "refused":
        details.pay = false;
        break;

      // If there's a clash or not required, set pay to true
      case "clash":
      case "not-required":
        details.pay = true;
        break;
    }

    if (!req.session.data.attendance[activityId][date][period][prisonerId]) {
      req.session.data.attendance[activityId][date][period][prisonerId] = [];
    }

    let sessionCancelled;
    if (details.sessionCancelled == true) {
      sessionCancelled = true;
    } else {
      sessionCancelled = false;
    }

    let detailText;
    console.log(reason);
    if (reason == "sick") {
      detailText = details["sick-detail"];
    } else if (reason == "other") {
      detailText = details["other-detail"];
    }

    req.session.data.attendance[activityId][date][period][prisonerId].push({
      attendance: details.attendance,
      attendanceStatus: reason,
      pay: details.pay,
      sessionCancelled: sessionCancelled,
      cancellationReason: details.cancellationReason,
      // unacceptableAbsence: details.unacceptableAbsence,
      incentiveLevelWarning: details["incentive-level-warning"],
      caseNote: details["case-note"],
      detail: detailText,
      timestamp: {
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 8),
      },
    });
  });
}

function getActivitiesForPeriod(activities, period, dayOfWeek) {
  return activities.filter((activity) => {
    let schedule = activity.schedule.find((day) => day.day === dayOfWeek);
    return schedule && schedule[period.toLowerCase()];
  });
}

// Function to filter a list of prisoners who have an activity on a given date (e.g. '2023-02-21') and period (e.g. 'am' or 'pm')
const getPrisonersByDateAndPeriod = (
  prisoners,
  activities,
  date,
  period,
  type
) => {
  // get day of week
  const dayOfWeek = new Date(date).getDay();

  // get list of prisoners with activity ids
  const prisonersWithActivityIds = prisoners.filter((prisoner) => {
    if (Array.isArray(prisoner.activity)) {
      return prisoner.activity.length > 0;
    } else {
      return prisoner.activity;
    }
  });

  // filter prisoners by activity ids
  const filteredPrisoners = prisonersWithActivityIds.filter((prisoner) => {
    const activityIds = Array.isArray(prisoner.activity)
      ? prisoner.activity
      : [prisoner.activity];
    return activityIds.some((activityId) => {
      // get activity
      const activity = activities.find(
        (activity) => activity.id.toString() === activityId.toString()
      );

      // check if activity has schedule for given day
      if (activity) {
        const scheduleForDay = activity.schedule.find(
          (schedule) => schedule.day === dayOfWeek
        );
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
  const prisonersWithAppointments = prisoners.filter((prisoner) => {
    if (
      Array.isArray(prisoner.appointments) &&
      prisoner.appointments.length > 0
    ) {
      return prisoner.appointments.some((appointment) => {
        const appointmentDate = new Date(appointment.date).toDateString();
        const givenDate = new Date(date).toDateString();
        return appointmentDate === givenDate;
      });
    }
  });

  // return merged array of prisoners if type is unlock
  if (type === "unlock") {
    return [...filteredPrisoners, ...prisonersWithAppointments];
  }
  // return filtered prisoners if type is attendance
  if (type === "attendance") {
    return [...filteredPrisoners];
  }
};

// Function to add a new "events" array of objects to each filtered prisoner, containing each activity or appointment the prisoner has on the given date
const addEventsToPrisoners = (
  prisoners,
  activities,
  date,
  period,
  attendanceData
) => {
  return prisoners.map((prisoner) => {
    let activityIds = [];
    if (prisoner.activity) {
      activityIds = Array.isArray(prisoner.activity)
        ? prisoner.activity
        : [prisoner.activity];
    }
    let appointments = [];
    if (prisoner.appointments) {
      appointments = Array.isArray(prisoner.appointments)
        ? prisoner.appointments
        : [prisoner.appointments];
    }
    const activitiesForDate = activityIds
      .map((activityId) => {
        const activity = activities.find(
          (activity) => activity.id.toString() === activityId.toString()
        );
        const scheduleForDay = activity.schedule.find(
          (schedule) => schedule.day === new Date(date).getDay()
        );
        let isSessionCancelled = false;

        if (scheduleForDay) {
          if (scheduleForDay.cancelledSessions) {
            isSessionCancelled = true;
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
              type: "activity",
            };
          }
        }

        return null;
      })
      .filter((activity) => activity !== null);

    const appointmentsForDate = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.date).toDateString();
      const givenDate = new Date(date).toDateString();
      appointment.type = "appointment";
      return appointmentDate === givenDate;
    });

    // add attendance data to matching events
    const events = [...activitiesForDate, ...appointmentsForDate];
    events.forEach((event) => {
      const eventAttendance =
        attendanceData &&
        attendanceData[event.id] &&
        attendanceData[event.id][date] &&
        attendanceData[event.id][date][event.period];
      if (eventAttendance) {
        Object.keys(eventAttendance).forEach((prisonerId) => {
          if (prisonerId === prisoner.id) {
            let prisonerAttendanceData = eventAttendance[prisonerId];
            event.attendance =
              prisonerAttendanceData[
                prisonerAttendanceData.length - 1
              ].attendance;
          }
        });
      }
    });

    return {
      ...prisoner,
      events,
    };
  });
};

// Function to get a list of activities on a given date
const activitiesByDate = (activities, date) => {
  const dayOfWeek = date.getDay();
  const filteredActivities = {
    morning: [],
    afternoon: [],
  };

  activities.forEach((activity) => {
    if (activity.schedule.some((schedule) => schedule.day === dayOfWeek)) {
      activity.schedule.forEach((schedule) => {
        if (schedule.day === dayOfWeek) {
          if (schedule.am) {
            let cancelledSessionsAM;
            if (schedule.cancelledSessions) {
              cancelledSessionsAM = schedule.cancelledSessions.filter(
                (cancellation) =>
                  cancellation.date === date.toISOString().slice(0, 10) &&
                  cancellation.period.toLowerCase() === "am"
              );
            }
            filteredActivities.morning.push({
              ...activity,
              startTime: schedule.am[0].startTime,
              endTime: schedule.am[0].endTime,
              schedule: schedule,
              cancelledSessions: cancelledSessionsAM,
            });
          }
          if (schedule.pm) {
            let cancelledSessionsPM;
            if (schedule.cancelledSessions) {
              cancelledSessionsPM = schedule.cancelledSessions.filter(
                (cancellation) =>
                  cancellation.date === date.toISOString().slice(0, 10) &&
                  cancellation.period.toLowerCase() === "pm"
              );
            }
            filteredActivities.afternoon.push({
              ...activity,
              startTime: schedule.pm[0].startTime,
              endTime: schedule.pm[0].endTime,
              schedule: schedule,
              cancelledSessions: cancelledSessionsPM,
            });
          }
        }
      });
    }
  });
  return filteredActivities;
};

function getNextSession(activity, selectedDate, selectedPeriod) {
  selectedDate = new Date(selectedDate);
  var currentDay = selectedDate.getDay();

  var nextSession = {
    date: null,
    period: null,
  };

  var maxIterations = 8;
  while (maxIterations > 0) {
    if (selectedPeriod === "AM") {
      if (
        activity.schedule &&
        activity.schedule[currentDay] &&
        activity.schedule[currentDay].pm !== null
      ) {
        return (nextSession = {
          date: selectedDate.toISOString().slice(0, 10),
          period: "PM",
        });
      } else {
        currentDay++;
        if (currentDay === 7) {
          currentDay = 0;
        }
        if (
          activity.schedule &&
          activity.schedule[currentDay] &&
          activity.schedule[currentDay].am !== null
        ) {
          selectedDate.setDate(selectedDate.getDate() + 1);
          return (nextSession = {
            date: selectedDate.toISOString().slice(0, 10),
            period: "AM",
          });
        } else {
          if (
            activity.schedule &&
            activity.schedule[currentDay] &&
            activity.schedule[currentDay].pm !== null
          ) {
            selectedDate.setDate(selectedDate.getDate() + 1);
            return (nextSession = {
              date: selectedDate.toISOString().slice(0, 10),
              period: "PM",
            });
          } else {
            selectedDate.setDate(selectedDate.getDate() + 1);
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
      if (
        activity.schedule &&
        activity.schedule[currentDay] &&
        activity.schedule[currentDay].am !== null
      ) {
        selectedDate.setDate(selectedDate.getDate() + 1);
        return (nextSession = {
          date: selectedDate.toISOString().slice(0, 10),
          period: "AM",
        });
      } else {
        if (
          activity.schedule &&
          activity.schedule[currentDay] &&
          activity.schedule[currentDay].pm !== null
        ) {
          selectedDate.setDate(selectedDate.getDate() + 1);
          return (nextSession = {
            date: selectedDate.toISOString().slice(0, 10),
            period: "PM",
          });
        } else {
          selectedDate.setDate(selectedDate.getDate() + 1);
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
    period: null,
  };

  var maxIterations = 8;
  while (maxIterations > 0) {
    if (selectedPeriod === "PM") {
      if (
        activity.schedule &&
        activity.schedule[currentDay] &&
        activity.schedule[currentDay].am !== null
      ) {
        return (previousSession = {
          date: selectedDate.toISOString().slice(0, 10),
          period: "AM",
        });
      } else {
        currentDay--;
        if (currentDay === -1) {
          currentDay = 6;
          selectedDate.setDate(selectedDate.getDate() - 0);
        }
        if (
          activity.schedule &&
          activity.schedule[currentDay] &&
          activity.schedule[currentDay].pm !== null
        ) {
          selectedDate.setDate(selectedDate.getDate() - 1);
          return (previousSession = {
            date: selectedDate.toISOString().slice(0, 10),
            period: "PM",
          });
        } else {
          if (
            activity.schedule &&
            activity.schedule[currentDay] &&
            activity.schedule[currentDay].am !== null
          ) {
            selectedDate.setDate(selectedDate.getDate() - 1);
            return (previousSession = {
              date: selectedDate.toISOString().slice(0, 10),
              period: "AM",
            });
          } else {
            selectedDate.setDate(selectedDate.getDate() - 1);
            maxIterations--;
          }
        }
      }
    } else if (selectedPeriod === "AM") {
      currentDay--;
      if (currentDay === -1) {
        currentDay = 6;
      }
      if (
        activity.schedule &&
        activity.schedule[currentDay] &&
        activity.schedule[currentDay].pm !== null
      ) {
        selectedDate.setDate(selectedDate.getDate() - 1);
        return (previousSession = {
          date: selectedDate.toISOString().slice(0, 10),
          period: "PM",
        });
      } else {
        if (
          activity.schedule &&
          activity.schedule[currentDay] &&
          activity.schedule[currentDay].am !== null
        ) {
          selectedDate.setDate(selectedDate.getDate() - 1);
          return (previousSession = {
            date: selectedDate.toISOString().slice(0, 10),
            period: "AM",
          });
        } else {
          selectedDate.setDate(selectedDate.getDate() - 1);
          maxIterations--;
        }
      }
    }
  }

  return "No upcoming sessions found";
}

const checkDateTense = (date) => {
  if (date > new Date().toISOString().slice(0, 10)) {
    return "future";
  } else if (date < new Date().toISOString().slice(0, 10)) {
    return "past";
  } else if (date == new Date().toISOString().slice(0, 10)) {
    return "present";
  }
};

function getFilteredPrisoners(selectedPrisoners, prisonerList) {
  let filteredPrisoners = [];

  if (selectedPrisoners) {
    filteredPrisoners = prisonerList.filter((prisoner) =>
      selectedPrisoners.includes(prisoner.id)
    );
  } else {
    filteredPrisoners = prisonerList.slice(0, 3);
  }

  return filteredPrisoners;
}

function getWings(data) {
  let locations = {};

  if (data.hasOwnProperty("houseblocks")) {
    locations[data.houseblocks] = [];

    if (data.hasOwnProperty("wings")) {
      data.wings.forEach((string) => {
        const [houseblock, wing] = string.split("-");
        if (locations.hasOwnProperty(houseblock)) {
          locations[houseblock].push(wing);
        }
      });
    }
  }

  return locations;
}

// const activityLocations =

function getAttendanceData(
  date,
  activityId,
  attendanceData,
  filteredPrisoners
) {
  let updatedFilteredPrisoners = [];
  if (
    attendanceData &&
    attendanceData[activityId] &&
    attendanceData[activityId][date]
  ) {
    for (let i = 0; i < filteredPrisoners.length; i++) {
      let prisoner = filteredPrisoners[i];
      let activityIds = prisoner.activity.map((activityId) =>
        activityId.toString()
      );
      if (activityIds.includes(activityId.toString())) {
        let prisonerAttendanceData =
          attendanceData[activityId][date][prisoner.id];
        if (prisonerAttendanceData) {
          prisoner.attendance = {
            status: prisonerAttendanceData.status,
            pay: prisonerAttendanceData.pay,
            warningDetail:
              prisonerAttendanceData["incentive-level-warning-detail"],
            date,
          };
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
        if (
          prisoner.attendance &&
          prisoner.attendance.activityId !== activityId
        ) {
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
  if (
    !data[activityId] ||
    !data[activityId][date] ||
    !data[activityId][date][period]
  ) {
    return 0;
  }

  // Initialise a counter for the number of prisoners with the status "attended"
  let attendedCount = 0;

  // Iterate through the prisoners in the class on the given date
  for (const prisonerId in data[activityId][date][period]) {
    let prisonerAttendance = data[activityId][date][period][prisonerId];

    // Check if the prisoner's status is "attended"
    if (
      prisonerAttendance[prisonerAttendance.length - 1]["attendance"] === status
    ) {
      // If the prisoner's status is "attended", increment the attendedCount
      attendedCount++;
    }
  }

  // Return the attendedCount
  return attendedCount;
}

const addAttendanceCountsToActivities = (
  activities,
  attendanceData,
  selectedDate,
  prisonersList
) => {
  const scheduledKey = "scheduled";
  const notRecordedKey = "not-recorded";
  const attendedKey = "attended";
  const notAttendedKey = "not-attended";
  for (let activity of activities) {
    let attendanceCountAM = {
      [scheduledKey]: 0,
      [notRecordedKey]: 0,
      [attendedKey]: 0,
      [notAttendedKey]: 0,
    };

    let attendanceCountPM = {
      [scheduledKey]: 0,
      [notRecordedKey]: 0,
      [attendedKey]: 0,
      [notAttendedKey]: 0,
    };

    activity.attendanceCount = {
      morning: "",
      afternoon: "",
    };
    let prisonerList = prisonersList.filter(
      (prisoner) => prisoner.activity && prisoner.activity.includes(activity.id)
    );
    for (let i = 0; i < prisonerList.length; i++) {
      let prisoner = prisonerList[i];
      let date = new Date(selectedDate).toISOString().slice(0, 10);

      attendanceCountAM[scheduledKey] = prisonerList.length;
      attendanceCountAM[notRecordedKey] = prisonerList.length;

      attendanceCountPM[scheduledKey] = prisonerList.length;
      attendanceCountPM[notRecordedKey] = prisonerList.length;

      if (
        !attendanceData ||
        !attendanceData[activity.id.toString()] ||
        !attendanceData[activity.id.toString()][date] ||
        !attendanceData[activity.id.toString()][date].AM
      ) {
        activity.attendanceCount.morning = attendanceCountAM;
      } else if (
        attendanceData &&
        attendanceData[activity.id.toString()] &&
        attendanceData[activity.id.toString()][date] &&
        attendanceData[activity.id.toString()][date].AM
      ) {
        const amAttendance = attendanceData[activity.id.toString()][date].AM;
        for (let prisonerId in amAttendance) {
          if (prisonerId === prisoner.id.toString()) {
            let prisonerAMAttendance = amAttendance[prisonerId];
            if (
              prisonerAMAttendance[prisonerAMAttendance.length - 1]
                .attendance === "attended"
            ) {
              attendanceCountAM[attendedKey]++;
            } else if (
              prisonerAMAttendance[prisonerAMAttendance.length - 1]
                .attendance === "not-attended"
            ) {
              attendanceCountAM[notAttendedKey]++;
            }
          }
          attendanceCountAM[notRecordedKey]--;
        }
        activity.attendanceCount.morning = attendanceCountAM;
      } else {
        activity.attendanceCount.morning = attendanceCountAM;
      }

      if (
        attendanceData == undefined ||
        !attendanceData[activity.id.toString()] ||
        !attendanceData[activity.id.toString()][date] ||
        !attendanceData[activity.id.toString()][date].PM
      ) {
        activity.attendanceCount.afternoon = attendanceCountPM;
      } else if (
        attendanceData &&
        attendanceData[activity.id.toString()] &&
        attendanceData[activity.id.toString()][date] &&
        attendanceData[activity.id.toString()][date].PM
      ) {
        const pmAttendance = attendanceData[activity.id.toString()][date].PM;
        for (let prisonerId in pmAttendance) {
          if (prisonerId === prisoner.id.toString()) {
            let prisonerPMAttendance = pmAttendance[prisonerId];
            if (
              prisonerPMAttendance[prisonerPMAttendance.length - 1]
                .attendance === "attended"
            ) {
              attendanceCountPM[attendedKey]++;
            } else if (
              prisonerPMAttendance[prisonerPMAttendance.length - 1]
                .attendance === "not-attended"
            ) {
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
};

// PAGE: Activity attendance prisoner list
// TAGS: attendance list, prisoner list
// URL: '/activities/DATE/PERIOD/ACTIVITYID'
router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId",
  function (req, res) {
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;

    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId
    );
    let newActivities = activities.filter(
      (activity) => activity.id.toString() === activityId.toString()
    );

    let attendanceData = req.session.data["attendance"];

    let prisonersData = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(
      prisonersData,
      newActivities,
      date,
      period,
      "attendance"
    );
    let prisonersWithEvents = addEventsToPrisoners(
      prisonersByDateAndPeriod,
      activities,
      date,
      period,
      attendanceData
    );
    let prisonersList = addAttendanceDataToPrisoners(
      prisonersWithEvents,
      attendanceData,
      activityId,
      date,
      period
    );

    prisonersList.forEach((prisoner) => {
      // remove the current activity from the list of events - we don't need it
      prisoner.events = prisoner.events.filter(
        (event) => event.id != activityId
      );

      // remove other attendance data
      if (prisoner.attendance) {
        let records = prisoner.attendance.records;
        let record;
        if (
          prisoner.attendance.activityId === activityId &&
          prisoner.attendance.date === date &&
          prisoner.attendance.period === period
        ) {
          record = records.reduce((mostRecentRecord, currentRecord) => {
            return new Date(
              currentRecord.timestamp.date + " " + currentRecord.timestamp.time
            ) >
              new Date(
                mostRecentRecord.timestamp.date +
                  " " +
                  mostRecentRecord.timestamp.time
              )
              ? currentRecord
              : mostRecentRecord;
          });
        } else {
          record = [];
        }
        prisoner.attendance = record;
      }
    });

    let notAttendedCount = countAttendance(
      req.session.data["attendance"],
      activityId,
      date,
      period,
      "not-attended"
    );
    let attendedCount = countAttendance(
      req.session.data["attendance"],
      activityId,
      date,
      period,
      "attended"
    );

    let nextSessionDate = getNextSession(activity, date, period);
    let previousSessionDate = getPreviousSession(activity, date, period);

    let day = new Date(date).getDay();
    let activitySchedule = activity.schedule.filter(
      (schedule) => schedule.day.toString() === day.toString()
    );
    let activityTimes = activitySchedule[0][period.toLowerCase()][0];

    let dateTense = checkDateTense(date);

    // remove the confirmation notification on refreshing the page
    if (req.session.data["attendance-confirmation"] == "true") {
      delete req.session.data["attendance-confirmation"];
    }
    // remove the session uncancellation confirmation on refreshing the page
    if (req.session.data["uncancellation-confirmation"] == "true") {
      delete req.session.data["uncancellation-confirmation"];
    }

    const checkIsCancellable = (date) => {
      const inputDate = new Date(date);
      const currentDate = new Date();

      inputDate.setHours(23);
      inputDate.setMinutes(59);

      const isSameDateOrFuture = inputDate >= currentDate;

      return isSameDateOrFuture;
    };
    let showCancelButton = checkIsCancellable(date);

    let attendanceLocked = false;
    // if the current date is in the past, set the attendance to locked
    if (dateTense === "past") {
      attendanceLocked = true;
    }

    res.render("unlock/" + req.version + "/attendance-list", {
      activity,
      attendanceLocked,
      day,
      date,
      dateTense,
      period,
      activityTimes,
      prisonersList,
      notAttendedCount,
      attendedCount,
      activityId,
      nextSessionDate,
      previousSessionDate,
      activitySchedule,
      showCancelButton,
    });
  }
);

router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId",
  function (req, res) {
    res.redirect("add-attendance-details");
  }
);

// Cancel a session - cancellation  details
router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/cancel",
  function (req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId
    );

    res.render("unlock/" + req.version + "/choose-cancellation-reason", {
      activity,
    });
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/cancel",
  function (req, res) {
    res.redirect("confirm-cancellation");
  }
);
router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/confirm-cancellation",
  function (req, res) {
    res.render("unlock/" + req.version + "/confirm-cancellation");
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/confirm-cancellation",
  function (req, res) {
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let activityId = req.params.activityId;

    if (req.session.data["confirm-cancellation"] == "yes") {
      let activity = req.session.data["timetable-complete-1"][
        "activities"
      ].find((activity) => activity.id.toString() === activityId);
      let day = new Date(date).getDay();
      let reason = req.session.data["cancellation-reason"];
      let activitySchedule = activity.schedule.find(
        (schedule) => schedule.day.toString() === day.toString()
      );

      if (!activitySchedule.cancelledSessions) {
        activitySchedule.cancelledSessions = [];
      }

      activitySchedule.cancelledSessions.push({ date, period, reason });

      let newActivities = req.session.data["timetable-complete-1"][
        "activities"
      ].filter((activity) => activity.id.toString() === activityId.toString());
      let prisonersData = req.session.data["timetable-complete-1"]["prisoners"];
      let prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(
        prisonersData,
        newActivities,
        date,
        period,
        "attendance"
      );

      // make an array of prisoners from the attendance details
      const getPrisonerIds = (array) => {
        const idArray = [];
        array.forEach((item) => {
          idArray.push(item.id);
        });
        return idArray;
      };

      let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(
        getPrisonerIds(prisonersByDateAndPeriod),
        {
          attendance: "not-attended",
          attendanceStatus: "session-cancelled",
          pay: true,
          caseNote: false,
          incentiveLevelWarning: false,
        }
      );

      Object.keys(attendanceDetails).forEach((prisonerId) => {
        const details = attendanceDetails[prisonerId];
        details.sessionCancelled = true;
        details.cancellationReason = reason;
        details["absence-reason"] = "session-cancelled";
      });
      updateAttendanceData(req, activityId, date, period, attendanceDetails);
    }

    res.redirect(
      "/unlock/" +
        req.version +
        "/activities/" +
        date +
        "/" +
        period +
        "/" +
        activityId
    );
  }
);

router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/confirm-uncancellation",
  function (req, res) {
    res.render("unlock/" + req.version + "/confirm-uncancellation");
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/confirm-uncancellation",
  function (req, res) {
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let activityId = req.params.activityId;
    let attendanceData = req.session.data["attendance"];
    let attendanceDataForActivity = attendanceData[activityId][date][period];

    // if user confirms uncancellation
    if (req.session.data["confirm-uncancellation"] == "yes") {
      // delete the prisoner attendance records for the cancelled session
      for (let prisonerId in attendanceDataForActivity) {
        if (attendanceDataForActivity.hasOwnProperty(prisonerId)) {
          delete attendanceDataForActivity[prisonerId];
        }
      }

      // remove the cancelled session from the activity schedule
      let activity = req.session.data["timetable-complete-1"][
        "activities"
      ].find((activity) => activity.id.toString() === activityId);
      let day = new Date(date).getDay();
      let activitySchedule = activity.schedule.find(
        (schedule) => schedule.day.toString() === day.toString()
      );

      //remove the last cancelled session from the activity schedule
      activitySchedule.cancelledSessions.pop();

      // show the uncancellation confirmation message
      req.session.data["uncancellation-confirmation"] = "true";
    }

    res.redirect(
      "/unlock/" +
        req.version +
        "/activities/" +
        date +
        "/" +
        period +
        "/" +
        activityId
    );
  }
);

// Add attendance details page
router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/add-attendance-details",
  function (req, res) {
    delete req.session.data["attendance-details"];
    let date = req.params.selectedDate;
    let filteredPrisoners = getFilteredPrisoners(
      req.session.data["selected-prisoners"],
      req.session.data["timetable-complete-1"]["prisoners"]
    );
    let dateTense = checkDateTense(req.params.selectedDate);

    const checkIsFutureDate = (date) => {
      const inputDate = new Date(date);
      const currentDate = new Date();

      // Check if input date is in the future
      const isFutureDate = inputDate > currentDate;

      // Return true if input date is in the future
      return isFutureDate;
    };

    // only show the search bar if the date is not in the future
    const showSearchBar = !checkIsFutureDate(date);

    let isFutureDate = checkIsFutureDate(date);

    res.render("unlock/" + req.version + "/add-attendance-details", {
      filteredPrisoners,
      dateTense,
      isFutureDate,
      showSearchBar
    });
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/add-attendance-details",
  function (req, res) {
    let selectedPrisoners = req.session.data["selected-prisoners"];
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let filteredPrisoners = getFilteredPrisoners(
      req.session.data["selected-prisoners"],
      prisoners
    );
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;

    let attendanceDetails = req.session.data["attendance-details"];

    updateAttendanceData(req, activityId, date, period, attendanceDetails);

    // set the confirmation dialog to display
    req.session.data["attendance-confirmation"] = "true";

    let referrer = req.session.data["attendance-url"];
    let url = referrer == "refusals" ? "refusals-list" : "../" + activityId;

    // redirect to a different URL if any of the prisoners have incentive level warnings
    Object.keys(attendanceDetails).forEach((prisonerId) => {
      const details = attendanceDetails[prisonerId];
      if (details["incentive-level-warning"] == "yes") {
        url = "check-print-incentive-level-warning";
      }
    });

    res.redirect(url);
  }
);

// check print warnings for incentive level warnings
router.get(
  [
    "/activities/:selectedDate/:selectedPeriod/:activityId/check-print-incentive-level-warning",
    "/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock/check-print-incentive-level-warning",
  ],
  function (req, res) {
    let attendanceDetails = req.session.data["attendance-details"];

    let prisonersWithWarnings = {};
    Object.keys(attendanceDetails).forEach((prisonerId) => {
      const details = attendanceDetails[prisonerId];
      if (details["incentive-level-warning"] == "yes") {
        prisonersWithWarnings[prisonerId] = details;
      }
    });

    res.render(
      "unlock/" + req.version + "/check-print-incentive-level-warning",
      {
        prisonersWithWarnings,
      }
    );
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/check-print-incentive-level-warning",
  function (req, res) {
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;

    if (req.session.data["print-incentive-level-warnings"] == "yes") {
      res.redirect("confirm-print-incentive-level-warning");
    } else {
      res.redirect(
        "/unlock/" +
          req.version +
          "/activities/" +
          date +
          "/" +
          period +
          "/" +
          activityId
      );
    }
  }
);

router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/confirm-print-incentive-level-warning",
  function (req, res) {
    res.render(
      "unlock/" + req.version + "/confirm-print-incentive-level-warning"
    );
  }
);

// refusals
router.get(
  "/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock/add-absence-details",
  function (req, res) {
    delete req.session.data["attendance-details"];
    let filteredPrisoners = getFilteredPrisoners(
      req.session.data["selected-prisoners"],
      req.session.data["timetable-complete-1"]["prisoners"]
    );

    let pageToRender;
    if (req.session.data["refusal-type"] == "sickness") {
      refusalPage = "add-sickness-details";
    } else if (req.session.data["refusal-type"] == "refused") {
      refusalPage = "add-refusal-details";
    } else {
      refusalPage = "add-other-absence-details";
    }
    res.render("unlock/" + req.version + "/" + refusalPage, {
      filteredPrisoners,
    });
  }
);
router.post(
  "/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock/add-absence-details",
  function (req, res) {
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let filteredPrisoners = getFilteredPrisoners(
      req.session.data["selected-prisoners"],
      prisoners
    );

    let date = req.params.selectedDate;
    let dateObject = new Date(date);

    let period = req.params.selectedPeriod;
    let periodWord = period === "AM" ? "morning" : "afternoon";

    let houseblock = req.params.selectedHouseblock;
    let attendanceDetails = req.session.data["attendance-details"];

    // get a list of all activities for the selected date
    let activitiesForDate = activitiesByDate(
      req.session.data["timetable-complete-1"]["activities"],
      dateObject
    );

    // for each prisoner in filteredPrisoners
    filteredPrisoners.forEach((prisoner) => {
      // and for each activity in each prisoner
      prisoner.activity.forEach((prisonerActivity) => {
        // get the activity detail
        let activity = activitiesForDate[periodWord].filter(
          (a) => a.id === prisonerActivity
        );
        let activityId;

        // if there's an activity and it has an ID, set it and update the prisoner's attendance for each activity
        if (activity[0] && activity[0].id) {
          activityId = activity[0].id;
          // console.log(attendanceDetails)
          updateAttendanceData(
            req,
            activityId,
            date,
            period,
            attendanceDetails
          );
        }
      });
    });

    let url = houseblock;

    // redirect to a different URL if any of the prisoners have incentive level warnings
    Object.keys(attendanceDetails).forEach((prisonerId) => {
      const details = attendanceDetails[prisonerId];
      if (details["incentive-level-warning"] == "yes") {
        url = houseblock + "/check-print-incentive-level-warning";
      }
    });

    res.redirect("../" + url);
  }
);
router.post(
  "/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock/check-print-incentive-level-warning",
  function (req, res) {
    let houseblock = req.params.selectedHouseblock;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;

    if (req.session.data["print-incentive-level-warnings"] == "yes") {
      res.redirect("confirm-print-incentive-level-warning");
    } else {
      res.redirect("../" + houseblock);
    }
  }
);

// attend and pay
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/attend-and-pay",
  function (req, res) {
    let selectedPrisoners = req.session.data["selected-prisoners"];
    let activityId = req.params.activityId;
    let period = req.params.selectedPeriod;
    let date = req.params.selectedDate;

    let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(
      selectedPrisoners,
      {
        attendance: "attended",
        attendanceStatus: "attended",
        pay: true,
        caseNote: false,
        incentiveLevelWarning: false,
      }
    );

    updateAttendanceData(req, activityId, date, period, attendanceDetails);

    req.session.data["attendance-confirmation"] = "true";
    res.redirect("../" + activityId);
  }
);

// check variable pay
router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/check-variable-pay",
  function (req, res) {
    let filteredPrisoners = getFilteredPrisoners(
      req.session.data["selected-prisoners"],
      req.session.data["timetable-complete-1"]["prisoners"]
    );

    res.render("unlock/" + req.version + "/check-variable-pay", {
      filteredPrisoners,
    });
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/check-variable-pay",
  function (req, res) {
    let selectedPrisoners = req.session.data["selected-prisoners"];
    let activityId = req.params.activityId;
    let period = req.params.selectedPeriod;
    let date = req.params.selectedDate;

    if (req.session.data["standard-pay-all"] == "no") {
      res.redirect("add-attendance-details");
    } else {
      let attendanceAction = req.session.data["attendance-action"];
      let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(
        selectedPrisoners,
        {
          attendance: "attended",
          attendanceStatus: "attended",
          pay: true,
          caseNote: false,
          incentiveLevelWarning: false,
        }
      );

      updateAttendanceData(req, activityId, date, period, attendanceDetails);

      req.session.data["attendance-confirmation"] = "true";
      res.redirect("../" + activityId);
    }
  }
);

// attendance  details
router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId",
  function (req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId
    );
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
      (prisoner) => prisoner.id === prisonerId
    );

    const attendanceData =
      req.session.data.attendance[activityId][date][period][prisonerId];

    res.render("unlock/" + req.version + "/attendance-details", {
      prisoner,
      date,
      period,
      activity,
      attendanceData,
    });
  }
);

router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId",
  function (req, res) {
    res.redirect(req.params.prisonerId + "/change");
  }
);
// ------------------------------------------------------------------------

router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-attendance",
  function (req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId
    );
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
      (prisoner) => prisoner.id === prisonerId
    );

    let attendanceData = req.session.data["attendance"];

    let prisonerAttendanceRecord =
      req.session.data.attendance[activityId][date][period][prisonerId][0];

    res.render("unlock/" + req.version + "/change-attendance", {
      prisoner,
      date,
      period,
      activityId,
      activity,
      prisonerAttendanceRecord,
    });
  }
);

router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-attendance",
  function (req, res) {
    let attendance = req.session.data["attendance-action"];

    if (attendance == "attended") {
      res.redirect("change-pay");
    } else if (attendance == "not-attended") {
      res.redirect("../add-attendance-details");
    } else if (attendance == "remove") {
      res.redirect("confirm-remove-attendance");
    }
  }
);
// ------------------------------------------------------------------------

router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/confirm-remove-attendance",
  function (req, res) {
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
      (prisoner) => prisoner.id === prisonerId
    );

    res.render("unlock/" + req.version + "/confirm-remove-attendance", {
      prisoner,
    });
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/confirm-remove-attendance",
  function (req, res) {
    let prisonerId = req.params.prisonerId;
    let attendanceData = req.session.data.attendance;
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let attendanceDataForActivity = attendanceData[activityId][date][period];

    for (let prisonerId in attendanceDataForActivity) {
      if (attendanceDataForActivity.hasOwnProperty(prisonerId)) {
        delete attendanceDataForActivity[prisonerId];
        break;
      }
    }

    res.redirect("../../" + req.params.activityId);
  }
);
// ------------------------------------------------------------------------

// confirm remove pay
router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/confirm-remove-pay",
  function (req, res) {
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
      (prisoner) => prisoner.id === prisonerId
    );

    res.render("unlock/" + req.version + "/confirm-remove-pay", {
      prisoner,
    });
  }
);
router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/confirm-remove-pay",
  function (req, res) {
    let prisonerId = req.params.prisonerId;
    let attendanceData = req.session.data.attendance;
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;

    if (req.session.data["confirm-remove-pay"] == "yes") {
      let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(
        [prisonerId],
        {
          attendance: "attended",
          pay: false,
          caseNote: req.session.data["case-note"],
          incentiveLevelWarning: false,
        }
      );
      updateAttendanceData(req, activityId, date, period, attendanceDetails);
    }

    res.redirect("../" + prisonerId);
  }
);
// ------------------------------------------------------------------------

router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-attendance-details",
  function (req, res) {
    let filteredPrisoners = getFilteredPrisoners(
      req.session.data["selected-prisoners"],
      req.session.data["timetable-complete-1"]["prisoners"]
    );

    res.render("unlock/" + req.version + "/add-attendance-details", {
      filteredPrisoners,
    });
  }
);

router.get(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-pay",
  function (req, res) {
    let activityId = req.params.activityId;
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId
    );
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
      (prisoner) => prisoner.id === prisonerId
    );

    res.render("unlock/" + req.version + "/change-pay", {
      prisoner,
      prisonerId,
      date,
      period,
      activityId,
      activity,
    });
  }
);

router.post(
  "/activities/:selectedDate/:selectedPeriod/:activityId/:prisonerId/change-pay",
  function (req, res) {
    let prisonerId = req.params.prisonerId;
    let attendanceData = req.session.data.attendance;
    let activityId = req.params.activityId;
    let date = req.params.selectedDate;
    let period = req.params.selectedPeriod;
    let attendanceDataForActivity = attendanceData[activityId][date][period];

    let pay;
    if (req.session.data["pay-prisoner"] != "yes") {
      pay = false;
    } else {
      pay = true;
    }
    let attendanceDetails = createAttendanceDetailsForMultiplePrisoners(
      [prisonerId],
      {
        attendance: "attended",
        attendanceStatus: "session-cancelled",
        pay: pay,
        caseNote: req.session.data["case-note"],
        incentiveLevelWarning: false,
      }
    );
    updateAttendanceData(req, activityId, date, period, attendanceDetails);

    // set the confirmation dialog to display
    req.session.data["attendance-confirmation"] = "true";

    res.redirect("../../" + req.params.activityId + "/" + prisonerId);
  }
);

// CHECK ATTENDANCE DETAILS
router.get("/check-attendance-details", function (req, res) {
  let attendanceDetails = req.session.data["attendance-details"];
  let filteredPrisoners = getFilteredPrisoners(
    req.session.data["selected-prisoners"],
    req.session.data["timetable-complete-1"]["prisoners"]
  );

  res.render("unlock/" + req.version + "/check-attendance-details", {
    attendanceDetails,
  });
});
router.post("/check-attendance-details", function (req, res) {
  res.redirect("attendance-confirmation");
});

// SELECT REFUSALS LOCATIONS
router.post("/select-refusals-locations", function (req, res) {
  let date = req.session.data["date"];
  let period = req.session.data["period"].toUpperCase();
  let locations = getWings(req.session.data["selected-locations"]);
  let houseblock = Object.keys(locations)[0];

  if (date == "other-date") {
    if (
      req.session.data["other-date-year"] !== undefined &&
      req.session.data["other-date-month"] !== undefined &&
      req.session.data["other-date-day"] !== undefined
    ) {
      date = req.session.data[
        "date"
      ] = `${req.session.data["other-date-year"]}-${req.session.data["other-date-month"]}-${req.session.data["other-date-day"]}`;
      res.redirect("refusals-list/" + date + "/" + period + "/" + houseblock);
    } else {
      res.redirect("select-refusals-locations");
    }
  } else {
    res.redirect("refusals-list/" + date + "/" + period + "/" + houseblock);
  }
});

// REFUSALS LIST
router.get(
  "/refusals-list/:selectedDate/:selectedPeriod/:selectedHouseblock",
  function (req, res) {
    let period = req.params.selectedPeriod;
    let date = req.params.selectedDate;
    let dayOfWeek = new Date(date).getDay();

    let activities = req.session.data["timetable-complete-1"]["activities"];
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let locations = getWings(req.session.data["selected-locations"]);
    let houseblock = req.params.selectedHouseblock;

    let attendanceData = req.session.data["attendance"];

    const prisonersByHouseblock = getPrisonersByHouseblock(
      prisoners,
      houseblock
    );
    const prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(
      prisonersByHouseblock,
      activities,
      date,
      period,
      "unlock"
    );
    let prisonersWithEvents = addEventsToPrisoners(
      prisonersByDateAndPeriod,
      activities,
      date,
      period,
      attendanceData
    );

    // add attendance data to prisoners from attendanceData
    activities.forEach((activity) => {
        // then check if there is attendance data for this activity
        if (attendanceData && attendanceData[activity.id]) {
          // then loop through prisoners in prisonersWithEvents
          prisonersWithEvents.forEach((prisoner) => {
          // add attendance data for this activity to the prisoner, if it exists
          if (attendanceData[activity.id][date] && attendanceData[activity.id][date][period] && attendanceData[activity.id][date][period][prisoner.id] && attendanceData[activity.id][date][period][prisoner.id].length) {
            // check if we've already added attendance data for this prisoner, if not, create an empty array
            if (!prisoner.attendance) {
              prisoner.attendance = [];
            }
            // get the last record for this prisoner
            let lastRecord = attendanceData[activity.id][date][period][prisoner.id][attendanceData[activity.id][date][period][prisoner.id].length - 1];
            prisoner.attendance.push(lastRecord);
          }
        });
      }
    });

    // remove the confirmation notification on loading the page
    if (req.session.data["attendance-confirmation"] == "true") {
      delete req.session.data["attendance-confirmation"];
    }

    //landing filters
    if (
      req.session.data["filters"] &&
      req.session.data["filters"]["landings"]
    ) {
      let landings = req.session.data["filters"]["landings"];

      const removeLanding = req.query["remove-landing"];
      if (removeLanding) {
        landings = landings.filter((landing) => landing !== removeLanding);
        if (landings.length === 0) {
          delete req.session.data["filters"]["landings"];
        } else {
          req.session.data["filters"]["landings"] = landings;
        }
        delete req.query["remove-landing"];
      }

      if (landings !== "_unchecked" && landings.length > 0) {
        landings = landings.map((landing) => landing.toString());
        prisonersWithEvents = prisonersWithEvents.filter((prisoner) =>
          landings.includes(prisoner.location.landing.toString())
        );
      }
    }

    res.render("unlock/" + req.version + "/refusals-list", {
      locations,
      prisonersWithEvents,
      prisonersByHouseblock,
      date,
      period,
      houseblock,
    });
  }
);



// SELECT-ACTIVITY
router.get("/select-activity", function (req, res) {
  res.render("unlock/" + req.version + "/select-activity");
});
router.post("/select-activity", function (req, res) {
  let date = req.session.data["date"];

  if (date == "other-date") {
    if (
      req.session.data["other-date-year"] !== undefined &&
      req.session.data["other-date-month"] !== undefined &&
      req.session.data["other-date-day"] !== undefined
    ) {
      date = req.session.data[
        "date"
      ] = `${req.session.data["other-date-year"]}-${req.session.data["other-date-month"]}-${req.session.data["other-date-day"]}`;
      res.redirect("activities/" + date);
    } else {
      res.redirect("select-activity");
    }
  } else {
    res.redirect("activities/" + date);
  }
});

// PAGE: Activity selection page
// TAGS: List of activities, activity list, schedule page
router.get("/activities/:selectedDate", function (req, res) {
  let selectedDate = req.params.selectedDate;
  let period = req.session.data["times"].toUpperCase();
  let date = new Date(selectedDate);
  let activitiesForDate = activitiesByDate(
    req.session.data["timetable-complete-1"]["activities"],
    date
  );

  if (selectedDate == "other-date") {
    selectedDate = `${req.session.data["other-date-year"]}-${req.session.data["other-date-month"]}-${req.session.data["other-date-day"]}`;
  }

  let relativeDate;
  let today = DateTime.local().startOf("day");
  let dateLuxon = DateTime.fromFormat(selectedDate, "yyyy-MM-dd").startOf(
    "day"
  );
  let diff = Math.abs(today.diff(dateLuxon, "days").days);
  if (diff <= 1) {
    relativeDate = dateLuxon.toRelativeCalendar();
  }

  let activitiesForDateWithCounts = {
    morning: [],
    afternoon: [],
  };
  activitiesForDateWithCounts.morning = addAttendanceCountsToActivities(
    activitiesForDate.morning,
    req.session.data["attendance"],
    date,
    req.session.data["timetable-complete-1"]["prisoners"]
  );
  activitiesForDateWithCounts.afternoon = addAttendanceCountsToActivities(
    activitiesForDate.afternoon,
    req.session.data["attendance"],
    date,
    req.session.data["timetable-complete-1"]["prisoners"]
  );

  // search functionality
  if (req.query.search) {
    const searchTerm = req.query.search.toLowerCase().replace(/\s/g, "");
    activitiesForDate.morning = activitiesForDate.morning.filter((activity) =>
      activity.name.toLowerCase().replace(/\s/g, "").includes(searchTerm)
    );
    activitiesForDate.afternoon = activitiesForDate.afternoon.filter(
      (activity) =>
        activity.name.toLowerCase().replace(/\s/g, "").includes(searchTerm)
    );
  }

  let locations = [];

  // attendance totals
  // (not used any more)
  let attendanceTotals = {};
  for (const period in activitiesForDate) {
    attendanceTotals[period] = attendanceTotals[period] || {};
    for (const activity of activitiesForDate[period]) {
      for (const type in activity.attendanceCount[period]) {
        attendanceTotals[period][type] =
          (attendanceTotals[period][type] || 0) +
          (activity.attendanceCount[period][type] > 0
            ? activity.attendanceCount[period][type]
            : 0);
      }
    }
  }

  res.render("unlock/" + req.version + "/activities", {
    locations,
    attendanceTotals,
    selectedDate,
    relativeDate,
    activitiesForDate,
    activitiesForDateWithCounts,
  });
});

// prisoner profile
router.get("/prisoner/:prisonerId", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id === prisonerId
  );

  res.render("unlock/" + req.version + "/prisoner-profile", {
    prisoner,
  });
});

// attendance-dashboard journey routes
router.use("/attendance-dashboard", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./attendance-dashboard/routes")(req, res, next);
});

// create-movement-list journey routes
router.use("/create-movement-list", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./create-movement-list/routes")(req, res, next);
});

// create-unlock-list journey routes
router.use("/create-unlock-list", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./create-unlock-list/routes")(req, res, next);
});

module.exports = router;
