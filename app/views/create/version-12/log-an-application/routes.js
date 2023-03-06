const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { DateTime } = require("luxon");

router.all("*", function (req, res, next) {
  console.log(req.session.data["new-activity"]);
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
  if (req.session.data["log-new-application"] == "yes") {
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
  res.redirect("confirmation");
});

// confirmation page
router.get("/confirmation", function (req, res) {
  res.render(req.protoUrl + "/confirmation");
});

module.exports = router;
