const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

router.get("/", function (req, res) {
  let date = new Date().toISOString().slice(0, 10);
  res.redirect("attendance-dashboard/" + date + "/daily");
});

// generate data success page
router.get("/generate-data-success", function (req, res) {
  // sum all records in attendance data
  let attendanceData = req.session.data["attendance"];
  let attendanceDataCount = 0;
  for (const activity in attendanceData) {
    for (const date in attendanceData[activity]) {
      for (const period in attendanceData[activity][date]) {
        for (const prisoner in attendanceData[activity][date][period]) {
          attendanceDataCount++;
        }
      }
    }
  }
  res.render("unlock/version-7/attendance-dashboard/generate-data-success", {
    attendanceDataCount: attendanceDataCount,
  });
});


// PAGE: Activity dashboard
router.get("/:selectedDate/:selectedPeriod", function (req, res) {
  let attendanceData = req.session.data["attendance-data-1"];
  let date = req.params.selectedDate;
  let dateString = new Date(date);
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let period = req.params.selectedPeriod;

  let activitiesForDate = activitiesByDate(
    req.session.data["timetable-complete-1"]["activities"],
    dateString
  );

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

  function calculateAttendanceFigures(data, period, date) {
    let totalAllocated;

    if (period == "AM" || period == "Morning" || period == "morning") {
      totalAllocated = attendanceTotals.morning["scheduled"];
      period = "AM";
    } else if (
      period == "PM" ||
      period == "Afternoon" ||
      period == "afternoon"
    ) {
      totalAllocated = attendanceTotals.afternoon["scheduled"];
      period = "PM";
    } else if (period == "daily" || period == "Daily") {
      totalAllocated =
        attendanceTotals.morning["scheduled"] +
        attendanceTotals.afternoon["scheduled"];
      period = "daily";
    } else {
      throw new Error("Invalid period input");
    }

    const attendanceCounts = {
      allocated: totalAllocated,
      attended: 0,
      "not-attended": 0,
      "not-recorded": totalAllocated,
      absences: {
        "with-pay": {
          total: 0,
        },
        "without-pay": {
          total: 0,
        },
      },
      "sessions-cancelled": 0,
    };

    if (data) {
      Object.values(data).forEach((activity) => {
        if (activity[date]) {
          const periodData =
            period === "daily"
              ? (activity[date].AM
                  ? Object.values(activity[date].AM)
                  : []
                ).concat(
                  activity[date].PM ? Object.values(activity[date].PM) : []
                )
              : activity[date][period]
              ? Object.values(activity[date][period])
              : [];
          periodData.forEach((prisonerRecord) => {
            const record = prisonerRecord[prisonerRecord.length - 1];
            const attendanceType = record.attendance;
            const attendanceStatus = record.attendanceStatus || "not-recorded";
            const payStatus = record.pay;
            const sessionCancelled = record.sessionCancelled;

            if (attendanceType === "attended") {
              attendanceCounts.attended++;
              attendanceCounts["not-recorded"]--;
            } else if (attendanceType === "not-attended") {
              attendanceCounts["not-attended"]++;
              if (payStatus == true) {
                attendanceCounts.absences["with-pay"].total++;
                attendanceCounts.absences["with-pay"][attendanceStatus] =
                  (attendanceCounts.absences["with-pay"][attendanceStatus] ||
                    0) + 1;
              } else {
                attendanceCounts.absences["without-pay"].total++;
                attendanceCounts.absences["without-pay"][attendanceStatus] =
                  (attendanceCounts.absences["without-pay"][attendanceStatus] ||
                    0) + 1;
              }
              attendanceCounts["not-recorded"]--;
            } else {
              attendanceCounts["not-recorded"]++;
            }

            if (sessionCancelled == true) {
              attendanceCounts["sessions-cancelled"]++;
            }
          });
        }
      });
    }

    return attendanceCounts;
  }

  let counts = calculateAttendanceFigures(
    req.session.data["attendance"],
    period,
    date
  );
  let timeOfDay =
    period === "AM" ? "Morning" : period === "PM" ? "Afternoon" : "Daily";

  // count the number of cancelledSessions for each activity in each period on the selected date
  for (const period in activitiesForDate) {
    let cancelledSessionsCount = 0;
    activitiesForDate[period].forEach((activity) => {
      // if the activity has a cancelledSessions property and it is not null or undefined and has a length greater than 0
      if (
        activity.cancelledSessions &&
        activity.cancelledSessions !== null &&
        Object.keys(activity.cancelledSessions).length > 0
      ) {
        // check the date of each cancelled session to see if it matches the selected date
        activity.cancelledSessions.forEach((cancelledSession) => {
          if (cancelledSession.date === date) {
            // if it matches, increment the cancelledSessionsCount
            cancelledSessionsCount++;
          }
        });
      }
    });
    // add the cancelledSessionsCount to the attendanceTotals object
    attendanceTotals[period]["sessions-cancelled"] = cancelledSessionsCount;
  }

  let activityCount = 0;
  switch (period) {
    case "AM":
      activityCount = activitiesForDate.morning.length;
      break;
    case "PM":
      activityCount = activitiesForDate.afternoon.length;
      break;
    case "daily":
      activityCount =
        activitiesForDate.morning.length + activitiesForDate.afternoon.length;
      break;
    default:
      throw new Error("Invalid period input");
  }

  res.render(req.protoUrl + "/attendance-dashboard", {
    date,
    dateString,
    activityCount,
    attendanceTotals,
    activitiesForDate,
    activitiesForDateWithCounts,
    counts,
    period,
    timeOfDay,
  });
});

