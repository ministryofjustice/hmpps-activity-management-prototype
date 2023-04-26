const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { DateTime } = require("luxon");

router.all("*", function (req, res, next) {
  console.log(req.session.data["new-application"]);
  next();
});

//redirect the root url to the start page
router.get("/", function (req, res) {
  res.redirect("log-an-application/prisoner-search");
});

// create activity select category page
router.get("/prisoner-search", function (req, res) {
  res.render(req.protoUrl + "/prisoner-search");
});
// prisoner search page post logic
router.post("/prisoner-search", function (req, res) {
  if (req.session.data["prisoner-search"] != "match") {
    res.redirect("select-prisoner");
  } else {
    res.redirect("prisoner-existing-applications");
  }
});

// select prisoner page
router.get("/select-prisoner", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let searchTerm = req.query.search;

  const matchingPrisoners = prisoners.filter((prisoner) => {
    const fullName = `${prisoner.name.forename} ${prisoner.name.surname}`;
    return (
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prisoner.id.toLowerCase() === searchTerm.toLowerCase()
    );
  });

  // if there is only one matching prisoner
  if (matchingPrisoners.length === 1) {
    req.session.data["selected-prisoner"] = matchingPrisoners[0].id;
    res.redirect("prisoner-existing-applications");
  } else if (matchingPrisoners.length > 1) {
    res.render(req.protoUrl + "/select-prisoner", {
      matchingPrisoners,
    });
  } else {
    res.redirect("prisoner-search");
  }
});
// select prisoner page post logic
router.post("/select-prisoner", function (req, res) {
  res.redirect("prisoner-existing-applications");
});

// prisoner existing applications page
router.get("/prisoner-existing-applications", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner;

  // if there is a selected prisoner
  if (req.session.data["selected-prisoner"]) {
    prisoner = prisoners.find(
      (prisoner) => prisoner.id === req.session.data["selected-prisoner"]
    );
  } else {
    // if there is no selected prisoner
    prisoner = req.session.data["timetable-complete-1"]["prisoners"][0];
  }
  res.render(req.protoUrl + "/prisoner-existing-applications", {
    prisoner,
  });
});
// logic for prisoner existing applications page
router.post("/prisoner-existing-applications", function (req, res) {
  // check there is a selected prisoner
  if (!req.session.data["selected-prisoner"]) {
    req.session.data["selected-prisoner"] = req.session.data["timetable-complete-1"]["prisoners"][0].id;
  }

  // logic for the log new application radios
  if (req.session.data["log-new-application"] == "yes") {
    // create an empty application object
    req.session.data['new-application'] = {
      prisoner: req.session.data["selected-prisoner"]
    };
    res.redirect("select-activity");
  } else {
    res.redirect("prisoner-existing-applications");
  }
});

// select activity page
router.get("/select-activity", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];

  res.render(req.protoUrl + "/select-activity", {
    activities,
  });
});
// redirect to the application date page
router.post("/select-activity", function (req, res) {
  res.redirect("application-date");
});

// application date page
router.get("/application-date", function (req, res) {
  res.render(req.protoUrl + "/application-date");
});

// redirect to the applicant details page
router.post("/application-date", function (req, res) {
  // check the user has entered a date
  if (!req.session.data["application-date-day"] || !req.session.data["application-date-month"] || !req.session.data["application-date-year"]) {
    res.redirect("application-date");
    return;
  }

  // convert the individual date fields into a single date object
  let day = req.session.data["application-date-day"];
  let month = req.session.data["application-date-month"];
  let year = req.session.data["application-date-year"];
  let applicationDate = DateTime.fromObject({
    day: day,
    month: month,
    year: year,
  });

  // shorten the date to yyyy-mm-dd
  applicationDate = applicationDate.toFormat("yyyy-MM-dd");

  // make sure there is a new application object
  if (!req.session.data["new-application"]) {
    req.session.data["new-application"] = {};
  }

  // add the date to the new application object
  req.session.data["new-application"]["date"] = applicationDate;

  // redirect to the applicant details page
  res.redirect("applicant-details");
});

// applicant details page
router.get("/applicant-details", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find(prisoner => prisoner.id === req.session.data["selected-prisoner"]);
  res.render(req.protoUrl + "/applicant-details", {prisoner});
});

// redirect to the decision page
router.post("/applicant-details", function (req, res) {
  // logic for applicant details page
  if(req.session.data["applicant"] == "prisoner") {
    // add the applicant to the new application object
    req.session.data["new-application"]["applicant"] = "prisoner";
  } else {
    req.session.data["new-application"]["applicant"] = "other";
  }

  // redirect to the decision page
  res.redirect("decision");
});

// decision page
router.get("/decision", function (req, res) {
  res.render(req.protoUrl + "/decision");
});
// redirect to the review decision page
router.post("/decision", function (req, res) {
  res.redirect("review-decision");
});

// review decision page
router.get("/review-decision", function (req, res) {
  res.render(req.protoUrl + "/review-decision");
});
// redirect to the confirmation page
router.post("/review-decision", function (req, res) {
  let application = req.session.data["new-application"];
  let activityId = application.activity;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(activity => activity.id.toString() === activityId.toString());

  console.log(activity)

  // if activity doesn't have an applications key with an empty array, create it
  if (!activity.applications) {
    activity.applications = [];
  }

  // add the application to the activity applications array
  activity.applications.push(application);

  // redirect to the confirmation page
  res.redirect("confirmation");
});

// confirmation page
router.get("/confirmation", function (req, res) {
  res.render(req.protoUrl + "/confirmation");
});

module.exports = router;
