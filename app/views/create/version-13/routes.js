const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

//redirect the root url to the DPS home page
router.get("/", function (req, res) {
  res.redirect("/create/" + req.version + "/dps-home");
});

router.get("/dps-home", function (req, res) {
  res.render("create/" + req.version + "/dps-home");
});

// manage activities page
router.get("/manage-activities", function (req, res) {
  res.render("create/" + req.version + "/manage-activities");
});

// record-check-attendance page
router.get("/record-check-attendance", function (req, res) {
  res.render("create/" + req.version + "/record-check-attendance");
});

// create activity journey
router.use("/create-activity", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./create-activity/routes")(req, res, next);
});

// create activity journey version 2
router.use("/create-activity-version-2", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];
  
  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./create-activity-version-2/routes")(req, res, next);
});

// log an application journey
router.use("/log-an-application", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./log-an-application/routes")(req, res, next);
});

// log an application version 2 journey
router.use("/log-an-application-version-2", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./log-an-application/routes")(req, res, next);
});

// activities page
router.use("/activities", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./activities/routes")(req, res, next);
});

// activities version 2 page
router.use("/activities-version-2", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];
  
  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./activities-version-2/routes")(req, res, next);
});

// edit activity journey
router.use("/activities/:activityId/edit", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  let activityId = req.params.activityId;
  
  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./edit-activity/routes")(req, res, next);
});

module.exports = router;
