const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

router.get("/", function (req, res) {
  let date = new Date().toISOString().slice(0, 10);
  res.redirect("attendance-dashboard/select-date");
});

// select date page
router.get("/select-date", function (req, res) {
  let dateIn30Days = DateTime.now().plus({ days: 30 }).toISODate();

  res.render(req.protoUrl + "/select-date", {
    dateIn30Days,
  });
});

// select date page - post
router.post("/select-date", function (req, res) {
  let date = req.session.data["date"];
  res.redirect(`${date}/daily`);
});

// select date and period page
router.get("/select-date-and-period", function (req, res) {
  let dateIn30Days = DateTime.now().plus({ days: 30 }).toISODate();

  res.render(req.protoUrl + "/select-date-and-period", {
    dateIn30Days,
  });
});

// select date and period page - post
router.post("/select-date-and-period", function (req, res) {
  let date = req.body["date"];
  let period = req.body["period"].toUpperCase();

  if(period === "DAILY") {
    period = "daily";
  }

  res.redirect(`${date}/${period}/not-attended-yet?page=1`);
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

  let cancelledSessions = getCancelledSessions(activities, date, period);

  let activitiesForDate = activitiesByDate(req.session.data["timetable-complete-1"]["activities"], dateString);

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
          (activity.attendanceCount[period][type] > 0 ? activity.attendanceCount[period][type] : 0);
      }
    }
  }

  function calculateAttendanceFigures(data, period, date) {
    let totalAllocated;

    if (period == "AM" || period == "Morning" || period == "morning") {
      totalAllocated = attendanceTotals.morning["scheduled"];
      period = "AM";
    } else if (period == "PM" || period == "Afternoon" || period == "afternoon") {
      totalAllocated = attendanceTotals.afternoon["scheduled"];
      period = "PM";
    } else if (period == "daily" || period == "Daily") {
      totalAllocated = attendanceTotals.morning["scheduled"] + attendanceTotals.afternoon["scheduled"];
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
      "sessions-cancelled": {},
    };

    if (data) {
      let activitiesCheckedCancellations = [];

      Object.values(data).forEach((activity) => {
        if (activity[date]) {
          const periodData =
            period === "daily"
              ? (activity[date].AM ? Object.values(activity[date].AM) : []).concat(
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
                  (attendanceCounts.absences["with-pay"][attendanceStatus] || 0) + 1;
              } else {
                attendanceCounts.absences["without-pay"].total++;
                attendanceCounts.absences["without-pay"][attendanceStatus] =
                  (attendanceCounts.absences["without-pay"][attendanceStatus] || 0) + 1;
              }
              attendanceCounts["not-recorded"]--;
            } else {
              attendanceCounts["not-recorded"]++;
            }

            if (sessionCancelled == true) {
              // for each activity, check if any prisoner's attendance record has a sessionCancelled property set to true
              // if the reason for the cancellation is not already in the attendanceCounts["sessions-cancelled"] object add it as a property and set it to 1
              // otherwise increment the value of the property by 1, but only once for each activity!
              if (activitiesCheckedCancellations.indexOf(activity) === -1) {
                if (attendanceCounts["sessions-cancelled"][record.cancellationReason]) {
                  attendanceCounts["sessions-cancelled"][record.cancellationReason]++;
                } else {
                  attendanceCounts["sessions-cancelled"][record.cancellationReason] = 1;
                }
                activitiesCheckedCancellations.push(activity);
              }
            }
          });
        }
      });
    }

    return attendanceCounts;
  }

  let counts = calculateAttendanceFigures(req.session.data["attendance"], period, date);
  let timeOfDay = period === "AM" ? "Morning" : period === "PM" ? "Afternoon" : "Daily";

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
      activityCount = activitiesForDate.morning.length + activitiesForDate.afternoon.length;
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
    cancelledSessions,
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
    (attended = "attended"),
    (attendanceStatus = [])
  );

  res.render(req.protoUrl + "/prisoners-list", {
    date,
    pageTitle: "All attended",
    period,
    attendanceList,
  });
});

