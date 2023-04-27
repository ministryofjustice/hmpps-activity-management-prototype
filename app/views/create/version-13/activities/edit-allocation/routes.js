const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// routes for pages in the activities section
// activities page redirect root to /all
router.get("/:prisonerIds", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = [];

  // get prisoner data for each prisoner in the selected prisoners list and add it to the prisonerData array
  for (let i = 0; i < selectedPrisoners.length; i++) {
    let prisonerId = selectedPrisoners[i];
    let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === prisonerId.toString());

    prisonerData.push(prisoner);
  }

  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
  let activityIndex;

  // for each prisoner in selected prisoners, check if the prisoner activity allocation start date is in the future
  // if it is, set the start date is in future flag to true and set the activity index to the index of the activity in the prisoner's allocations
  let pastStartDate;
  for (let i = 0; i < selectedPrisoners.length; i++) {
    let prisonerId = selectedPrisoners[i];
    let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === prisonerId.toString());

    // get the allocation matching the index of the activity in the prisoner's activity list
    let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());

    let allocation = prisoner.allocations[activityIndex];
    prisoner.activityIndex = activityIndex;

    // if the allocation start date is in the future, set the start date is in future flag to true
    if (DateTime.fromISO(allocation.startDate) > DateTime.now()) {
      prisoner.startDateIsInFuture = true;
    } else {
      pastStartDate = true;
    }
  }

  // hide the confirmation dialog after showing it once
  if (req.session.data["confirmation-dialog"]) {
    delete req.session.data["confirmation-dialog"];
  }

  res.render(req.protoUrl + "/allocation-details", {
    activity,
    activityIndex,
    prisonerData,
    selectedPrisoners,
    pastStartDate,
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
  let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());

  // get the start date of the allocation index matching the activity index
  let allocation = prisoner.allocations[activityIndex];
  let startDate = {};
  startDate.day = DateTime.fromISO(allocation.startDate).day;
  startDate.month = DateTime.fromISO(allocation.startDate).month;
  startDate.year = DateTime.fromISO(allocation.startDate).year;

  // render the start-date template
  res.render(req.protoUrl + "/start-date", {
    activity,
    prisoner,
    prisonerId,
    startDate,
  });
});

// post route for the allocation start-date page
router.post("/:prisonerId/start-date", function (req, res) {
  let prisonerId = req.params.prisonerId;

  // if there is no allocation object in the session, create one
  if (
    !req.session.data["allocation"] ||
    req.session.data["allocation"] === undefined ||
    req.session.data["allocation"] === ""
  ) {
    req.session.data["allocation"] = {};
  }

  // set the start date in the session
  let specificStartDate = new Date();
  specificStartDate.setFullYear(req.body["allocation"]["start-date"]["year"]);
  specificStartDate.setMonth(req.body["allocation"]["start-date"]["month"] - 1);
  specificStartDate.setDate(req.body["allocation"]["start-date"]["day"]);

  req.session.data["allocation"]["start-date"] = specificStartDate.toISOString().slice(0, 10);

  // get the index of the allocation in the prisoner's allocations array based on the index of the activity in the prisoner's activity array
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());

  // update the start date of the matching allocation in the prisoner's allocations array
  prisoner.allocations[activityIndex].startDate = req.session.data["allocation"]["start-date"];
  // and delete the allocation object from the session
  delete req.session.data["allocation"];

  // show the confirmation message
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "start-date",
    prisoner: prisonerId,
  };

  let selectedPrisoners = req.session.data["selected-prisoners"].split(",");
  let url = "../" + selectedPrisoners.join(",");

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
  let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());

  // set the allocation to the index of the activity in the prisoner's activity array
  let allocation = prisoner.allocations[prisoner.activityIndex];

  // render the end-date-check template
  res.render(req.protoUrl + "/end-date-check", {
    activity,
    prisoner,
    prisonerId,
    allocation,
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
    // set the end date for the prisoner's allocation to null
    let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());
    let allocation = prisoner.allocations[activityIndex];
    allocation.endDate = null;
    // then redirect to the confirmation page
    // and show the confirmation message
    req.session.data["confirmation-dialog"] = {
      display: true,
      change: "end-date",
      prisoner: prisonerId,
    };
    let selectedPrisoners = req.session.data["selected-prisoners"].split(",");
    res.redirect("../" + selectedPrisoners.join(","));
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
  let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());

  // get the end date of the allocation index matching the activity index
  let allocation = prisoner.allocations[activityIndex];

  let endDate = {};
  endDate.day = DateTime.fromISO(allocation.endDate).day;
  endDate.month = DateTime.fromISO(allocation.endDate).month;
  endDate.year = DateTime.fromISO(allocation.endDate).year;

  // render the end-date template
  res.render(req.protoUrl + "/end-date", {
    activity,
    prisoner,
    prisonerId,
    allocation,
    endDate,
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

  let endDate = new Date();

  // if the user selects to end the allocation before the next session, set the end date to tomorrow
  if (req.body["allocation-end-date"] === "before-next-session") {
    endDate.setDate(endDate.getDate() + 1);
  } else {
    // otherwise, set the end date to the date from the form
    endDate.setFullYear(req.body["specific-end-date-year"]);
    endDate.setMonth(req.body["specific-end-date-month"] - 1);
    endDate.setDate(req.body["specific-end-date-day"]);
  }

  // set the endDate of the prisoner's allocation to the end date from the form
  // make sure the date is in ISO format
  let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());
  endDate = DateTime.fromJSDate(endDate).toISODate();
  prisoner.allocations[activityIndex].endDate = endDate;

  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "end-date",
    prisoner: prisonerId,
  };

  let selectedPrisoners = req.session.data["selected-prisoners"].split(",");
  let url = "../" + selectedPrisoners.join(",");
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

  // set the prisoner's payrate to the value from the form
  prisoner.payrate = req.body["payrate"];

  // set the confirmation dialog to display
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "pay-rate",
    prisoner: prisonerId,
  };

  let selectedPrisoners = req.session.data["selected-prisoners"].split(",");

  // redirect to the allocation details page for selected prisoners
  res.redirect("../" + selectedPrisoners.join(","));
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

module.exports = router;