// PAGE: Attendances list
// DESCRIPTION: This page shows a list of prisoners who have attended any activity on the selected date and period
router.get("/:date/:period/attendances", (req, res) => {
  const date = req.params.date;
  const period = req.params.period;

  // get a list of prisoners who have attended any activity on the selected date and period
  let attendanceData = req.session.data["attendance"];
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let attendanceList = getPrisonerList(
    activities,
    attendanceData,
    date,
    period,
    (attendanceStatus = "attended")
  );

  res.render(req.protoUrl + "/prisoners-list", {
    date,
    period,
    attendanceList,
  });
});

// PAGE: Attendances list
// DESCRIPTION: This page shows a list of prisoners who have attended any activity on the selected date and period
router.get("/:date/:period/absences", (req, res) => {
  const date = req.params.date;
  const period = req.params.period;

  // get a list of prisoners who have attended any activity on the selected date and period
  let attendanceData = req.session.data["attendance"];
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let attendanceList = getPrisonerList(
    activities,
    attendanceData,
    date,
    period,
    (attendanceStatus = "not-attended")
  );

  res.render(req.protoUrl + "/prisoners-list", {
    date,
    period,
    attendanceList,
  });
});

// PAGE: Sessions cancelled list
router.get("/:date/:period/sessions-cancelled", (req, res) => {
  const date = req.params.date;
  const period = req.params.period;

  //get a list of cancelled sessions for the selected date and period
  let cancelledSessions = [];
  let activities = req.session.data["timetable-complete-1"]["activities"];
  activities.forEach((activity) => {
    // for each day (0-6) check for cancelled sessions
    // also check the date of each cancelled session to see if it matches the selected date
    activity.schedule.forEach((schedule) => {
      if (schedule.cancelledSessions) {
        schedule.cancelledSessions.forEach((cancelledSession) => {
          // if the period is 'daily' a cancelled session for either period should be added to the list
          // otherwise only add the cancelled session if it matches the selected period
          // we should make sure we're including the correct period in the cancelled session object
          if (
            cancelledSession.date === date &&
            (period === "daily" || cancelledSession.period === period)
          ) {
            cancelledSessions.push({
              activity: activity.id,
              date: cancelledSession.date,
              period: cancelledSession.period,
            });
          }
        });
      }
    });
  });

  res.render(req.protoUrl + "/sessions-cancelled", {
    date,
    period,
    cancelledSessions,
  });
});

// generate random attendance data for the last 14 days
// using a get request to /generate-data will overwrite the existing attendance data
router.get("/generate-data", (req, res) => {
  let attendanceData = createHistoricAttendanceData(
    req.session.data["timetable-complete-1"]["activities"],
    7,
    req.session.data["timetable-complete-1"]["prisoners"]
  );
  req.session.data["attendance"] = attendanceData;
  res.redirect("generate-data-success");
});

module.exports = router;