// create dynamic routes for each unique attendanceStatus in the attendance data
router.all("/:date/:period/absences/:attendanceStatus", (req, res) => {
  let date = req.params.date;
  let period = req.params.period;
  let attendanceStatus = req.params.attendanceStatus;

  // get a list of prisoners who have attended any activity on the selected date and period
  let attendanceData = req.session.data["attendance"];
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let attendanceList = getPrisonerList(
    activities,
    attendanceData,
    date,
    period,
    (attended = "not-attended"),
    (attendanceStatus = [attendanceStatus])
  );

  // get the title for the page using the attendanceStatus
  // replace "-"" with a space
  // prepend "Absences: " to the title
  let pageTitle = attendanceStatus.join(" ").replace(/-/g, " ").replace(/^/, "Absences: ");

  // render the page dynamically, passing in the attendanceStatus as a parameter
  res.render(req.protoUrl + "/prisoners-list", {
    date,
    pageTitle,
    period,
    attendanceStatus,
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
    (attended = "not-attended"),
    (attendanceStatus = [])
  );

  // get unique prisoner locations from the attendanceList
  // for each prisoner, get their cell location and if it is not already in the locations array, add it
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let locations = [];
  attendanceList.forEach((prisoner) => {
    let prisonerData = prisoners.find((p) => p.id === prisoner.prisonerId);
    if (!locations.includes(prisonerData.location.houseblock) && prisonerData.location.houseblock !== undefined) {
      locations.push(prisonerData.location.houseblock);
    }
  });

  // get unique prisoner activities from the attendanceList
  // for each prisoner, get their activity and if it is not already in the activities array, add it
  let activitiesList = [];
  attendanceList.forEach((prisoner) => {
    if (!activitiesList.includes(prisoner.activityId) && prisoner.activityId !== undefined) {
      activitiesList.push(prisoner.activityId);
    }
  });

  // get unique activity categories from the activitiesList
  // for each activity, get its category from the activities data and if it is not already in the categories array, add it
  let categoriesList = [];
  activitiesList.forEach((activityId) => {
    let activityData = activities.find((a) => a.id === activityId);
    if (!categoriesList.includes(activityData.category) && activityData.category !== undefined) {
      categoriesList.push(activityData.category);
    }
  });

  res.render(req.protoUrl + "/prisoners-list", {
    date,
    period,
    pageTitle: "All absences",
    attendanceList,
    locations,
    activitiesList,
    categoriesList,
  });
});

// PAGE: Sick list
// DESCRIPTION: This page shows a list of prisoners who have been marked as sick on the selected date and period
router.get("/:date/:period/sick", (req, res) => {
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
    (attended = "not-attended"),
    (attendanceStatus = [])
  );

  // filter the attendanceList to only include prisoners who have been marked as sick
  attendanceList = attendanceList.filter((prisoner) => {
    return prisoner.attendanceRecord.attendanceStatus === "sick";
  });

  res.render(req.protoUrl + "/prisoners-list", {
    date,
    period,
    pageTitle: "All absences",
    attendanceList,
  });
});

// PAGE: Not yet attended list
// DESCRIPTION: This page shows a list of prisoners who have not yet attended any activity on the selected date and period
router.get("/:date/:period/not-attended-yet", (req, res) => {
  const date = req.params.date;
  const period = req.params.period;
  const prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get a list of prisoners who have attended any activity on the selected date and period
  let attendanceData = req.session.data["attendance"];
  let activities = req.session.data["timetable-complete-1"]["activities"];

  // set attendanceList to any prisoners with the activity id in their activity array
  // but who have not yet been marked as attended or not attended for that activity on the selected date and period
  let attendanceList = getPrisonersWithActivity(activities, prisoners, date, period);

  let limit = 10;

  // pagination component variables
  let pagination = {
    current: req.query.page,
    total: attendanceList.length,
    limit: limit,
    from: attendanceList.length > 0 ? (req.query.page - 1) * limit + 1 : 0,
    to: req.query.page * limit > attendanceList.length ? attendanceList.length : req.query.page * limit,
    previous: req.query.page > 1 ? req.query.page - 1 : false,
    next: req.query.page * limit < attendanceList.length ? req.query.page + 1 : false,
    pages: Math.ceil(attendanceList.length / limit),
    first: req.query.page > 1 ? 1 : false,
    last: req.query.page * limit < attendanceList.length ? Math.ceil(attendanceList.length / limit) : false,
  };

  // paginate the attendanceList to show n prisoners per page
  attendanceList = paginate(attendanceList, limit, req.query.page);

  res.render(req.protoUrl + "/prisoners-list--not-attended", {
    date,
    period,
    pageTitle: "All not attended yet",
    attendanceList,
    pagination,
  });
});

