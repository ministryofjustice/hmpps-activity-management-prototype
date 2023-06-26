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

    // check if there are any pay rates with the same incentive level as the prisoner's incentive level
    // or if there are any flat rate pay rates
    prisoner.payRatesForIncentiveLevel = false;

    // get all payrates which match the prisoner's incentive level and also any flat rate payrates
    let suitablePayrates = activity.payRates.filter(
      (payRate) => payRate.incentiveLevel === prisoner.incentiveLevel || payRate.isFlatRate === "true"
    );

    // if there are any pay rates, set the pay rates for incentive level flag to true
    if (suitablePayrates.length > 0) {
      prisoner.payRatesForIncentiveLevel = true;
    }

    // if the allocation start date is in the future, set the start date is in future flag to true
    if (DateTime.fromISO(allocation.startDate) > DateTime.now()) {
      prisoner.startDateIsInFuture = true;
    } else {
      pastStartDate = true;
    }
  }

  // pass the activity schedule to the template
  let activitySchedule = activity.schedule;
  let schedule = getActivitySchedule(activitySchedule);

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
    schedule,
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

  // check if the start date is in the past
  let startDate = DateTime.fromISO(allocation.startDate);
  let today = DateTime.now();
  let startDateInPast = startDate < today;

  // render the end-date template
  res.render(req.protoUrl + "/end-date", {
    activity,
    prisoner,
    prisonerId,
    allocation,
    endDate,
    startDateInPast,
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

  // get all payrates which match the prisoner's incentive level and also any flat rate payrates
  let payRatesForIncentiveLevel = activity.payRates.filter(
    (payRate) => payRate.incentiveLevel === prisoner.incentiveLevel || payRate.isFlatRate === "true"
  );

  console.log(activity.payRates);

  // render the payrate template
  res.render(req.protoUrl + "/payrate", {
    activity,
    prisoner,
    prisonerId,
    payRatesForIncentiveLevel,
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

  // set the prisoner's payrate to the payrate with the same id as the one selected in the form
  let payRate = activity.payRates.find((payRate) => payRate.payRate_id.toString() === req.body["payrate"].toString());
  prisoner.payrate = payRate;

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

// get route for the schedule page
router.get("/:prisonerId/schedule", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let activitySchedule = activity.schedule;

  // copy the schedule object and remove any days which don't have any sessions (am or pm is not null)
  let daysWithSessions = JSON.parse(JSON.stringify(activitySchedule));
  daysWithSessions = daysWithSessions.filter(
    (day) => day.am !== null || day.pm !== null
  );

  // render the schedule template
  res.render(req.protoUrl + "/schedule-v4", {
    activity,
    activitySchedule,
    daysWithSessions,
    prisoner,
    prisonerId,
  });
});

// get route for the schedule page
router.get("/:prisonerId/schedule-v2", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let activitySchedule = activity.schedule;

  // render the schedule template
  res.render(req.protoUrl + "/schedule-v2", {
    activity,
    activitySchedule,
    prisoner,
    prisonerId,
  });
});


// get route for the schedule page
router.get("/:prisonerId/schedule-v3", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let activitySchedule = activity.schedule;

  // copy the schedule object and remove any days which don't have any sessions (am or pm is not null)
  let daysWithSessions = JSON.parse(JSON.stringify(activitySchedule));
  daysWithSessions = daysWithSessions.filter(
    (day) => day.am !== null || day.pm !== null
  );

  // render the schedule template
  res.render(req.protoUrl + "/schedule-v3", {
    daysWithSessions,
    activity,
    activitySchedule,
    prisoner,
    prisonerId,
  });
});

// get route for the schedule page
router.get("/:prisonerId/schedule-v4", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let activitySchedule = activity.schedule;

  // copy the schedule object and remove any days which don't have any sessions (am or pm is not null)
  let daysWithSessions = JSON.parse(JSON.stringify(activitySchedule));
  daysWithSessions = daysWithSessions.filter(
    (day) => day.am !== null || day.pm !== null
  );

  // render the schedule template
  res.render(req.protoUrl + "/schedule-v4", {
    daysWithSessions,
    activity,
    activitySchedule,
    prisoner,
    prisonerId,
  });
});


// post route for the schedule page
router.post("/:prisonerId/schedule", function (req, res) {
  //redirect to the prisoner's allocation details page with a success message
  res.redirect("../" + req.params.prisonerId);
});

// get route for the check-schedule page
router.get("/:prisonerId/check-schedule", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let activitySchedule = activity.schedule;

  let schedule = getActivitySchedule(activitySchedule);

  // generate a random new schedule for the activity and add it to the schedule object
  // {day:1, amNew: [{"startTime":"8:30","endTime":"12:00"}], pmNew: null ... 
  
  // add amNew and pmNew to the schedule object
  let newSchedule = schedule.map((day) => {
    // for each period (am/pm), if the value is null, skip it
    // if the value is not null, randomly assign it a value either the same as the original value or null
    let period = ["am", "pm"];

    period.forEach((period) => {
      if (day[period] !== null) {
        day[period + "New"] = Math.random() < 0.5 ? day[period] : null;
      }
    });

    return day;
  });
  
  // render the check-schedule template
  res.render(req.protoUrl + "/check-schedule", {
    activity,
    schedule,
    newSchedule,
    prisoner,
    prisonerId,
  });
});


module.exports = router;

// generate the activity schedule from the activity schedule data
function getActivitySchedule(activitySchedule) {
  return activitySchedule.map((day) => {
    // convert each day number to the name of the weekday
    // 1 = monday, 2 = tuesday, etc.
    let dayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    let dayName = dayNames[day.day];

    // return the day name and am/pm values
    return {
      day: dayName,
      am: day.am,
      pm: day.pm,
    };
  });
}