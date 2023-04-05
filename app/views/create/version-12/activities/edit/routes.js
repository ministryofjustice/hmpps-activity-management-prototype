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
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);

  // render the page
  res.render(req.protoUrl + "/name", {
    activity,
    activityId,
  });
});

// edit activity name POST route
router.post("/name", function (req, res) {
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);

  // set the confirmation message to be displayed on the activity page
  req.session.data['confirmation-dialog'] = {
    display: true,
    change: "Activity name",
  }

  // update the activity name
  activity.name = req.body.name;

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity category page
router.get("/category", function (req, res) {
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);
  let activityCategory = activity.category;
  let activityCategoryName = req.session.data['timetable-complete-1']['categories'].find(category => category.id == activityCategory).name;

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
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);

  // update the activity category
  activity.category = req.body['activity-category'];

  // set the confirmation message to be displayed on the activity page
  req.session.data['confirmation-dialog'] = {
    display: true,
    change: "category",
  }

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity risk assessment page
router.get("/risk-assessment-level", function (req, res) {
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);
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
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);

  // update the activity risk assessment
  activity.riskAssessment = req.body['activity-risk-assessment-level'];

  // set the confirmation message to be displayed on the activity page
  req.session.data['confirmation-dialog'] = {
    display: true,
    change: "risk assessment",
  }

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity location page
router.get("/location", function (req, res) {
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);
  let activityLocation = activity.location;

  // get a list of unique activity locations from the activities array
  let locations = activities.map(activity => activity.location);
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
  let activities = req.session.data['timetable-complete-1']['activities'];
  let activityId = req.activityId;
  let activity = activities.find(activity => activity.id == activityId);

  // update the activity location
  activity.location = req.body['activity-location'];

  // set the confirmation message to be displayed on the activity page
  req.session.data['confirmation-dialog'] = {
    display: true,
    change: "location",
  }

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

module.exports = router;