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
  res.redirect("select-prisoner");
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

  req.session.data["new-application"] = {}

  if (matchingPrisoners.length > 0) {
    res.render(req.protoUrl + "/select-prisoner", {
      matchingPrisoners,
    });
    return;
  } else {
    res.redirect("prisoner-search");
  }
});
// select prisoner page post logic
router.post("/select-prisoner", function (req, res) {
  let selectedPrisoner = req.session.data["new-application"]["selected-prisoner"];

  res.redirect(selectedPrisoner + "/application-date");
});

// prisoner existing applications page
router.get("/prisoner-existing-applications", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner;

  // if there is a selected prisoner
  if (req.session.data["new-application"] && req.session.data["new-application"]["selected-prisoner"]) {
    prisoner = prisoners.find(
      (prisoner) =>
        prisoner.id === req.session.data["new-application"]["selected-prisoner"]
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
  if (!req.session.data["new-application"]["selected-prisoner"]) {
    req.session.data["new-application"]["selected-prisoner"] =
      req.session.data["timetable-complete-1"]["prisoners"][0].id;
  }

  // logic for the log new application radios
  if (req.session.data["log-new-application"] == "no") {
    res.redirect("confirmation");
  } else {
    // create an empty application object if there isn't one already
    if (!req.session.data["new-application"]) {
      req.session.data["new-application"] = {
        prisoner: req.session.data["new-application"]["selected-prisoner"],
      };
    }

    res.redirect("application-date");
  }
});

// select activity page
router.get("/:prisonerId/select-activity", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];

  res.render(req.protoUrl + "/select-activity", {
    activities,
  });
});
// redirect to the application date page
router.post("/:prisonerId/select-activity", function (req, res) {
  let activityId = req.session.data["new-application"]["activity"];
  // res.redirect(activityId + "/priority");
  res.redirect(activityId + "/applicant-details");
});

// check activity page logic
router.post("/check-activity", function (req, res) {
  // check if the user has selected yes or no
  if (req.session.data["new-application"]["activity"] == "no") {
    delete req.session.data["new-application"]["activity"];
    res.redirect("select-activity");
  } else {
    res.redirect("application-date");
  }
});

// application date page
router.get("/:prisonerId/application-date", function (req, res) {
  res.render(req.protoUrl + "/application-date");
});

// redirect to the applicant details page
router.post("/:prisonerId/application-date", function (req, res) {
  // check the user has entered a date
  if (
    !req.session.data["application-date-day"] ||
    !req.session.data["application-date-month"] ||
    !req.session.data["application-date-year"]
  ) {
    // make a random date (yyyy-mm-dd) and add it to the session data
    let date = new Date();
    req.session.data["application-date-day"] = date.getDate();
    req.session.data["application-date-month"] = date.getMonth() + 1;
    req.session.data["application-date-year"] = date.getFullYear();
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
  res.redirect("select-activity");
});

// applicant details page
router.get("/:prisonerId/:activityId/applicant-details", function (req, res) {
  // make sure there is a new application object
  if (!req.session.data["new-application"]) {
    req.session.data["new-application"] = {};
  }

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find(
    (prisoner) =>
      prisoner.id === req.params.prisonerId
  );
  res.render(req.protoUrl + "/applicant-details", { prisoner });
});

// redirect to the decision page
router.post("/:prisonerId/:activityId/applicant-details", function (req, res) {
  // logic for applicant details page
  if (req.session.data["applicant"] == "prisoner" || req.session.data["applicant"] == "iag") {
    // add the applicant to the new application object
    req.session.data["new-application"]["applicant"] = req.session.data["applicant"];
  } else {
    let applicant = req.session.data["other-applicant"];
    if (applicant) {
      req.session.data["new-application"]["applicant"] = applicant;
    } else {
      res.redirect("applicant-details");
    }
  }

  // redirect to the decision page
  res.redirect("status");
});

// priotity page
router.get("/:prisonerId/:activityId/priority", function (req, res) {
  // render the priority page
  res.render(req.protoUrl + "/priority");
});

// post route for the priority page
router.post("/:prisonerId/:activityId/priority", function (req, res) {
  // redirect to the status page
  res.redirect("status");
});


// checked eligibility page logic
router.post("/checked-eligibility", function (req, res) {
  // logic for checked eligibility page
  if (req.session.data["checked-eligibility"] == "yes") {
    // set the eligibilty flag on the new application object
    req.session.data["new-application"]["eligibility-check"] = true;
    // and set the date of the eligibility check to today
    req.session.data["new-application"]["eligibility-check-date"] =
      DateTime.now().toFormat("yyyy-MM-dd");

    res.redirect("check-application-details");
  } else {
    req.session.data["new-application"]["eligibility-check"] = false;
    res.redirect("check-eligibility-now");
  }
});

// check eligibility now page logic
router.post("/check-eligibility-now", function (req, res) {
  // logic for select check eligibility now page
  if (req.session.data["check-eligibility-now"] == "yes") {
    res.redirect("check-eligibility");
  } else {
    res.redirect("check-application-details");
  }
});

// status page
router.get("/:prisonerId/:activityId/status", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let selectedPrisoner = req.params.prisonerId;
  let prisoner = prisoners.find((prisoner) => prisoner.id === selectedPrisoner);

  let activityId = req.params.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // if there is no new application object, get a placeholder one from the applications session data
  if (!req.session.data["new-application"]) {
    req.session.data["new-application"] = req.session.data["applications"][0];
  }

  res.render(req.protoUrl + "/status", {
    prisoner,
    activity,
  });
});

