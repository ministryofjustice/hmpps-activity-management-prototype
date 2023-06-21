const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { DateTime } = require("luxon");
const e = require("express");
const { isObject } = require("lodash");

router.all("*", function (req, res, next) {
  // if there's no new-activity session data, set it to an empty object
  if (!req.session.data["new-activity"]) {
    req.session.data["new-activity"] = {};
  }

  // if there's no category session data, set it to a random number between 1 and 7
  if (!req.session.data["new-activity"]["category"]) {
    req.session.data["new-activity"]["category"] = Math.floor(Math.random() * 7) + 1;
  }

  console.log(req.session.data["new-activity"]);
  next();
});

//redirect the root url to the start page
router.get("/", function (req, res) {
  res.redirect("create-activity/select-category");
});

// create activity select category page
router.get("/select-category", function (req, res) {
  res.render(req.protoUrl + "/select-category");
});
router.post("/select-category", function (req, res) {
  res.redirect("activity-name");
});

// create activity activity name page
router.get("/activity-name", function (req, res) {
  res.render(req.protoUrl + "/activity-name");
});
//redirect to create activity risk assessment page
router.post("/activity-name", function (req, res) {
  res.redirect("select-activity-location");
});

// activity location select page
router.get("/select-activity-location", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let locations = activities.map((activity) => activity.location);
  locations = [...new Set(locations)];

  res.render(req.protoUrl + "/select-activity-location", {
    locations,
  });
});
// redirect to allocation count page
router.post("/select-activity-location", function (req, res) {
  res.redirect("capacity");
});

// capacity page
router.get("/capacity", function (req, res) {
  res.render(req.protoUrl + "/capacity");
});
// redirect to new activity check answers page
router.post("/capacity", function (req, res) {
  res.redirect("risk-assessment-levels");
});

// risk assessment levels page
router.get("/risk-assessment-levels", function (req, res) {
  res.render(req.protoUrl + "/risk-assessment-levels");
});
// redirect to payment details page
router.post("/risk-assessment-levels", function (req, res) {
  res.redirect("education-level-check");
});

// education level check page
router.get("/education-level-check", function (req, res) {
  res.render(req.protoUrl + "/education-level-check");
});
// logic for education level check page
router.post("/education-level-check", function (req, res) {
  if (req.session.data["education-level-check"] === "yes") {
    res.redirect("select-education-level");
  } else {
    delete req.session.data.educationLevels;
    res.redirect("start-date");
  }
});

// select education level page
router.get("/select-education-level", function (req, res) {
  res.render(req.protoUrl + "/select-education-level");
});
// redirect to education level list page
router.post("/select-education-level", function (req, res) {
  const educationLevel = req.body["education-level"];
  const educationAreaOfStudy = req.body["area-of-study"];

  // Get the ID for the educationLevel or generate a random one
  let educationId = req.query.id ? req.query.id : crypto.randomBytes(4).toString("hex");

  let educationLevelData = {
    id: educationId,
    name: educationLevel,
    areaOfStudy: educationAreaOfStudy,
  };

  // Check if the educationLevelData already exists in the educationLevels array
  let educationLevels = req.session.data.educationLevels || [];

  if (!educationLevels.find((level) => level.id === educationId)) {
    educationLevels.push(educationLevelData);
  } else {
    // If the educationLevelData already exists, update it
    educationLevels = educationLevels.map((level) => {
      if (level.id === educationId) {
        level.name = educationLevel;
        level.areaOfStudy = educationAreaOfStudy;
      }
      return level;
    });
  }

  // Save the educationLevels array to the session data
  req.session.data.educationLevels = educationLevels;

  res.redirect("education-level-list");
});

// remove education level page
router.get("/remove-education-level/:id", function (req, res) {
  let educationId = req.params.id;
  let educationLevels = req.session.data.educationLevels;

  // if the education level exists in the array, delete it from the array
  if (educationLevels.find((level) => level.id === educationId)) {
    educationLevels = educationLevels.filter(function (obj) {
      return obj.id !== educationId;
    });
    req.session.data.educationLevels = educationLevels;
  }

  // Redirect the user to the list of education levels
  res.redirect("../education-level-list");
});

// logic for remove education level page
router.post("/remove-education-level", function (req, res) {
  if (req.session.data["confirm-remove-education-level"] == "yes") {
    const educationId = req.query.id;
    let educationLevels = req.session.data.educationLevels;

    // remove the education level from the array
    educationLevels = educationLevels.filter(function (obj) {
      return obj.id !== educationId;
    });
    req.session.data.educationLevels = educationLevels;
  }

  // Redirect the user to the list of education levels
  res.redirect("education-level-list");
});

