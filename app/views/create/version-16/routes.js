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

// change of circumstance journey
router.use("/change-of-circumstance", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./change-of-circumstance/routes")(req, res, next);
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

// manage allocations journey
router.use("/manage-allocations", (req, res, next) => {
  req.serviceName = req.originalUrl.split("/")[1];
  req.version = req.originalUrl.split("/")[2];
  req.journey = req.originalUrl.split("/")[3];
  req.subJourney = req.originalUrl.split("/")[5];

  req.protoUrl = req.serviceName + "/" + req.version + "/" + req.journey;
  require("./manage-allocations/routes")(req, res, next);
});

// edit activity journey
router.use("/edit-activity", (req, res, next) => {
  req.serviceName = req.originalUrl.split("/")[1];
  req.version = req.originalUrl.split("/")[2];
  req.journey = req.originalUrl.split("/")[3];

  req.protoUrl = req.serviceName + "/" + req.version + "/" + req.journey;
  require("./edit-activity/routes")(req, res, next);
});

// end activity journey
router.use("/end-activity", (req, res, next) => {
  req.serviceName = req.originalUrl.split("/")[1];
  req.version = req.originalUrl.split("/")[2];
  req.journey = req.originalUrl.split("/")[3];

  req.protoUrl = req.serviceName + "/" + req.version + "/" + req.journey;
  require("./end-activity/routes")(req, res, next);
});


// navigation concept page
router.get("/navigation-concept", function (req, res) {
  res.render("create/" + req.version + "/navigation-concept");
});



module.exports = router;
