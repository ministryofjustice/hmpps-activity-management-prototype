const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// routes for pages in the activities section
// activities page redirect root to /all
router.get("/", function (req, res) {
  res.redirect("activities/all");
});

// all activities page
router.get("/all", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let applications = req.session.data["applications"];

  // count the number of prisoners allocated to each activity
  // and add it to each activity object in the activities array
  addAllocationsCountToActivities(activities, req, applications);

  // render the activities page and pass the activities array to the template
  res.render(req.protoUrl + "/activities", {
    activities,
  });
});

// specific activity page
router.get("/:activityId", function (req, res) {
  // redirect to the currently allocated page for the activity
  res.redirect(req.params.activityId + "/currently-allocated");
});

// activity applications page
router.get("/:activityId/applications", function (req, res) {
  let currentPage = "applications";

  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let applications = req.session.data["applications"];
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  let activitySchedule = activity.schedule;
  let schedule = getActivitySchedule(activitySchedule);

  // get a list of all applications for the selected activity
  let activityApplications = applications.filter(
    (application) => application.activity.toString() === activityId.toString()
  );

  // hide the confirmation message if it's shown
  if (req.session.data["application-added-confirmation-message"] === true) {
    req.session.data["application-added-confirmation-message"] = false;
  }

  // create a human-readable list of days the activity is scheduled for
  let activityDays = humanReadableSchedule(schedule);

  // create an array of objects for the days the activity is scheduled and which time period it's scheduled for
  // e.g. [{day: 'Monday', times: '(AM)'}, {day: 'Tuesday', times: '(AM and PM)'}, {day: 'Friday', times: null}]
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // get the category name for the activity
  let activityCategory = req.session.data["timetable-complete-1"][
    "categories"
  ].find((category) => category.id.toString() === activity.category.toString());

  res.render(req.protoUrl + "/applications", {
    activity,
    activityApplications,
    activityCategory,
    activityDays,
    activityDaysWithTimes,
    currentPage,
    schedule,
  });
});

// activity currently allocated page
router.get("/:activityId/currently-allocated", function (req, res) {
  let currentPage = "currently-allocated";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get list of prisoners with allocations
  const currentlyAllocated = getAllocatedPrisoners(prisoners, activityId);

  // set an activitySchedule variable from the activity.schedule data
  let activitySchedule = activity.schedule;

  // for each day in the activity schedule, create a new object with the day name and am/pm values
  let schedule = getActivitySchedule(activitySchedule);

  // create a human-readable list of days the activity is scheduled for
  let activityDays = humanReadableSchedule(schedule);
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // get the category name for the activity
  let activityCategory = req.session.data["timetable-complete-1"][
    "categories"
  ].find((category) => category.id.toString() === activity.category.toString());

  res.render(req.protoUrl + "/currently-allocated", {
    activity,
    activityCategory,
    activityDays,
    activityDaysWithTimes,
    currentPage,
    currentlyAllocated,
    schedule,
    activitySchedule,
  });
});

// other prisoners page
router.get("/:activityId/other-prisoners", function (req, res) {
  let currentPage = "other-prisoners";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get a list of all prisoners without an application for the selected activity
  // and without the activity id in their activity array
  // make sure we account for prisoners whose activity array is empty or undefined (i.e. no activities)
  let prisonersWithoutApplication = prisoners.filter(
    (prisoner) =>
      !prisoner.activity ||
      prisoner.activity.length === 0 ||
      !prisoner.activity.includes(activityId)
  );

  let activitySchedule = activity.schedule;
  let schedule = getActivitySchedule(activitySchedule);
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // simple code for paginating prisoners to 5 per page
  // should show like:
  // Previous 1 ⋯ 6 7 8 ⋯ 42 Next
  let page = req.query.page || 1;
  let limit = 5;
  let offset = (page - 1) * limit;
  let prisonersWithoutApplicationPaginated = prisonersWithoutApplication.slice(
    offset,
    offset + limit
  );
  let totalPages = Math.ceil(prisonersWithoutApplication.length / limit);

  


  

  res.render(req.protoUrl + "/other-prisoners", {
    activity,
    activityDaysWithTimes,
    currentPage,
    prisonersWithoutApplication,
    prisonersWithoutApplicationPaginated,
    totalPages,
  });
});