// education level list page
router.get("/education-level-list", function (req, res) {
  res.render(req.protoUrl + "/education-level-list");
});
// redirect to start date page
router.post("/education-level-list", function (req, res) {
  // set the new activity object in the session data if it doesn't exist
  req.session.data["new-activity"] = req.session.data["new-activity"] ?? {};

  let educationLevels = req.session.data.educationLevels ?? [];

  // update the new activity object in the session data
  req.session.data["new-activity"]["education-levels"] = educationLevels;

  res.redirect("start-date");
});

// payment incentive levels page
router.get("/payrate-incentive-levels", function (req, res) {
  res.render(req.protoUrl + "/payrate-incentive-levels");
});

// post logic for payment incentive levels page
router.post("/payrate-incentive-levels", function (req, res) {
  // redirect to payment details page
  res.redirect("payrate-details");
});

// payment details page
router.get("/payrate-details", function (req, res) {
  let payrateId = req.query["id"];
  let payrateData;

  // get the payrate data by id
  if (payrateId && req.session.data.payrates && typeof req.session.data.payrates === "object") {
    payrateData = getPayrateDataById(payrateId);
  }

  function getPayrateDataById(payrateId) {
    let payrateData = null;
    for (let incentiveLevel in req.session.data.payrates) {
      let payratesForIncentiveLevel = req.session.data.payrates[incentiveLevel];
      if (payratesForIncentiveLevel && payratesForIncentiveLevel.length > 0) {
        payrateData = payratesForIncentiveLevel.find((payrate) => payrate.id === payrateId);
        if (payrateData) {
          break;
        }
      }
    }
    return payrateData;
  }

  // construct the pay bands array for 10 pay bands
  let payBands = [];
  let payBandCount = 10;
  for (let i = 1; i <= payBandCount; i++) {
    payBands.push("Band " + i);
  }

  // if there is an id query parameter in the url we need to remove any pay bands that are already in use on other payrates in the matching incentive level
  if (payrateId) {
    // get the incentive level from the payrates session data
    let incentiveLevel = payrateData.incentiveLevel;
    let payratesForIncentiveLevel = req.session.data.payrates[incentiveLevel];
    let payBandsForIncentiveLevel = payratesForIncentiveLevel.map((payrate) => payrate.payBand);

    // remove the pay bands for the payrates for the incentive level from the list of available pay bands
    // but don't remove the current pay band
    payBands = payBands.filter((payBand) => {
      return !payBandsForIncentiveLevel.includes(payBand) || payrateData.payBand === payBand;
    });
  } else {
    // if there is no id query parameter in the url we need to remove any pay bands that are already in use on other payrates in the incentive level matching the payrate session data
    let incentiveLevel;

    // fix the weird bug when returning to this page from the payrate list page
    if (req.session.data.payrate) {
      incentiveLevel = req.session.data.payrate["incentive-level"];
    } else {
      incentiveLevel = "basic";
    }
    let existingPayrates = req.session.data.payrates;

    // if there are any payrates for the incentive level
    if (existingPayrates && existingPayrates[incentiveLevel] && existingPayrates[incentiveLevel].length > 0) {
      let payBandsForIncentiveLevel = existingPayrates[incentiveLevel].map((payrate) => payrate.payBand);
      // remove the pay bands for the payrates for the incentive level from the list of available pay bands
      payBands = payBands.filter((payBand) => {
        return !payBandsForIncentiveLevel.includes(payBand);
      });
    }
  }

  // render the page and include the payrateData variable so we can access it
  res.render(req.protoUrl + "/payrate-details", {
    payBands,
    payrateData,
  });
});

// payment details form post logic
router.post("/payrate-details", function (req, res) {
  // Assign an empty object to req.session.data.payrates if it is null or undefined
  req.session.data.payrates = req.session.data.payrates ?? {};

  let newPayrateData = req.session.data["payrate"];

  // Get the values of the paymentIncentiveName, paymentIncentiveAmount, and PayIncentiveLevel fields from the session data
  let payratePayband = newPayrateData["pay-band"];
  // set the payrate amount
  // if it can't be converted to a number, set it to 0
  let payrateAmount = Number(newPayrateData["amount"]) || 0;
  let payrateIncentiveLevel = newPayrateData["incentive-level"];
  let payrateId = crypto.randomBytes(4).toString("hex");

  // Get the ID for the payrate or generate a random one
  if (req.query["id"]) {
    payrateId = req.query["id"];
  }

  // Create the payrate data object
  const payrateData = {
    id: payrateId,
    payBand: payratePayband,
    amount: payrateAmount,
    incentiveLevel: payrateIncentiveLevel,
  };

  // add the payrate data to the payrates session data object
  // if there is already a payrate with a matching id, it should be overwritten or updated
  req.session.data.payrates[payrateIncentiveLevel] = req.session.data.payrates[payrateIncentiveLevel] ?? [];

  if (req.session.data.payrates[payrateIncentiveLevel].length > 0) {
    // Find the index of the payrate with the matching ID
    const payrateIndex = req.session.data.payrates[payrateIncentiveLevel].findIndex(
      (payrate) => payrate.id === payrateId
    );
    // If a payrate with the matching ID was found, update it
    if (payrateIndex > -1) {
      req.session.data.payrates[payrateIncentiveLevel][payrateIndex] = payrateData;
    } else {
      // If no payrate with the matching ID was found, add the new payrate to the array
      req.session.data.payrates[payrateIncentiveLevel].push(payrateData);
    }
  } else {
    // If there are no payrates for the current incentive level, add the new payrate to the array
    req.session.data.payrates[payrateIncentiveLevel].push(payrateData);
  }

  // delete the payrate session data
  delete req.session.data["payrate"];

  // Redirect the user to the next page
  res.redirect("payrate-list");
});

