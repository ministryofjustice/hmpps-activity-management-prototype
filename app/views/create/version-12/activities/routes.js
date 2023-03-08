const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");


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

// routes for pages in the activities section
// activities page redirect root to /all
router.get("/", function (req, res) {
  res.redirect("activities/all");
});

// all activities page
router.get("/all", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];

  // count the number of prisoners allocated to each activity
  // and add it to each activity object in the activities array
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
  });

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
  let currentPage = 'applications';

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // set an activitySchedule variable from the activity.schedule data
  let activitySchedule = activity.schedule;
  
  // for each day in the activity schedule, create a new object with the day name and am/pm values
  let schedule = activitySchedule.map((day) => {
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

  const currentlyAllocated = getAllocatedPrisoners(prisoners, activityId);

  // hide the confirmation message if it's shown
  if(req.session.data["application-added-confirmation-message"] === true) {
    req.session.data["application-added-confirmation-message"] = false;
  }

  res.render(req.protoUrl + "/applications", {
    activity,
    activitySchedule,
    currentlyAllocated,
    currentPage,
    schedule,
  });
});

// activity currently allocated page
router.get("/:activityId/currently-allocated", function (req, res) {
  let currentPage = 'currently-allocated';
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get list of prisoners with allocations
  const currentlyAllocated = getAllocatedPrisoners(prisoners, activityId);

  // generate the activity schedule from the activity schedule data
  // should look like this:
  // [{day: 'monday', am: true, pm: false}, {day: 'tuesday', am: false, pm: true}]
  // set an activitySchedule variable from the activity.schedule data
  let activitySchedule = activity.schedule;

  // for each day in the activity schedule, create a new object with the day name and am/pm values
  let schedule = activitySchedule.map((day) => {
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

  res.render(req.protoUrl + "/currently-allocated", {
    activity,
    currentPage,
    currentlyAllocated,
    schedule,
    activitySchedule,
  });
});

module.exports = router;

