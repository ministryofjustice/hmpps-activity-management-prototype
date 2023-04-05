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

module.exports = router;