// payment details check page
router.get("/payrate-list", function (req, res) {
  let noPayrates = true;
  // set the noPayrates variable to false if there are any payrates in the session data
  if (req.session.data.payrates) {
    for (const [key, value] of Object.entries(req.session.data.payrates)) {
      if (value.length > 0) {
        noPayrates = false;
      }
    }
  }

  res.render(req.protoUrl + "/payrate-list", {
    noPayrates,
  });
});
// redirect to education level page
router.post("/payrate-list", function (req, res) {
  // Assign an empty object to req.session.data['new-activity'] if it is null or undefined
  req.session.data["new-activity"] = req.session.data["new-activity"] ?? {};

  // Assign an empty object to req.session.data['new-activity'].payrates if it is null or undefined
  req.session.data["new-activity"].payrates = req.session.data["new-activity"].payrates ?? {};

  // if payrates data exists, assign it to req.session.data['new-activity'].payrates
  if (req.session.data.payrates) {
    req.session.data["new-activity"].payrates = req.session.data.payrates;
  }

  res.redirect("check-answers");
});

// remove payment details
router.get("/remove-payrate/:payrateId", function (req, res) {
  let payrateId = req.params.payrateId;
  let payrates = req.session.data.payrates;

  for (const incentiveLevel in payrates) {
    let payratesForLevel = payrates[incentiveLevel];

    payratesForLevel.forEach((payrate, index) => {
      if (payrate.id === payrateId) {
        payratesForLevel.splice(index, 1);
      } else {
        return null;
      }
    });

    // if there are no payrates for the current incentive level, remove the incentive level from the payrates object
    if (payratesForLevel.length === 0) {
      delete payrates[incentiveLevel];
    } else {
      payrates[incentiveLevel] = payratesForLevel;
    }
  }

  // redirect to the payrate list page
  res.redirect("../payrate-list");
});

// start date page
router.get("/start-date", function (req, res) {
  // check if the start-date is already set in the new activity session data
  let startDate = req.session.data["new-activity"]?.["start-date"];

  // if the start date is already set, split it into day, month and year in a new object called startDate
  if (startDate) {
    startDate = startDate.split("-");
    startDate = {
      day: startDate[2],
      month: startDate[1],
      year: startDate[0],
    };
  }

  res.render(req.protoUrl + "/start-date", {
    startDate,
  });
});
// redirect to end date check page
router.post("/start-date", function (req, res) {
  let startDate = {};
  startDate.day = req.session.data["activity-start-date-day"];
  startDate.month = req.session.data["activity-start-date-month"];
  startDate.year = req.session.data["activity-start-date-year"];

  // format the date ISO Luxon format
  let startDateFormatted;
  if (startDate.day && startDate.month && startDate.year) {
    startDateFormatted = DateTime.fromObject(startDate).toISODate();
  } else {
    // set the start date to today if no date is entered
    startDateFormatted = DateTime.now().toISODate();
  }

  // add the start date to the session data for the new activity
  req.session.data["new-activity"] = req.session.data["new-activity"] ?? {};
  req.session.data["new-activity"]["start-date"] = startDateFormatted;

  res.redirect("end-date-check");
});

// end date check page
router.get("/end-date-check", function (req, res) {
  res.render(req.protoUrl + "/end-date-check");
});
// redirect logic for end date check page
router.post("/end-date-check", function (req, res) {
  if (req.session.data["end-date-check"] === "yes") {
    res.redirect("end-date");
  } else {
    res.redirect("schedule-weeks");
  }
});

// schedule weeks page
router.get("/schedule-weeks", function (req, res) {
  res.render(req.protoUrl + "/schedule-weeks");
});

