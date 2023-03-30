const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

//redirect the root url to the start page
router.get("/", function (req, res) {
  res.redirect("create-movement-list/select-date");
});

// CONFIG
router.get("/config", function (req, res) {
  let version = req.version;
  req.session.data["config"]["navigation-tiles"][0]["linkURL"] =
    "/unlock/" + version + "/whereabouts";
  res.render("unlock/" + req.version + "/config", {
    version,
  });
});
router.post("/config", function (req, res) {
  res.redirect("dps-home");
});

router.post("/reset-config", function (req, res) {
  delete req.session.data["config"];
  res.redirect("config");
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
      // If the prisoner is sick, on a rest day, or for some other reason and pay is required, set pay to true, otherwise false
      case "sick":
      case "rest-day":
      case "other":
        details.pay = details["pay-prisoner"] == "yes";
        break;

      // If the prisoner refused to work or the work is not required, set pay to false
      case "refused":
      case "not-required":
        details.pay = false;
        break;

      // If there's a clash or payment is required, set pay to true
      case "clash":
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

// PAGE: Select movement location
router.get("/select-location", function (req, res) {
  // get a list of the activities happening on the selected date
  let date = req.query.date;
  let dateString = new Date(date);
  let period = req.query.period.toUpperCase();
  let activitiesForDate = activitiesByDate(
    req.session.data["timetable-complete-1"]["activities"],
    dateString
  );

  // filter the activities to only include those that are happening for the selected period
  // first, we need to convert the period from am/pm to either morning or afternoon
  if (period.toLowerCase() == "am") {
    period = "morning";
  } else if (period.toLowerCase() == "pm") {
    period = "afternoon";
  }
  let activitiesForPeriod = activitiesForDate[period.toLowerCase()];

  // get a list of the locations that are used in the activities for the selected period
  let locations = [];
  for (const activity of activitiesForPeriod) {
    if (!locations.includes(activity.location)) {
      locations.push(activity.location);
    }
  }

  res.render("unlock/" + req.version + "/select-movement-location", {
    locations,
    date,
  });
});

// PAGE: Select movement date
router.get("/select-date", function (req, res) {
  res.render(req.protoUrl + "/select-date");
});
// LOGIC: Select movement date
router.post("/select-date", function (req, res) {
  let date = req.session.data["movement-date"];
  let period = req.session.data["movement-period"].toUpperCase();

  // redirect to url with params for date and period
  res.redirect(date + "/" + period);
});

// PAGE: Movement locations
router.get("/:date/:period", function (req, res) {
  // get a list of the activities happening on the selected date
  let date = req.params.date;
  let dateString = new Date(date);
  let period = req.params.period;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activitiesForDate = activitiesByDate(activities, dateString);

  // filter the activities to only include those that are happening for the selected period
  // first, we need to convert the period from am/pm to either morning or afternoon
  if (period.toLowerCase() == "am") {
    timeOfDay = "morning";
  } else if (period.toLowerCase() == "pm") {
    timeOfDay = "afternoon";
  }
  let activitiesForPeriod = activitiesForDate[timeOfDay.toLowerCase()];

  // get a list of the locations that are used in the activities for the selected period
  let locations = [];
  for (const activity of activitiesForPeriod) {
    // create a location object structured like:
    // { name: "location name", activities: [2, 32] } where the activities array contains the activity IDs
    let location = locations.find((l) => l.name == activity.location);
    if (!location) {
      // if the location doesn't exist, create it
      location = {
        name: activity.location,
        activities: [],
        prisoners: 0,
      };
      locations.push(location);
    }

    // add the activity name and id to the location's activities array as an object
    location.activities.push({
      name: activity.name,
      id: activity.id,
    });
    location.activityIds = location.activities.map((a) => a.id);
  }
  // for each location return the number of prisoners who have the activity id in their activity array
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  for (const location of locations) {
    for (const prisoner of prisoners) {
      for (const activity of location.activities) {
        // check prisoner.activity exists and if it does but only contains one item, convert it to an array
        if (prisoner.activity && !Array.isArray(prisoner.activity)) {
          prisoner.activity = [prisoner.activity];
        }
        if (prisoner.activity && prisoner.activity.includes(activity.id)) {
          location.prisoners++;
        }
      }
    }
  }

  // add 3 locations to the end of the list for testing appointments e.g. counselling room, therapy room etc.
  // prisoners should be random
  for (let i = 0; i < 3; i++) {    
    let activitiesCount = Math.floor(Math.random() * 3) + 1;
    let activities = [];

    for (let j = 0; j < activitiesCount; j++) {
      let appointmentCategory = req.session.data['appointment-categories-1'][Math.floor(Math.random() * req.session.data['appointment-categories-1'].length)];

      activities.push({
        name: appointmentCategory,
        id: 9999 + i,
      });
    }

    let location = {
      name: "Appointment room " + (i + 1),
      activities,
      prisoners: activitiesCount,
    };
    locations.push(location);
  }

  res.render(req.protoUrl + "/locations", {
    locations,
    date,
    period,
  });
});

// PAGE: Movement list
router.get("/:date/:period/:activities", function (req, res) {
  let date = req.params.date;
  let period = req.params.period;

  // get a list of prisoners attending the activities listed in the activities query param
  let activities = req.params.activities.split(",");
  // convert the activities array to numbers
  activities = activities.map((a) => parseInt(a));

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersForActivities = [];
  for (const prisoner of prisoners) {
    // check prisoner.activity exists and if it does but only contains one item, convert it to an array
    if (prisoner.activity && !Array.isArray(prisoner.activity)) {
      prisoner.activity = [prisoner.activity];
    }
    if (
      prisoner.activity &&
      prisoner.activity.some((a) => activities.includes(a))
    ) {
      prisonersForActivities.push(prisoner);
    }
  }

  // update the prisonersForActivities array to include the activity name
  // it should only include the activity name if the activity.id is in the activities array
  for (const prisoner of prisonersForActivities) {
    // for each activity in the activities array, get the activity details from the main activities data in timetable-complete-1
    let prisonerActivities = [];
    for (const activity of activities) {
      let activityData = req.session.data["timetable-complete-1"][
        "activities"
      ].find((a) => a.id == activity);
      // only add the activity data if the prisoner has the activity id in their activity array
      if (prisoner.activity && prisoner.activity.includes(activity)) {
        // only include the activity.schedule data for the selected weekday number and period (AM/PM)
        let day = new Date(date).getDay();
        let activitySchedule = activityData.schedule.filter(
          (schedule) => schedule.day.toString() === day.toString()
        );
        let activityTimes = activitySchedule[0][period.toLowerCase()][0];
        prisonerActivities.push({
          name: activityData.name,
          times: activityTimes,
          id: activity,
        });
      }
    }
    prisoner.movementData = prisonerActivities;
  }

  // add prisoner attendance data to the prisonersForActivities array from the prisoners array
  let attendanceData = req.session.data["attendance"];
  for (const prisoner of prisonersForActivities) {
    // check each activity id in the activities array
    for (const activity of activities) {
      // make sure attendance data exists
      // and that it also exists for the activityId, date, period and prisoner
      if (
        attendanceData &&
        attendanceData[activity] &&
        attendanceData[activity][date] &&
        attendanceData[activity][date][period] &&
        attendanceData[activity][date][period][prisoner.id]
      ) {
        // if the attendance data exists, add the last attendance record in the array to the prisoner object
        let attendance = attendanceData[activity][date][period][prisoner.id];
        prisoner.attendance = attendance[attendance.length - 1];
      }
    }
  }

  // create a list of unique sub-locations based on the location properties of each prisoner in prisonersWithEvents
  // residentialLocations should be an array of unique landing numbers, e.g. [1,2,3]
  let houseblocks = [];
  prisonersForActivities.forEach((prisoner) => {
    if (
      !houseblocks.includes(prisoner.location.houseblock) &&
      prisoner.location.houseblock !== undefined
    ) {
      houseblocks.push(prisoner.location.houseblock);
    }
  });

  // randomly select 3 prisoners from the timetable data
  // add them to the end of the prisonersForActivities array with some random appointment times
  let randomPrisoners = [];
  for (let i = 0; i < 3; i++) {
    let randomPrisoner =
      prisoners[Math.floor(Math.random() * prisoners.length)];
    randomPrisoner.movementData = [
      {
        name: "Counselling",
        times: {
          startTime: "10:00",
          endTime: "11:00",
        },
        appointment: true,
        id: 999,
      },
    ];
    randomPrisoners.push(randomPrisoner);
  }
  prisonersForActivities = prisonersForActivities.concat(randomPrisoners);

  res.render(req.protoUrl + "/movement-list", {
    prisonersForActivities,
    date,
    houseblocks,
    period,
  });
});

module.exports = router;