// PAGE: Sessions cancelled list
router.get("/:date/:period/sessions-cancelled", (req, res) => {
  const date = req.params.date;
  const period = req.params.period;

  let activities = req.session.data["timetable-complete-1"]["activities"];
  let cancelledSessions = getCancelledSessions(activities, date, period);

  // add the count of allocated prisoners to each cancelled session in the cancelledSessions array
  cancelledSessions.forEach((session) => {
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerCount = 0;
    prisoners.forEach((prisoner) => {
      if (prisoner.activity && prisoner.activity.includes(session.activity)) {
        prisonerCount++;
      }
    });
    session.prisonerCount = prisonerCount;
  });

  res.render(req.protoUrl + "/sessions-cancelled", {
    date,
    pageTitle: "All sessions cancelled",
    period,
    cancelledSessions,
  });
});

// generate random attendance data for the last 14 days
// using a get request to /generate-data will overwrite the existing attendance data
router.get("/generate-data", (req, res) => {
  res.render(req.protoUrl + "/generate-data");
});

router.get("/generate-data-now", (req, res) => {
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
const createHistoricAttendanceData = (activities, numberOfDays, prisonersData) => {
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
          // generate random times for the attendance record
          // if the period is AM, the time should be between 8am and 12pm
          // if the period is PM, the time should be between 1pm and 5pm
          let time;
          if (period === "AM") {
            time = randomTime(8, 12);
          } else {
            time = randomTime(13, 17);
          }

          // use luxon to generate a random time
          function randomTime(start, end) {
            let hour = Math.floor(Math.random() * (end - start + 1)) + start;
            let minute = Math.floor(Math.random() * 60);
            let second = Math.floor(Math.random() * 60);
            return DateTime.fromObject({
              hour,
              minute,
              second,
            }).toFormat("HH:mm");
          }

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
              time: time, // "20:46:04"
            },
          };

          generateRecord();

          // add the attendance record object to attendanceData but only if the prisoner has an activity array and the array contains the activity id
          const isoDate = date.toISOString().slice(0, 10);
          const activityId = parseInt(activity.id);

          if (prisoner.activity?.includes(activityId)) {
            attendanceData[activityId] ??= {};
            attendanceData[activityId][isoDate] ??= {};
            attendanceData[activityId][isoDate][period] ??= {};
            attendanceData[activityId][isoDate][period][prisoner.id] ??= [];
            attendanceData[activityId][isoDate][period][prisoner.id].push(attendanceRecord);
          }

          function generateRecord() {
            // decide if the prisoner attended
            attendanceRecord.attendance = Math.random() < 0.86 ? "attended" : "not-attended";

            // if the prisoner attended, decide if they got paid
            if (attendanceRecord.attendance === "attended") {
              attendanceRecord.pay = Math.random() < 0.95 ? true : false;

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
                ];

                const total = statusesAndProbabilities.reduce((acc, cur) => acc + cur[1], 0);
                let random = Math.random() * total;
                let status = statusesAndProbabilities.find(([, probability]) => {
                  random -= probability;
                  return random <= 0;
                });
                return status[0];
              }

              attendanceRecord.attendanceStatus = assignRandomStatus();

              switch (attendanceRecord.attendanceStatus) {
                // If the prisoner is sick, on a rest day, or for some other reason and pay is required, set pay to true, otherwise false
                case "sick":
                case "rest-day":
                case "other":
                case "not-required":
                  // set pay to true
                  attendanceRecord.pay = true;
                  break;

                // If the prisoner refused to work, set pay to false
                case "refused":
                  attendanceRecord.pay = false;
                  break;
              }
            }

            // if the prisoner refused, decide if they have an incentive level warning
            if (attendanceRecord.attendanceStatus === "refused") {
              attendanceRecord.incentiveLevelWarning = Math.random() < 0.8 ? "yes" : "no";
            }
            // if the prisoner refused add a case note
            if (attendanceRecord.attendanceStatus === "refused") {
              // don't pay prisoners who refused
              attendanceRecord.pay = false;
              attendanceRecord.caseNote = "Refused to attend for no good reason";
            }
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
          if (schedule.day === date.getDay() && schedule[period.toLowerCase()] != null) {
            scheduled = true;
          }
        });
        if (!scheduled) {
          if (
            attendanceData[parseInt(activity.id)] &&
            attendanceData[parseInt(activity.id)][date.toISOString().slice(0, 10)] &&
            attendanceData[parseInt(activity.id)][date.toISOString().slice(0, 10)][period]
          ) {
            delete attendanceData[parseInt(activity.id)][date.toISOString().slice(0, 10)][period];
          }
        }
      });
    });
  });

  // if any prisoner has multiple attendance records across different activities for the same day/period combination in the attendance data
  // randomly choose one of the records to mark as 'not-attended', 'clash', with pay
  // we'll need to create an object of records for each prisoner for each day/period combination and then loop through them:
  const attendanceRecordsByPrisoner = {};

  for (const { [0]: activityId, [1]: dates } of Object.entries(attendanceData)) {
    for (const [date, periods] of Object.entries(dates)) {
      for (const [period, prisoners] of Object.entries(periods)) {
        for (const [prisonerId, attendance] of Object.entries(prisoners)) {
          const prisonerAttendance = attendanceRecordsByPrisoner[prisonerId]?.[date]?.[period] ?? [];
          prisonerAttendance.push(attendance);
          attendanceRecordsByPrisoner[prisonerId] ??= {};
          attendanceRecordsByPrisoner[prisonerId][date] ??= {};
          attendanceRecordsByPrisoner[prisonerId][date][period] = prisonerAttendance;
        }
      }
    }
  }

  // loop through the attendance records for each prisoner for each day/period combination
  // if there is more than one record, randomly choose one to keep and mark the others as 'not-attended', 'clash', with pay
  for (const [prisonerId, dates] of Object.entries(attendanceRecordsByPrisoner)) {
    for (const [date, periods] of Object.entries(dates)) {
      for (const [period, attendance] of Object.entries(periods)) {
        if (attendance.length > 1) {
          const attendanceToKeep = attendance[Math.floor(Math.random() * attendance.length)];
          attendance.forEach((attendanceRecord) => {
            if (attendanceRecord !== attendanceToKeep) {
              attendanceRecord[0].attendance = "not-attended";
              attendanceRecord[0].attendanceStatus = "clash";
              attendanceRecord[0].pay = true;

              console.log(attendanceRecord[0]);
            }
          });
        }
      }
    }
  }

  return attendanceData;
};
// ------------------ END OF ATTENDANCE DATA GENERATOR ------------------