// application details page
router.get("/:activityId/applications/:applicationId", function (req, res) {
  let activityId = req.params.activityId;
  let applicationId = req.params.applicationId;
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) => application.id.toString() === applicationId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find(
    (prisoner) =>
      prisoner.id.toString() === application["selected-prisoner"].toString()
  );

  res.render(req.protoUrl + "/application", {
    activity,
    application,
    prisoner,
  });
});

// activity allocate page
router.get("/:activityId/allocate/:prisonerId", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  res.render(req.protoUrl + "/allocate", {
    activityId,
    activity,
    prisoner,
    prisonerId,
  });
});

module.exports = router;

function addAllocationsCountToActivities(activities, req, applications) {
  activities.forEach((activity) => {
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerCount = 0;
    prisoners.forEach((prisoner) => {
      const prisonerActivities = prisoner.activity
        ? Array.isArray(prisoner.activity)
          ? prisoner.activity
          : [prisoner.activity]
        : false;

      if (prisonerActivities && prisonerActivities.includes(activity.id)) {
        prisonerCount++;
      }
    });
    activity.currentlyAllocated = prisonerCount;

    // get a count of all applications for the activity and add it to the activity object
    let activityApplications = applications.filter(
      (application) =>
        application.activity.toString() === activity.id.toString()
    );
    activity.applicationCount = activityApplications.length;
  });
}

// get list of prisoners with allocations
function getAllocatedPrisoners(prisoners, activityId) {
  return prisoners.filter((prisoner) => {
    let prisonerActivities;
    // check prisoner.activity is not null
    if (prisoner.activity) {
      // check prisoner.activity is an array
      if (Array.isArray(prisoner.activity)) {
        // set prisonerActivities to prisoner.activity
        prisonerActivities = prisoner.activity;
      } else {
        // set prisonerActivities to an array containing prisoner.activity
        prisonerActivities = [prisoner.activity];
      }
    } else {
      // return false if prisoner.activity is null
      return false;
    }
    // if the prisoners activity array contains the activityId, return true
    return prisonerActivities.includes(parseInt(activityId));
  });
}

// generate the activity schedule from the activity schedule data
function getActivitySchedule(activitySchedule) {
  return activitySchedule.map((day) => {
    // convert each day number to the name of the weekday
    // 1 = monday, 2 = tuesday, etc.
    let dayNames = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    let dayName = dayNames[day.day];

    // return the day name and am/pm values
    return {
      day: dayName,
      am: day.am,
      pm: day.pm,
    };
  });
}

// create a human-readable list of days the activity is scheduled for
function humanReadableSchedule(schedule) {
  let activityDays = [];
  schedule.forEach((day) => {
    if (day.am != null && day.pm != null) {
      activityDays.push(day.day + " (AM and PM)");
    } else if (day.am != null) {
      activityDays.push(day.day + " (AM)");
    } else if (day.pm != null) {
      activityDays.push(day.day + " (PM)");
    }
  });
  // capitalize the first letter of each day
  activityDays = activityDays.map((day) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  });
  // join the list of days with commas and 'and'
  activityDays = activityDays.join(", ").replace(/,([^,]*)$/, " and$1");
  return activityDays;
}

function scheduleDaysWithTimes(schedule) {
  let activityDaysWithTimes = [];
  schedule.forEach((day) => {
    if (day.am != null && day.pm != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: "AM and PM",
      });
    } else if (day.am != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: "AM",
      });
    } else if (day.pm != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: "PM",
      });
    } else {
      activityDaysWithTimes.push({
        day: day.day,
        times: null,
      });
    }
  });
  return activityDaysWithTimes;
}
