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
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // render the page
  res.render(req.protoUrl + "/name", {
    activity,
    activityId,
  });
});

// edit activity name POST route
router.post("/name", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "Activity name",
  };

  // update the activity name
  activity.name = req.body.name;

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity category page
router.get("/category", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activityCategory = activity.category;
  let activityCategoryName = req.session.data["timetable-complete-1"]["categories"].find(
    (category) => category.id == activityCategory
  ).name;

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
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity category
  activity.category = req.body["activity-category"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "category",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity risk assessment page
router.get("/risk-assessment-level", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
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
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // redirect to the risk assessment warning page if the risk assessment is set to high
  if (req.body["risk-assessment-level"] == "low-low-low-only") {
    res.redirect("risk-assessment-level-warning");
  } else {
    // update the activity risk assessment
    activity.riskAssessment = req.body["risk-assessment-level"];

    // set the confirmation message to be displayed on the activity page
    req.session.data["confirmation-dialog"] = {
      display: true,
      change: "risk assessment",
    };

    // redirect to the activity page
    res.redirect("../../" + activityId + "/details");
  }
});

// risk assessment warning page
router.get("/risk-assessment-level-warning", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activityRiskAssessment = activity.riskAssessment;

  // render the page
  res.render(req.protoUrl + "/risk-assessment-level-warning", {
    activity,
    activityId,
    activityRiskAssessment,
  });
});