// ------------------------------------------------------------------------
// ------------------ START OF CASE NOTES DATA GENERATOR ------------------
// ------------------------------------------------------------------------
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
                  cancellation.date === date.toISOString().slice(0, 10) && cancellation.period.toLowerCase() === "am"
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
                  cancellation.date === date.toISOString().slice(0, 10) && cancellation.period.toLowerCase() === "pm"
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
const addAttendanceCountsToActivities = (activities, attendanceData, selectedDate, prisonersList) => {
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
    let prisonerList = prisonersList.filter((prisoner) => prisoner.activity && prisoner.activity.includes(activity.id));
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
            if (prisonerAMAttendance[prisonerAMAttendance.length - 1].attendance === "attended") {
              attendanceCountAM[attendedKey]++;
            } else if (prisonerAMAttendance[prisonerAMAttendance.length - 1].attendance === "not-attended") {
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
            if (prisonerPMAttendance[prisonerPMAttendance.length - 1].attendance === "attended") {
              attendanceCountPM[attendedKey]++;
            } else if (prisonerPMAttendance[prisonerPMAttendance.length - 1].attendance === "not-attended") {
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
function getCancelledSessions(activities, date, period) {
  let cancelledSessions = [];
  activities.forEach((activity) => {
    // for each day (0-6) check for cancelled sessions
    // also check the date of each cancelled session to see if it matches the selected date
    activity.schedule.forEach((schedule) => {
      if (schedule.cancelledSessions) {
        schedule.cancelledSessions.forEach((cancelledSession) => {
          // if the period is 'daily' a cancelled session for either period should be added to the list
          // otherwise only add the cancelled session if it matches the selected period
          // we should make sure we're including the correct period in the cancelled session object
          if (cancelledSession.date === date && (period === "daily" || cancelledSession.period === period)) {
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
  return cancelledSessions;
}

function getPrisonerList(activities, attendanceData, date, period, attended, attendanceStatus) {
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
        ? attendanceData[activityId][date].AM || attendanceData[activityId][date].PM
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
        let attendanceRecord = attendancePeriod[prisonerId][attendancePeriod[prisonerId].length - 1];
        // if the attendance type is 'attended'
        // add the prisoner, activity id, date, time, period and pay to the prisoner list
        // and also the attendance data for the prisoner
        if (attendanceRecord.attendance === attended) {
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
      });
    }
  });

  // filter the prisoner list by attendanceStatus
  // if it is defined and is an array with at least one element
  if (attendanceStatus && Array.isArray(attendanceStatus) && attendanceStatus.length > 0) {
    // filter the prisoner list by attendanceStatus
    prisonerList = prisonerList.filter((prisoner) => {
      return attendanceStatus.includes(prisoner.attendanceRecord.attendanceStatus);
    });
  }

  // return the prisoner list
  return prisonerList;
}

// function to get a list of prisoners with an activity scheduled on the selected date and period
function getPrisonersWithActivity(activities, prisoners, date, period) {
  let prisonersWithActivity = [];
  let selectedDay = new Date(date).getDay();
  let selectedPeriod = period;
  let activitiesOnDayAndPeriod = [];

  activities.forEach((activity) => {
    let activitySchedule = activity.schedule;

    // for each day in the activity schedule
    activitySchedule.forEach((day) => {
      // if the "am" or "pm" is null, don't add the activity id to the list of activities on the selected day and period
      // if the day matches the selected day, add the activity id to the list of activities on the selected day and period
      // if the selected period is "daily", add the activity id to the list of activities on the selected day and period if the day matches the selected day and either the "am" or "pm" is not null
      if (
        (selectedPeriod === "AM" && day.am && day.day === selectedDay) ||
        (selectedPeriod === "PM" && day.pm && day.day === selectedDay) ||
        (selectedPeriod === "daily" && day.day === selectedDay && (day.am || day.pm))
      ) {
        activitiesOnDayAndPeriod.push(activity.id.toString());
      }
    });
  });

  // for each prisoner in the list of prisoners
  prisoners.forEach((prisoner) => {
    // if the "prisoner.activity" array contains an activity id from the activitiesOnDayAndPeriod array
    // ... make sure we compare the activity ids as strings
    if (
      prisoner.activity &&
      prisoner.activity.length > 0 &&
      prisoner.activity.some((activity) => activitiesOnDayAndPeriod.includes(activity.toString()))
    ) {
      // remove any activities from the prisoner.activity array that are not in the activitiesOnDayAndPeriod array
      prisoner.activity = prisoner.activity.filter((activity) => activitiesOnDayAndPeriod.includes(activity.toString()));

      // if the prisoner still has more than one activity in their activity array
      // we need to add them to the list of prisoners with an activity for each activity in their activity array
      if (prisoner.activity.length > 1) {
        prisoner.activity.forEach((activity) => {
          prisonersWithActivity.push({ ...prisoner, activity: [activity] });
        });
      } else {
        // otherwise just add the prisoner to the list of prisoners with an activity
        prisonersWithActivity.push(prisoner);
      }
    }
  });
  
  // return the list of prisoners with an activity on the selected day and period
  return prisonersWithActivity;
}

// pagination function
function paginate(array, pageSize, pageNumber) {
  return array.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
}