// post schedule weeks page
router.post("/schedule-weeks", function (req, res) {
  let scheduleWeeks = req.session.data["new-activity"]?.["schedule-weeks"] ?? 1;

  if (scheduleWeeks === "1") {
    res.redirect("days-and-times");
  } else {
    res.redirect("days-and-times-weekly?week=1");
  }
});

// days and times week 1 page
router.get("/days-and-times-weekly", function (req, res) {
  let days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  res.render(req.protoUrl + "/days-and-times-weekly", {
    days,
  });
});

// post days and times week 1 page
router.post("/days-and-times-weekly", function (req, res) {
  let week = req.query.week;
  
  if(week === "1") {
    res.redirect("days-and-times-weekly?week=2");
  } else {
    res.redirect("bank-holiday-check");
  }
});

// end date page
router.get("/end-date", function (req, res) {
  // check if the end-date is already set in the new activity session data
  let endDate = req.session.data["new-activity"]?.["end-date"];

  // if the end date is already set, split it into day, month and year in a new object called endDate
  if (endDate) {
    endDate = endDate.split("-");
    endDate = {
      day: endDate[2],
      month: endDate[1],
      year: endDate[0],
    };
  }

  res.render(req.protoUrl + "/end-date");
});
// redirect to days and times page
router.post("/end-date", function (req, res) {
  let endDate = {};
  endDate.day = req.session.data["activity-end-date-day"];
  endDate.month = req.session.data["activity-end-date-month"];
  endDate.year = req.session.data["activity-end-date-year"];

  // format the date ISO Luxon format
  let endDateFormatted;
  if (endDate.day && endDate.month && endDate.year) {
    endDateFormatted = DateTime.fromObject(endDate).toISODate();
  } else {
    // set the end date to today if no date is entered
    endDateFormatted = DateTime.now().toISODate();
  }

  // add the end date to the session data for the new activity
  req.session.data["new-activity"] = req.session.data["new-activity"] ?? {};
  req.session.data["new-activity"]["end-date"] = endDateFormatted;

  res.redirect("schedule-weeks");
});

// days and times page
router.get("/days-and-times", function (req, res) {
  let days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  res.render(req.protoUrl + "/days-and-times", {
    days,
  });
});
router.post("/days-and-times", function (req, res) {
  let schedule = [];
  let periods = ["am", "pm", "ed"];
  let days = [0, 1, 2, 3, 4, 5, 6];

  // check if the days array has been set in the session data
  // it should be an object
  if (req.body.days && typeof req.body.days === "object") {
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
  } else {
    // get a random schedule from the activities session data
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let randomActivity = activities[Math.floor(Math.random() * activities.length)];
    schedule = randomActivity["schedule"];
  }

  // update the new-activity session data with the schedule object
  req.session.data["new-activity"] = req.session.data["new-activity"] ?? {};
  req.session.data["new-activity"]["schedule"] = schedule;

  // redirect to the activity page
  res.redirect("bank-holiday-check");

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

// bank holiday check page
router.get("/bank-holiday-check", function (req, res) {
  res.render(req.protoUrl + "/bank-holiday-check");
});
// redirect activity location select page
router.post("/bank-holiday-check", function (req, res) {
  res.redirect("payrate-incentive-levels");
});

// create activity check answers page
router.get("/check-answers", function (req, res) {
  req.session.data["new-activity"] = req.session.data["new-activity"] ?? {};

  let newActivity = req.session.data["new-activity"];
  let newActivitySchedule = newActivity.schedule;
  let schedule;

  if (newActivitySchedule) {
    schedule = getActivitySchedule(newActivitySchedule);
  } else {
    // get a schedule from a random activity
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let randomActivity = activities[Math.floor(Math.random() * activities.length)];
    schedule = getActivitySchedule(randomActivity.schedule);
  }

  res.render(req.protoUrl + "/check-answers", {
    schedule,
  });
});
// redirect to confirmation page
router.post("/check-answers", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let randomActivity = activities[Math.floor(Math.random() * activities.length)];

  randomActivity.id = Math.floor(Math.random() * 1000000);

  // if the new activity has a name, add it to the random activity
  if (req.session.data["new-activity"]?.name) {
    randomActivity.name = req.session.data["new-activity"].name;
  }

  // if the new activity has a category, add it to the random activity
  if (req.session.data["new-activity"]?.category) {
    // set the category to 7 if it can't be converted to a number
    randomActivity.category = parseInt(req.session.data["new-activity"].category) || 7;
  }

  // push the new activity to the activities session data
  // req.session.data["timetable-complete-1"]["activities"].push(randomActivity);

  res.redirect("confirmation?activity=" + randomActivity.id);
});

// confirmation page
router.get("/confirmation", function (req, res) {
  res.render(req.protoUrl + "/confirmation");
});

module.exports = router;

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