// risk assessment warning POST route
router.post("/risk-assessment-level-warning", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity risk assessment
  activity.riskAssessment = req.body["risk-assessment-level"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "risk assessment",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity location page
router.get("/location", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activityLocation = activity.location;

  // get a list of unique activity locations from the activities array
  let locations = activities.map((activity) => activity.location);
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
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity location
  activity.location = req.body["activity-location"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "location",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity schedule page
router.get("/schedule", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // render the page
  res.render(req.protoUrl + "/schedule", {
    activity,
    activityId,
    activitySchedule,
  });
});

// edit activity schedule POST route
router.post("/schedule", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  let schedule = [];
  let periods = ["am", "pm", "ed"];
  let days = [0, 1, 2, 3, 4, 5, 6];

  // set the daysData variable to the days array, but remove _unchecked values so that the daysData array only contains the days that have been selected
  let daysData = req.body.days.filter((day) => day != "_unchecked");

  // create the structure for the schedule object
  for (let day of days) {
    let scheduleDay = {
      day: day,
      am: null,
      pm: null,
      ed: null,
    };
    schedule.push(scheduleDay);
  }

  // update the schedule object with the periods that have been selected for each day
  for (let day of daysData) {
    let selectedPeriods = req.body["times-" + day];
    for (let period of periods) {
      if (selectedPeriods.includes(period)) {
        let periodTimes = getPeriodTimes(period);
        let scheduleDay = schedule.find((scheduleDay) => scheduleDay.day == day);
        scheduleDay[period] = [periodTimes];
      }
    }
  }

  // update the activity schedule with the new schedule object
  activity.schedule = schedule;

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "schedule",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");

  // function to set generic start and end times for a given period
  function getPeriodTimes(period) {
    let periodTimes = [];
    switch (period) {
      case "am":
        periodTimes = { startTime: "9:00", endTime: "12:00" };
        break;
      case "pm":
        periodTimes = { startTime: "13:00", endTime: "16:00" };
        break;
      case "ed":
        periodTimes = { startTime: "16:00", endTime: "18:00" };
        break;
    }
    return periodTimes;
  }
});

// edit activity bank holidays page
router.get("/bank-holidays", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // render the page
  res.render(req.protoUrl + "/bank-holidays", {
    activity,
    activityId,
    activitySchedule,
  });
});

// edit activity bank holidays POST route
router.post("/bank-holidays", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity bank holidays
  activity.bankHolidays = req.body["bank-holidays"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "bank holidays",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity start date page
router.get("/start-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // convert the activity start date data to 3 separate variables using luxon
  let startDate = {};
  startDate.day = DateTime.fromISO(activity.startDate).day;
  startDate.month = DateTime.fromISO(activity.startDate).month;
  startDate.year = DateTime.fromISO(activity.startDate).year;

  // render the page
  res.render(req.protoUrl + "/start-date", {
    activity,
    activityId,
    activitySchedule,
    startDate,
  });
});

// edit activity start date POST route
router.post("/start-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // convert the start date day, month and year to a single ISO date string
  let startDate = DateTime.fromObject({
    day: req.body["start-date-day"],
    month: req.body["start-date-month"],
    year: req.body["start-date-year"],
  }).toISODate();

  // update the activity start date
  activity.startDate = startDate;

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "start date",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity end date page
router.get("/end-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);
  let activitySchedule = activity.schedule;

  // convert the activity end date data to 3 separate variables using luxon
  let endDate = {};
  endDate.day = DateTime.fromISO(activity.endDate).day;
  endDate.month = DateTime.fromISO(activity.endDate).month;
  endDate.year = DateTime.fromISO(activity.endDate).year;

  // render the page
  res.render(req.protoUrl + "/end-date", {
    activity,
    activityId,
    activitySchedule,
    endDate,
  });
});

// edit activity end date POST route
router.post("/end-date", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // convert the end date day, month and year to a single ISO date string
  let endDate = DateTime.fromObject({
    day: req.body["end-date-day"],
    month: req.body["end-date-month"],
    year: req.body["end-date-year"],
  }).toISODate();

  // if the activity does not have an end date, create an empty object
  if (!activity.endDate) {
    activity.endDate = {};
  }

  // update the activity end date
  activity.endDate = endDate;

  // check if there are any prisoners allocated to the activity who have an end date before the activity end date
  // if so, set the prisoner end date to be the same as the activity end date
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // create an array of prisoners who are allocated to the activity
  // make sure we only check prisoners if they have activity array and the activity array is not empty or null
  let allocatedPrisoners = prisoners.filter((prisoner) => prisoner.activity && prisoner.activity.length > 0);

  // filter the prisoners to only include those who are allocated to the activity
  // we need to convert both to strings to make sure the comparison works
  allocatedPrisoners = allocatedPrisoners.filter((prisoner) =>
    prisoner.activity.toString().includes(activityId.toString())
  );

  // loop through the prisoners who are allocated to the activity
  allocatedPrisoners.forEach((prisoner) => {
    let prisonerAllocations = prisoner.allocations; // get the prisoner allocations

    // find the index of the allocation for the activity
    let activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());

    // get the allocation for the activity
    let prisonerAllocation = prisonerAllocations[activityIndex];

    // change the prisoner allocation end date if necessary
    // if the end date is null, undefined or the prisoner allocation end date is after the activity end date
    // update the prisoner allocation end date to be the same as the activity end date
    if (
      prisonerAllocation.endDate == null ||
      prisonerAllocation.endDate == undefined ||
      DateTime.fromISO(prisonerAllocation.endDate) > DateTime.fromISO(activity.endDate)
    ) {
      prisonerAllocation.endDate = endDate;
      prisonerAllocation.endDateType = "activity"
    }
  });

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "end date",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity capacity page
router.get("/capacity", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // calculate the number of allocations for the activity
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let currentlyAllocatedCount = 0;
  prisoners.forEach((prisoner) => {
    if (prisoner.activity) {
      for (let i = 0; i < prisoner.activity.length; i++) {
        if (prisoner.activity[i].toString() == activityId.toString()) {
          currentlyAllocatedCount++;
        }
      }
    }
  });

  // render the page
  res.render(req.protoUrl + "/capacity", {
    activity,
    activityId,
    currentlyAllocatedCount,
  });
});

// edit activity capacity POST route
router.post("/capacity", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // calculate the number of allocations for the activity
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let currentlyAllocatedCount = 0;
  prisoners.forEach((prisoner) => {
    if (prisoner.activity) {
      for (let i = 0; i < prisoner.activity.length; i++) {
        if (prisoner.activity[i].toString() == activityId.toString()) {
          currentlyAllocatedCount++;
        }
      }
    }
  });

  // check if the new capacity is less than the current number of allocations
  if (currentlyAllocatedCount > req.body["capacity"]) {
    // redirect to the activity capacity warning page
    res.redirect("capacity-warning");

    return;
  } else {
    // update the activity capacity
    activity.capacity = req.body["capacity"];

    // set the confirmation message to be displayed on the activity page
    req.session.data["confirmation-dialog"] = {
      display: true,
      change: "capacity",
    };

    // redirect to the activity page
    res.redirect("../../" + activityId + "/details");

    return;
  }
});

// edit activity capacity warning page
router.get("/capacity-warning", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // calculate the number of allocations for the activity
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let currentlyAllocatedCount = 0;
  prisoners.forEach((prisoner) => {
    if (prisoner.activity) {
      for (let i = 0; i < prisoner.activity.length; i++) {
        if (prisoner.activity[i].toString() == activityId.toString()) {
          currentlyAllocatedCount++;
        }
      }
    }
  });

  // render the page
  res.render(req.protoUrl + "/capacity-warning", {
    activity,
    activityId,
    currentlyAllocatedCount,
  });
});