// =================
// Helper functions
// =================

// a function to create a load of random attendance data
const createHistoricAttendanceData = (
  activities,
  numberOfDays,
  prisonersData
) => {
  let attendanceData = {};
  let prisoners = prisonersData;
  let periods = ["AM", "PM"];

  // create a list of dates for the last numberOfDays
  let dates = [];
  for (let i = 0; i < numberOfDays; i++) {
    let date = new Date();
    date.setDate(date.getDate() - i - 1);
    dates.push(date);
  }

  // for each activity, create a list of attendance data
  activities.forEach((activity) => {
    // for each date, create a list of attendance data for each activity
    dates.forEach((date) => {
      // for each period, create a list of attendance data for each activity
      periods.forEach((period) => {
        // for each prisoner, create a random attendance record for each activity
        prisoners.forEach((prisoner) => {
          // create an attendance record object
          let attendanceRecord = {
            attendance: "", // "attended" or "not-attended"
            attendanceStatus: "", // "refused"
            pay: "", // true or false
            sessionCancelled: "", // true or false
            incentiveLevelWarning: "", // true or false
            caseNote: "", // true or false
            timestamp: {
              date: date.toISOString().slice(0, 10), // "2020-01-01"
              time: "20:46:04", // "20:46:04"
            },
          };

          attendanceRecord.attendance =
            Math.random() < 0.96 ? "attended" : "not-attended"; //shorthand to decide if prisoner attended

            // if the prisoner attended, decide if they got paid
            if (attendanceRecord.attendance === "attended") {
              attendanceRecord.pay = Math.random() < 0.9 ? true : false;

              // if they attended but weren't paid, add a case note
              if (attendanceRecord.pay === false) {
                attendanceRecord.caseNote = "The prisoner was misbehaving";
              }
            }

          // if the prisoner did not attend, decide if they refused
          if (attendanceRecord.attendance === "not-attended") {
            function assignRandomStatus() {
              let statusesAndProbabilities = [
                ["refused", 0.5],
                ["sick", 0.4],
                ["rest-day", 0.2],
                ["other", 0.1],
                ["not-required", 0.1],
                ["clash", 0.05]
              ];
              
              const total = statusesAndProbabilities.reduce((acc, cur) => acc + cur[1], 0);
              let random = Math.random() * total;
              let status = statusesAndProbabilities.find(([, probability]) => {
                random -= probability;
                return random <= 0;
              }
              );
              return status[0];
            }

            attendanceRecord.attendanceStatus = assignRandomStatus();
            
            switch (attendanceRecord.attendanceStatus) {
              // If the prisoner is sick, on a rest day, or for some other reason and pay is required, set pay to true, otherwise false
              case "sick":
              case "rest-day":
              case "other":
                // set pay to true
                attendanceRecord.pay = true;
                break;
        
              // If the prisoner refused to work or the work is not required, set pay to false
              case "refused":
              case "not-required":
                attendanceRecord.pay = false;
                break;
        
              // If there's a clash or payment is required, set pay to true
              case "clash":
                attendanceRecord.pay = true;
                break;
            }
          }

          // if the prisoner refused, decide if they have an incentive level warning
          if (attendanceRecord.attendanceStatus === "refused") {
            attendanceRecord.incentiveLevelWarning =
              Math.random() < 0.8 ? 'yes' : 'no';
          }
          // if the prisoner refused add a case note
          if (attendanceRecord.attendanceStatus === "refused") {
            // don't pay prisoners who refused
            attendanceRecord.pay = false;
            attendanceRecord.caseNote = "Refused to attend for no good reason";
          }

          // add the attendance record object to attendanceData but only if the prisoner has an activity array and the array contains the activity id
          if (
            prisoner.activity &&
            prisoner.activity.includes(parseInt(activity.id))
          ) {
            if (!attendanceData[parseInt(activity.id)]) {
              attendanceData[parseInt(activity.id)] = {};
            }
            if (
              !attendanceData[parseInt(activity.id)][
                date.toISOString().slice(0, 10)
              ]
            ) {
              attendanceData[parseInt(activity.id)][
                date.toISOString().slice(0, 10)
              ] = {};
            }
            if (
              !attendanceData[parseInt(activity.id)][
                date.toISOString().slice(0, 10)
              ][period]
            ) {
              attendanceData[parseInt(activity.id)][
                date.toISOString().slice(0, 10)
              ][period] = {};
            }
            if (
              !attendanceData[parseInt(activity.id)][
                date.toISOString().slice(0, 10)
              ][period][prisoner.id]
            ) {
              attendanceData[parseInt(activity.id)][
                date.toISOString().slice(0, 10)
              ][period][prisoner.id] = [];
            }
            attendanceData[parseInt(activity.id)][
              date.toISOString().slice(0, 10)
            ][period][prisoner.id].push(attendanceRecord);
          }
        });
      });
    });
  });

  // if the activity is not scheduled to run on a given day/period combination, remove the attendance data for that day/period for that activity
  // days of the week are 0-6, 0 is Sunday
  // activity.schedule is an array of objects with a day, am and pm property
  activities.forEach((activity) => {
    dates.forEach((date) => {
      periods.forEach((period) => {
        let scheduled = false;
        activity.schedule.forEach((schedule) => {
          if (
            schedule.day === date.getDay() &&
            schedule[period.toLowerCase()] != null
          ) {
            console.log(
              schedule.day,
              date.getDay(),
              schedule[period.toLowerCase()]
            );
            scheduled = true;
          }
        });
        if (!scheduled) {
          if (
            attendanceData[parseInt(activity.id)] &&
            attendanceData[parseInt(activity.id)][
              date.toISOString().slice(0, 10)
            ] &&
            attendanceData[parseInt(activity.id)][
              date.toISOString().slice(0, 10)
            ][period]
          ) {
            delete attendanceData[parseInt(activity.id)][
              date.toISOString().slice(0, 10)
            ][period];
          }
        }
      });
    });
  });

  // // do a final sweep of attendanceData to remove any empty arrays and objects
  // // this is to make the data not break the prototype
  // for (const activity in attendanceData) {
  //   for (const date in attendanceData[activity]) {
  //     for (const period in attendanceData[activity][date]) {
  //       if (attendanceData[activity][date][period].length === 0) {
  //         delete attendanceData[activity][date][period];
  //       }
  //     }
  //     if (Object.keys(attendanceData[activity][date]).length === 0) {
  //       delete attendanceData[activity][date];
  //     }
  //   }
  //   if (Object.keys(attendanceData[activity]).length === 0) {
  //     delete attendanceData[activity];
  //   }
  // }

  return attendanceData;
};

