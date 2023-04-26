const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { DateTime } = require("luxon");
const e = require("express");
const { isObject } = require("lodash");

router.all("*", function (req, res, next) {
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

  // Get the ID for the educationLevel or generate a random one
  let educationId = req.query.id ? req.query.id : crypto.randomBytes(4).toString("hex");

  let educationLevelData = {
    id: educationId,
    name: educationLevel,
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

  let payBands = ["Band 1", "Band 2", "Band 3", "Band 4", "Band 5", "Band 6"];

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
    let incentiveLevel = req.session.data.payrate['incentive-level'];
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
  // set the amount to a number not a string
  let payrateAmount = Number(newPayrateData["amount"]);
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
  res.render(req.protoUrl + "/payrate-list");
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
  res.render(req.protoUrl + "/start-date");
});
// redirect to end date check page
router.post("/start-date", function (req, res) {
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
    res.redirect("days-and-times");
  }
});

// end date page
router.get("/end-date", function (req, res) {
  res.render(req.protoUrl + "/end-date");
});
// redirect to days and times page
router.post("/end-date", function (req, res) {
  res.redirect("days-and-times");
});

// days and times page
router.get("/days-and-times", function (req, res) {
  res.render(req.protoUrl + "/days-and-times");
});
// redirect to bank holiday check page
router.post("/days-and-times", function (req, res) {
  // get days and times data
  const days = req.session.data["days"];

  // if a day has no times associated with it, remove it from the days variable
  days.forEach(function (day) {
    let times = req.session.data["times-" + day];
    if (!times || times.length === 0) {
      days.splice(days.indexOf(day), 1);
    }
  });

  // create a 'schedule' object from days and times, e.g: {"day":0,"am":null,"pm":null, "ed":true}
  let schedule = [];
  days.forEach(function (day) {
    let times = req.session.data["times-" + day];
    let dayObj = {
      day: day,
      am: times.includes("am"),
      pm: times.includes("pm"),
      ed: times.includes("ed"),
    };
    schedule.push(dayObj);
  });

  // if new-activity doesn't exist, create it
  if (!req.session.data["new-activity"]) {
    req.session.data["new-activity"] = {};
  }

  // add the days and times object to the session data for 'new-activity'
  req.session.data["new-activity"].schedule = schedule;

  res.redirect("bank-holiday-check");
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
  res.render(req.protoUrl + "/check-answers");
});
// redirect to confirmation page
router.post("/check-answers", function (req, res) {
  // get the schedule from the new-activity session data
  let schedule = req.session.data["new-activity"].schedule;

  // if there is a schedule, convert the day names to numbers
  if (schedule) {
    schedule.forEach(function (day) {
      // use Luxon to convert each day name to a number in the range 1-7
      day.day = DateTime.fromFormat(day.day, "cccc").weekday;
    });
  }

  res.redirect("confirmation");
});

// confirmation page
router.get("/confirmation", function (req, res) {
  res.render(req.protoUrl + "/confirmation");
});

module.exports = router;
