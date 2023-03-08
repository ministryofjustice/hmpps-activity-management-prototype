const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

//redirect the root url to the start page
router.get("/", function (req, res) {
  res.render("create/" + req.version + "/dps-home");
});

// manage activities page
router.get("/manage-activities", function (req, res) {
  res.render("create/" + req.version + "/manage-activities");
});

// create activity journey
router.use("/create-activity", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./create-activity/routes")(req, res, next);
});

// log an application journey
router.use("/log-an-application", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./log-an-application/routes")(req, res, next);
});

// activities page
router.get("/activities", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];

  // count the number of prisoners allocated to each activity
  // and add it to each activity object in the activities array
  activities.forEach((activity) => {
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerCount = 0;
    prisoners.forEach((prisoner) => {
      const prisonerActivities = prisoner.activity ? Array.isArray(prisoner.activity) ? prisoner.activity : [prisoner.activity] : false;

      if (prisonerActivities && prisonerActivities.includes(activity.id)) {
        prisonerCount++;
      }
    });
    activity.currentlyAllocated = prisonerCount;
  });
  
  // render the activities page and pass the activities array to the template
  res.render("create/" + req.version + "/activities", {
    activities,
  });
});

// specific activity page
router.get("/activities/:activityId", function (req, res) {
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get list of prisoners with allocations
  const currentlyAllocated = prisoners.filter((prisoner) => {
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

  // generate the activity schedule from the activity schedule data
  // should look like this:
  // [{day: 'monday', am: true, pm: false}, {day: 'tuesday', am: false, pm: true}]
  // set an activitySchedule variable from the activity.schedule data
  let activitySchedule = activity.schedule;

  // for each day in the activity schedule, create a new object with the day name and am/pm values
  let schedule = activitySchedule.map((day) => {
    // convert each day number to the name of the weekday
    // 1 = monday, 2 = tuesday, etc.
    let dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    let dayName = dayNames[day.day];    
    
    // return the day name and am/pm values
    return {
      day: dayName,
      am: day.am,
      pm: day.pm,
    };
  });

  res.render("create/" + req.version + "/activity", {
    activity,
    currentlyAllocated,
    schedule,
    activitySchedule
  });
});

module.exports = router;
