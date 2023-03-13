const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

router.get("/", function (req, res) {
  let date = new Date().toISOString().slice(0, 10);
  res.redirect("attendance-dashboard/" + date + "/daily");
});

// PAGE: Activity dashboard
router.get("/:selectedDate/:selectedPeriod",
  function (req, res) {
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
              const attendanceStatus =
                record.attendanceStatus || "not-recorded";
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
                    (attendanceCounts.absences["without-pay"][
                      attendanceStatus
                    ] || 0) + 1;
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
    let timeOfDay = period === "AM" ? "Morning" : period === "PM" ? "Afternoon" : "Daily";

    // count the number of cancelledSessions for each activity in each period on the selected date
    for (const period in activitiesForDate) {
        let cancelledSessionsCount = 0;
        activitiesForDate[period].forEach((activity) => {
            // if the activity has a cancelledSessions property and it is not null or undefined and has a length greater than 0
            if (activity.cancelledSessions && activity.cancelledSessions !== null && Object.keys(activity.cancelledSessions).length > 0) {
                // check the date of each cancelled session to see if it matches the selected date
                activity.cancelledSessions.forEach((cancelledSession) => {
                    if (cancelledSession.date === date) {
                        // if it matches, increment the cancelledSessionsCount
                        cancelledSessionsCount++;
                    }
                })
            }
        })
        // add the cancelledSessionsCount to the attendanceTotals object
        attendanceTotals[period]["sessions-cancelled"] = cancelledSessionsCount;
    }

    res.render(req.protoUrl + "/attendance-dashboard", {
      date,
      dateString,
      attendanceTotals,
      activitiesForDate,
      activitiesForDateWithCounts,
      counts,
      period,
      timeOfDay,
    });
  }
);

// PAGE: Attendances list
// DESCRIPTION: This page shows a list of prisoners who have attended any activity on the selected date and period
router.get("/:date/:period/attendances", (req, res) => {
  const date = req.params.date;
  const period = req.params.period;

  // get a list of prisoners who have attended any activity on the selected date and period 
  let attendanceData = req.session.data['attendance'];
  let attendanceList = [];
  let activities = req.session.data["timetable-complete-1"]["activities"];
  
  // for each activity
  activities.forEach((activity) => {
    let activityId = activity.id;
    // if there is attendance data for the activity on the selected date and period
    // if the period is daily, we need to check both morning and afternoon periods
    if (attendanceData && attendanceData[activityId] && attendanceData[activityId][date] && (period === "daily" ? (attendanceData[activityId][date].AM || attendanceData[activityId][date].PM) : attendanceData[activityId][date][period])){
      // get the attendance data for the selected period
      let attendancePeriod = period === "daily" ? (attendanceData[activityId][date].AM ? attendanceData[activityId][date].AM : attendanceData[activityId][date].PM) : attendanceData[activityId][date][period];
      // for each prisoner in the attendance data
      Object.keys(attendancePeriod).forEach((prisonerId) => {
        // get the last attendance record for the prisoner
        let attendanceRecord = attendancePeriod[prisonerId][attendancePeriod[prisonerId].length - 1];
        // if the attendance type is 'attended'
        if (attendanceRecord.attendance === "attended") {
          attendanceList.push({
            prisonerId,
            activityId: activity.id,
            date: date,
            time: attendanceRecord.timestamp.time.slice(0, 5),
            period: attendanceRecord.period,
            pay: attendanceRecord.pay,
          });
        }
      });
    }
  });

  
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
          if (cancelledSession.date === date && (period === 'daily' || cancelledSession.period === period)) {
            cancelledSessions.push({
              activity: activity.id,
              date: cancelledSession.date,
              period: cancelledSession.period
            });
          }
        });
      }
    });
  });

  res.render(req.protoUrl + "/sessions-cancelled", {
    date,
    period,
    cancelledSessions
  });
});


module.exports = router;

// =================
// Helper functions
// =================
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