// edit activity capacity warning POST route
router.post("/capacity-warning", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // update the activity capacity
  activity.capacity = req.session.data["capacity"];

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "capacity",
  };

  // redirect to the activity page
  res.redirect("../../" + activityId + "/details");
});

// edit activity education level list page
router.get("/education-levels", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // if the delete dialog has been set to true, delete it
  if (req.session.data["show-delete-dialog"] && req.session.data["show-delete-dialog"] == true) {
    delete req.session.data["show-delete-dialog"];
  }

  let educationLevels = [];

  // if the activity has education levels already, we need to pass them to the page
  if (activity.educationLevels) {
    educationLevels = activity.educationLevels;
  } else {
    // but if the activity doesn't have education levels, we need to set the session data to an empty array
    // unless the session data already exists, in which case we don't want to overwrite it
    if (!req.session.data["education-levels"]) {
      req.session.data["education-levels"] = [];
    } else {
      educationLevels = req.session.data["education-levels"];
    }
  }

  // render the page
  res.render(req.protoUrl + "/education-level-list", {
    activity,
    activityId,
    educationLevels,
  });
});

// edit activity education level list post route
router.post("/education-levels", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // if the user wants to add another education level, redirect to the add education level page
  if (req.body["add-another-education-level"] == "yes") {
    res.redirect("add-education-level");
    return;
  } else {
    // otherwise, update the activity education levels
    activity.educationLevels = req.session.data["education-levels"];

    // set the confirmation message to be displayed on the activity page
    req.session.data["confirmation-dialog"] = {
      display: true,
      change: "education levels",
    };

    // redirect to the activity page
    res.redirect("../details");
    return;
  }
});

// remove activity education level get route
// this just removes the education level from the education levels session data and redirects back to the education levels list page with a confirmation message
router.get("/remove-education-level/:educationLevelId", function (req, res) {
  let educationLevels = req.session.data["education-levels"];
  let educationLevelId = req.params.educationLevelId;
  let educationLevel = educationLevels.find((educationLevel) => educationLevel.id == educationLevelId);

  // remove the education level from the education levels session data
  educationLevels.splice(educationLevels.indexOf(educationLevel), 1);

  // set the confirmation message to be displayed on the education levels list page
  req.session.data["show-delete-dialog"] = true;

  // redirect to the education levels list page
  res.redirect("../education-levels");
});

// edit activity education level page
router.get("/add-education-level", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // render the page
  res.render(req.protoUrl + "/education-level", {
    activity,
    activityId,
  });
});

// edit activity education level POST route
router.post("/add-education-level", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // if there is no session data for education levels, create it
  if (!req.session.data["education-levels"]) {
    req.session.data["education-levels"] = [];
  }

  // add the new education level to the session data
  req.session.data["education-levels"].push({
    id: req.session.data["education-levels"].length + 1,
    name: req.body["education-level"],
  });

  // set the confirmation message to be displayed on the activity page
  req.session.data["confirmation-dialog"] = {
    display: true,
    change: "education level",
  };

  // redirect to the education level list page
  res.redirect("education-levels");
});

// pay-rates page
router.get("/pay-rates", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // remove payrates that do not have a value
  let payRates = activity.payRates.filter((payRate) => payRate.amount !== null);

  // convert payrates array to object grouped by incentive level keys
  // incentive levels: [basic, standard, enhanced]
  let incentiveLevels = ["basic", "standard", "enhanced"];
  let payRatesByIncentiveLevel = {};
  incentiveLevels.forEach((incentiveLevel) => {
    payRatesByIncentiveLevel[incentiveLevel] = payRates.filter(
      (payRate) => payRate.incentiveLevel === incentiveLevel
    );
  });

  // render the page
  res.render(req.protoUrl + "/pay-rates", {
    activity,
    activityId,
    payRatesByIncentiveLevel,
  });
});

// pay rate page
router.get("/pay-rate", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // render the page
  res.render(req.protoUrl + "/pay-rate", {
    activity,
    activityId,
  });
});

// delete pay rate check page
router.get("/delete-pay-rate-check", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id == activityId);

  // render the page
  res.render(req.protoUrl + "/delete-pay-rate-check", {
    activity,
    activityId,
  });
});

module.exports = router;