// POST - status page
router.post("/:prisonerId/:activityId/status", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let activityId = req.params.activityId;

  // construct the new application object
  let newApplication = {
    id: req.session.data["new-application"]["id"],
    date: req.session.data["new-application"]["date"],
    applicant: req.session.data["new-application"]["applicant"],
    eligible: req.session.data["new-application"]["eligible"],
    eligibilityCheck: req.session.data["new-application"]["eligibility-check"],
    eligibilityCheckDate:
      req.session.data["new-application"]["eligibility-check-date"],
    status: req.session.data["new-application"]["status"],
    "selected-prisoner": prisonerId,
    activity: activityId,
    comments: req.session.data["new-application"]["comments"],
  };

  // add the new application object to the session data
  req.session.data["new-application"] = newApplication;

  // redirect to the check application details page
  res.redirect("../../check-application-details");
});

// check eligibility page
router.get("/check-eligibility", function (req, res) {
  // if there is no new application object, get a placeholder one from the applications session data
  if (!req.session.data["new-application"]) {
    req.session.data["new-application"] = req.session.data["applications"][0];
  }

  res.render(req.protoUrl + "/check-eligibility");
});

// check eligibility page logic
router.post("/check-eligibility", function (req, res) {
  // if eligibility is either eligible or ineligible, set the eligibility flag on the new application object
  if (
    req.session.data["new-application"]["eligible"] == "yes" ||
    req.session.data["new-application"]["eligible"] == "no"
  ) {
    // set the date of the eligibility check to today
    req.session.data["new-application"]["eligibility-check-date"] =
      DateTime.now().toFormat("yyyy-MM-dd");
  } else {
    req.session.data["new-application"]["eligibility-check-date"] = "";
  }

  res.redirect("check-application-details");
});

