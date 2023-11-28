const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// LOG to console for all get requests
router.get("/*", function (req, res, next) {
  console.log(req.session.data["deallocation"]);
  next();
});

// routes for pages in the activities section
// activities page redirect root to /all
router.get("/:prisonerId", function (req, res) {
  let activityId = req.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  // if there is an application from this prisoner for this activity, find it and pass it to the template
  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) =>
      application["selected-prisoner"].toString() === prisonerId.toString() &&
      application["activity"].toString() === activityId.toString()
  );

  res.render(req.protoUrl + "/allocate-start", {
    prisoner,
    prisonerId,
    activity,
    application,
  });
});

// post route for the allocate-start page
router.post("/:prisonerId", function (req, res) {
  let prisonerId = req.params.prisonerId;

  if (req.body["allocate"] === "remove") {
    // if the user chooses no, go to the confirm remove prisoner page
    res.redirect("confirm-remove");
  } else if (req.body["allocate"] === "allocate") {
    // if the user chooses yes, go to the confirm allocate prisoner page
    delete req.session.data["allocation"];
    res.redirect(prisonerId + "/start-date");
  } else {
    res.redirect("../../" + req.activityId);
  }
});

// allocation start-date page
router.get("/:prisonerId/start-date", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );  

  // render the start-date template
  res.render(req.protoUrl + "/start-date", {
    activity,
    prisoner,
    prisonerId,
  });
});

// post route for the allocation start-date page
router.post("/:prisonerId/start-date", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // if there is no allocation object in the session, create one
  if (!req.session.data["allocation"] || req.session.data["allocation"] === undefined || req.session.data["allocation"] === '') {
    req.session.data["allocation"] = {};
  }

  // set the start date in the session
  if(req.body["allocation"]["start-date-type"] === "asap") {
    // set to tomorrow if the user chooses asap
    req.session.data["allocation"]["start-date"] = DateTime.now().plus({ days: 1 }).toISODate().slice(0, 10);
  } else {
    let specificStartDate = new Date();
    specificStartDate.setFullYear(req.body["allocation"]["specific-start-date"]["year"]);
    specificStartDate.setMonth(req.body["allocation"]["specific-start-date"]["month"] - 1);
    specificStartDate.setDate(req.body["allocation"]["specific-start-date"]["day"]);

    req.session.data["allocation"]["start-date"] = specificStartDate.toISOString().slice(0, 10);
  }

  let url = "end-date-check";

  // if there is a redirect query param, use that as the redirect url instead
  if (req.query.redirect) {
    url = req.query.redirect;
  }

  res.redirect(url);
});

// allocation end-date-check page
router.get("/:prisonerId/end-date-check", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // render the end-date-check template
  res.render(req.protoUrl + "/end-date-check", {
    activity,
    prisoner,
    prisonerId,
  });
});

// post route for the allocation end-date-check page
router.post("/:prisonerId/end-date-check", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  const endDateCheck = req.body["allocation"]["end-date-check"];
  const redirectParam = req.query.redirect ? `?redirect=${req.query.redirect}` : "";

  if (endDateCheck === "yes") {
    res.redirect(`end-date${redirectParam}`);
  } else {
    req.session.data["allocation"]["end-date"] = null;
    res.redirect(req.query.redirect ? "check-allocation-details" : "payrate");
  }
});

// allocation end-date page
router.get("/:prisonerId/end-date", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // render the end-date template
  res.render(req.protoUrl + "/end-date", {
    activity,
    prisoner,
    prisonerId,
  });
});

// post route for the allocation end-date page
router.post("/:prisonerId/end-date", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // if there is no allocation object in the session, create one
  if (!req.session.data["allocation"]) {
    req.session.data["allocation"] = {};
  }

  // set the end date in the session
  let endDate = new Date();
  endDate.setFullYear(req.body["allocation-end-date-year"]);
  endDate.setMonth(req.body["allocation-end-date-month"] - 1);
  endDate.setDate(req.body["allocation-end-date-day"]);

  req.session.data["allocation"]["end-date"] = endDate.toISOString().slice(0, 10);

  // set the redirect url
  let url = "payrate";

  // if there is a redirect query param, use that as the redirect url instead
  if (req.query.redirect) {
    url = req.query.redirect;
  }

  res.redirect(url);
});

// allocation payrate page
router.get("/:prisonerId/payrate", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // render the payrate template
  res.render(req.protoUrl + "/payrate", {
    activity,
    prisoner,
    prisonerId,
  });
});

// post route for the allocation payrate page
router.post("/:prisonerId/payrate", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // redirect to the check page
  res.redirect("check-allocation-details");
});

// allocation check-allocation-details page
router.get("/:prisonerId/check-allocation-details", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // render the check-allocation-details template
  res.render(req.protoUrl + "/check-allocation-details", {
    activity,
    prisoner,
    prisonerId,
  });
});

// post logic for check allocation details page
// go to the confirmation page
router.post("/:prisonerId/check-allocation-details", function (req, res) {
  // allocate the prisoner to the activity
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === req.params.prisonerId.toString()
  );
  
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === req.activityId.toString()
  );

  // if the prisoner already has an activity, add the new activity to the array
  if (prisoner.activity) {
    if (Array.isArray(prisoner.activity)) {
      prisoner.activity.push(activity.id);
    } else {
      prisoner.activity = [prisoner.activity, activity.id];
    }
  } else {
    // if the prisoner doesn't have an activity, add the new activity
    prisoner.activity = [activity.id];
  }

  // if the prisoner had an application for this activity, delete it
  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) =>
      application["selected-prisoner"].toString() === req.params.prisonerId.toString() &&
      application["activity"].toString() === req.activityId.toString() &&
      application["status"] === "pending"
  );
  if (application) {
    let index = applications.indexOf(application);
    applications.splice(index, 1);
  }

  // create a date in the format yyyy-mm-dd
  let date = new Date();
  date = date.toISOString().split("T")[0];

  // create an allocation object
  // and session data for the allocation
  // payrate, prisoner, activity, date, id
  req.session.data["allocation"] = {
    payrate: req.session.data["allocation"]["payrate"],
    prisoner: prisoner.id,
    activity: activity.id,
    date: date,
    id: Math.floor(Math.random() * 1000000000),
  };

  // add details of the allocation to the prisoner object
  if (prisoner.allocations && Array.isArray(prisoner.allocations)) {
    prisoner.allocations.push(req.session.data["allocation"]);
  } else {
    prisoner.allocations = [req.session.data["allocation"]];
  }
  // add the allocation to the allocations session data
  if (req.session.data["allocations"] && Array.isArray(req.session.data["allocations"])) {
    req.session.data["allocations"].push(req.session.data["allocation"]);
  } else {
    req.session.data["allocations"] = [req.session.data["allocation"]];
  }

  // redirect to the confirmation page
  res.redirect("allocation-confirmation?allocation=" + req.session.data["allocation"]["id"]);
});

// allocation confirmation page
router.get("/:prisonerId/allocation-confirmation", function (req, res) {
  let allocation = req.session.data["allocations"].find(
    (allocation) => allocation.id.toString() === req.query.allocation.toString()
  );

  res.render(req.protoUrl + "/allocation-confirmation", {
    allocation,
  });
});

module.exports = router;