// get activities for a given date
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

// add attendance counts to activities
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
function getPrisonerList(
  activities,
  attendanceData,
  date,
  period,
  attendanceStatus
) {
  // create an empty array to store the prisoner list
  let prisonerList = [];

  // for each activity in the list of activities we passed in
  activities.forEach((activity) => {
    let activityId = activity.id;
    // if there is attendance data for the activity on the selected date and period
    // if the period is daily, we need to check both morning and afternoon periods
    if (
      attendanceData &&
      attendanceData[activityId] &&
      attendanceData[activityId][date] &&
      (period === "daily"
        ? attendanceData[activityId][date].AM ||
          attendanceData[activityId][date].PM
        : attendanceData[activityId][date][period])
    ) {
      // get the attendance data for the selected period
      let attendancePeriod =
        period === "daily"
          ? attendanceData[activityId][date].AM
            ? attendanceData[activityId][date].AM
            : attendanceData[activityId][date].PM
          : attendanceData[activityId][date][period];
      // for each prisoner in the attendance data
      Object.keys(attendancePeriod).forEach((prisonerId) => {
        // get the last attendance record for the prisoner
        let attendanceRecord =
          attendancePeriod[prisonerId][attendancePeriod[prisonerId].length - 1];
        // if the attendance type is 'attended'
        // add the prisoner, activity id, date, time, period and pay to the prisoner list
        // and also the attendance data for the prisoner
        if (attendanceRecord.attendance === attendanceStatus) {
          prisonerList.push({
            prisonerId: prisonerId,
            activityId: activityId,
            date: date,
            time: attendanceRecord.time,
            period: period,
            pay: activity.pay,
            attendanceRecord,
          });
        }
        console.log(prisonerId, attendanceRecord);
      });
    }
  });

  // return the prisoner list
  return prisonerList;
}
