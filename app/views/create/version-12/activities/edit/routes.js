const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// LOG to console for all get requests
router.get("/*", function (req, res, next) {
  // console.log(req.session.data["deallocation"]);

  next();
});

// edit activity name page
router.get("/name", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // render the page
  res.render(req.protoUrl + "/name", {
    activity,
    activityId,
  });
});

// edit activity name POST route
router.post("/name", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "Activity name",
  };

  // update the activity name
  activity.name = req.body.name;

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity category page
router.get("/category", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activityCategory = activity.category;
  let activityCategoryName = req.session.data["timetable-complete-1"]["categories"].find(
    (category) => category.id == activityCategory
  ).name;

  // render the page
  res.render(req.protoUrl + "/category", {
    activity,
    activityId,
    activityCategory,
    activityCategoryName,
  });
});

// edit activity category POST route
router.post("/category", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity category
  activity.category = req.body["activity-category"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "category",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity risk assessment page
router.get("/risk-assessment-level", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activityRiskAssessment = activity.riskAssessment;

  // render the page
  res.render(req.protoUrl + "/risk-assessment-level", {
    activity,
    activityId,
    activityRiskAssessment,
  });
});

// edit activity risk assessment POST route
router.post("/risk-assessment-level", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity risk assessment
  activity.riskAssessment = req.body["activity-risk-assessment-level"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "risk assessment",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity location page
router.get("/location", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activityLocation = activity.location;

  // get a list of unique activity locations from the activities array
  let locations = activities.map((activity) => activity.location);
  locations = [...new Set(locations)];

  // render the page
  res.render(req.protoUrl + "/location", {
    activity,
    activityId,
    activityLocation,
    locations,
  });
});

// edit activity location POST route
router.post("/location", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity location
  activity.location = req.body["activity-location"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "location",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity schedule page
router.get("/schedule", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // render the page
  res.render(req.protoUrl + "/schedule", {
    activity,
    activityId,
    activitySchedule,
  });
});

// edit activity bank holidays page
router.get("/bank-holidays", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // render the page
  res.render(req.protoUrl + "/bank-holidays", {
    activity,
    activityId,
    activitySchedule,
  });
});

// edit activity bank holidays POST route
router.post("/bank-holidays", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity bank holidays
  activity.schedule.bankHolidays = req.body["activity-bank-holidays"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "bank holidays",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity start date page
router.get("/start-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // convert the activity start date data to 3 separate variables using luxon
  let startDate = {};
  startDate.day = DateTime.fromISO(activity.startDate).day;
  startDate.month = DateTime.fromISO(activity.startDate).month;
  startDate.year = DateTime.fromISO(activity.startDate).year;

  // render the page
  res.render(req.protoUrl + "/start-date", {
    activity,
    activityId,
    activitySchedule,
    startDate,
  });
});

// edit activity start date POST route
router.post("/start-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // convert the start date day, month and year to a single ISO date string
  let startDate = DateTime.fromObject({
    day: req.body["start-date-day"],
    month: req.body["start-date-month"],
    year: req.body["start-date-year"],
  }).toISODate();

  // update the activity start date
  activity.startDate = startDate;

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "start date",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity end date page
router.get("/end-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // convert the activity end date data to 3 separate variables using luxon
  let endDate = {};
  endDate.day = DateTime.fromISO(activity.endDate).day;
  endDate.month = DateTime.fromISO(activity.endDate).month;
  endDate.year = DateTime.fromISO(activity.endDate).year;

  // render the page
  res.render(req.protoUrl + "/end-date", {
    activity,
    activityId,
    activitySchedule,
    endDate,
  });
});

// edit activity end date POST route
router.post("/end-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // convert the end date day, month and year to a single ISO date string
  let endDate = DateTime.fromObject({
    day: req.body["end-date-day"],
    month: req.body["end-date-month"],
    year: req.body["end-date-year"],
  }).toISODate();

  // update the activity end date
  activity.endDate = endDate;

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "end date",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});


module.exports = router;