// check application details page
router.get("/check-application-details", function (req, res) {
  // if there is no new application object, get a placeholder one from the applications session data
  if (!req.session.data["new-application"]) {
    req.session.data["new-application"] = req.session.data["applications"][0];

    // add a random date to the new application object
    let date = new Date();
    req.session.data["new-application"]["date"] = date.toISOString().slice(0, 10);

    // add a random prisoner to the new application object
    req.session.data["new-application"]["prisoner"] =
      req.session.data["timetable-complete-1"]["prisoners"][0].id;
  }

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let selectedPrisoner = req.session.data["new-application"]["prisoner"];
  let prisoner = prisoners.find((prisoner) => prisoner.id === selectedPrisoner);

  let activityId = req.session.data["new-application"]["activity"];
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  res.render(req.protoUrl + "/check-application-details", {
    prisoner,
    activity,
  });
});
// redirect to the applications list page
router.post("/check-application-details", function (req, res) {
  // if there is no new application object, get a placeholder one from the applications session data
  if (!req.session.data["new-application"]) {
    req.session.data["new-application"] = req.session.data["applications"][0];
  }

  // add a random id to the new application object
  let id = Math.floor(Math.random() * 1000000000);
  req.session.data["new-application"]["id"] = id;
  req.session.data["last-application"] = id;

  // if the application status is approved and allocate-now is yes then allocate the prisoner to the activity
  // do this by adding the activity id to the prisoner's activity array
  if (req.session.data["allocate-now"] == "yes" && req.session.data["new-application"]["status"] == "approved") {
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisoner = prisoners.find(
      (prisoner) =>
        prisoner.id === req.session.data["new-application"]["selected-prisoner"]
    );
    console.log(prisoner)
    if (prisoner) {
      // if the prisoner doesn't have an activity array, or the activity array is null, create one
      if (!prisoner.activity || prisoner.activity == null) {
        prisoner.activity = [];
      }
      // add the activity id to the prisoner's activity array
      prisoner.activity.push(parseInt(req.session.data["new-application"]["activity"]));
    }
  } else if (req.session.data["new-application"]["status"] == "approved" || req.session.data["new-application"]["status"] == "pending") {
    req.session.data["applications"].push(req.session.data["new-application"]);
  }

  // redirect to confirmation page
  res.redirect("confirmation?application=" + id);
});

// applications list page
router.get("/applications-list", function (req, res) {
  res.render(req.protoUrl + "/applications-list");
});
// redirect to the confirmation page
router.post("/applications-list", function (req, res) {
  res.redirect("confirmation");
});

// confirmation page
router.get("/confirmation", function (req, res) {
  let application = req.session.data["new-application"];

  let activityId = req.session.data["new-application"]["activity"];
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let selectedPrisoner = req.session.data["new-application"]["selected-prisoner"];
  let prisoner = prisoners.find((prisoner) => prisoner.id === selectedPrisoner);

  res.render(req.protoUrl + "/confirmation", {
    application,
    prisoner,
    activity,
  })
});
// redirect logic for the confirmation page
router.post("/confirmation", function (req, res) {
  if (req.session.data["add-application-next-step"] == "decision") {
    res.redirect("decision");
  } else if (req.session.data["add-application-next-step"] == "add-another") {
    res.redirect("check-same-details");
  } else {
    let activity = req.session.data["new-application"]["activity"];
    req.session.data["application-added-confirmation-message"] = true;
    res.redirect("../activities/" + activity + "/applications");
  }
});

// check same details page
router.get("/check-same-details", function (req, res) {
  let applications = req.session.data["applications"];
  let lastApplication = applications.find(
    (application) => application.id === req.session.data["last-application"]
  );

  res.render(req.protoUrl + "/check-same-details", { lastApplication });
});
// logic for the check same details page
router.post("/check-same-details", function (req, res) {
  let lastApplication = req.session.data["applications"].find(
    (application) => application.id === req.session.data["last-application"]
  );

  req.session.data["new-application"] = {};

  if (req.session.data["use-details"] == "prisoner") {
    // set the prisoner id to the new application object
    req.session.data["new-application"]["selected-prisoner"] =
      lastApplication["selected-prisoner"];
    res.redirect("prisoner-existing-applications");
  } else if (req.session.data["use-details"] == "activity") {
    // set the activity id to the new application object
    req.session.data["new-application"]["activity"] = lastApplication.activity;
    res.redirect("prisoner-search");
  } else {
    res.redirect("prisoner-search");
  }
});

// check same prisoner page logic
router.post("/check-same-prisoner", function (req, res) {
  if (req.session.data["same-prisoner"] == "yes") {
    res.redirect("prisoner-existing-applications");
  } else {
    res.redirect("prisoner-search");
  }
});

//redirect to the decision confirmation page
router.post("/decision", function (req, res) {
  res.redirect("decision-confirmation");
});

// decision confirmation page logic
router.post("/decision-confirmation", function (req, res) {
  if (req.session.data["decision-next-step"] == "add-another") {
    res.redirect("check-same-prisoner");
  } else {
    req.session.data["application-added-confirmation-message"] = true;
    res.redirect("../activities/2/applications");
  }
});

// quick allocate page
router.get("/quick-allocate/:applicationId", function (req, res) {
  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) => application.id === parseInt(req.params.applicationId)
  );

  res.render(req.protoUrl + "/quick-allocate", { application });
});



module.exports = router;
