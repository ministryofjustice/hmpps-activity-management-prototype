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
  res.redirect("create-activity-version-2/select-category");
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
  res.redirect("risk-assessment-levels");
});

// risk assessment levels page
router.get("/risk-assessment-levels", function (req, res) {
  res.render(req.protoUrl + "/risk-assessment-levels");
});
// redirect to payment details page
router.post("/risk-assessment-levels", function (req, res) {
  res.redirect("payrate-list");
});

// select payrate page
router.get("/payrate-name", function (req, res) {
  res.render(req.protoUrl + "/payrate-name");
});
// post logic for payrate name page
router.post("/payrate-name", function (req, res) {
  // redirect to payment details page
  res.redirect("payrate-amounts");
});

// payrate amounts page
router.get("/payrate-amounts", function (req, res) {
  res.render(req.protoUrl + "/payrate-amounts");
});
// post logic for payrate amounts page
router.post("/payrate-amounts", function (req, res) {
  // redirect to payrate list page
  res.redirect("payrate-list");
});

// payment details post logic
router.post("/payment-details", function (req, res) {
  // redirect to payment details list page
  res.redirect("payrate-list");
});

// payrate list page
router.get("/payrate-list", function (req, res) {
  res.render(req.protoUrl + "/payrate-list");
});




// payment details page
router.get("/payment-details", function (req, res) {
  let payrateId = req.session.data["id"];
  let payrateData;

  function getPayrateById(payrates, id) {
    // Iterate over the payrates object
    for (const level in payrates) {
      // Get the array of payrates for the current pay rate level
      const levelPayrates = payrates[level];
      // Iterate over the array of payrates
      for (const payrate of levelPayrates) {
        // If the payrate has the specified ID, return it
        if (payrate.id === id) {
          return payrate;
        }
      }
    }
    // If no payrate with the specified ID was found, return null
    return null;
  }

  // check the payrates object exists and is an object
  if (
    req.session.data.payrates &&
    typeof req.session.data.payrates === "object"
  ) {
    // update the payrateData variable
    payrateData = getPayrateById(req.session.data.payrates, payrateId);
  }

  // render the page and include the payrateData variable so we can access it
  res.render(req.protoUrl + "/payment-details", { payrateData });
});
// payment details form post logic
router.post("/payment-details", function (req, res) {
  // Assign an empty object to req.session.data.payrates if it is null or undefined
  req.session.data.payrates = req.session.data.payrates ?? {};

  // Get the values of the paymentIncentiveName, paymentIncentiveAmount, and PayIncentiveLevel fields from the session data
  const paymentIncentiveName = req.session.data["paymentIncentiveName"];
  const paymentIncentiveAmount = req.session.data["paymentIncentiveAmount"];
  const payIncentiveLevel = req.session.data["PayIncentiveLevel"];

  // Get the ID for the payrate or generate a random one
  let payIncentiveId;
  if (req.session.data["id"]) {
    payIncentiveId = req.session.data["id"];
  } else {
    payIncentiveId = crypto.randomBytes(4).toString("hex");
  }

  // Create the payrate data object
  const payrateData = {
    id: payIncentiveId,
    name: paymentIncentiveName,
    amount: paymentIncentiveAmount,
    "incentive-level": payIncentiveLevel,
  };

  function updatePayrate(payrates, id, payrateData) {
    // remove payrates with matching id from all levels
    for (const level in payrates) {
      const levelPayrates = payrates[level];
      payrates[level] = levelPayrates.filter((payrate) => payrate.id !== id);
    }

    // add payrate to the correct level
    if (Array.isArray(payrateData["incentive-level"])) {
      payrateData["incentive-level"].forEach((level) => {
        if (!payrates[level]) {
          payrates[level] = [];
        }
        payrates[level].push(payrateData);
      });
    } else {
      if (!payrates[payrateData["incentive-level"]]) {
        payrates[payrateData["incentive-level"]] = [];
      }
      payrates[payrateData["incentive-level"]].push(payrateData);
    }
    return payrateData;
  }

  // Update the payrate in the payrates object
  const updatedPayrate = updatePayrate(
    req.session.data.payrates,
    payIncentiveId,
    payrateData
  );

  // Redirect the user to the next page
  res.redirect("payment-details-list");
});

// payment details check page
router.get("/payment-details-list", function (req, res) {
  res.render(req.protoUrl + "/payment-details-list");
});
// redirect to education level page
router.post("/payment-details-list", function (req, res) {
  // Assign an empty object to req.session.data['new-activity']
  req.session.data["new-activity"] = req.session.data["new-activity"] ?? {};

  // Assign an empty object to req.session.data['new-activity'].payrates if it is null or undefined
  req.session.data["new-activity"].payrates =
    req.session.data["new-activity"].payrates ?? {};

  // if payrates data exists, assign it to req.session.data['new-activity'].payrates
  if (req.session.data.payrates) {
    req.session.data["new-activity"].payrates = req.session.data.payrates;
  }

  res.redirect("education-level-check");
});

// remove payment details
router.get("remove-payment-details", function (req, res) {
  let payrateId = req.session.data["id"];
  let payrateData;

  function getPayrateById(payrates, id) {
    for (const level in payrates) {
      const levelPayrates = payrates[level];
      for (const payrate of levelPayrates) {
        if (payrate.id === id) {
          return payrate;
        }
      }
    }
    return null;
  }

  if (
    req.session.data.payrates &&
    typeof req.session.data.payrates === "object"
  ) {
    payrateData = getPayrateById(req.session.data.payrates, payrateId);
  }

  res.render(req.protoUrl + "/remove-payment-details", { payrateData });
});

router.post("/remove-payment-details", function (req, res) {
  if (req.session.data["confirm-remove-payrate"] == "yes") {
    let payrateId = req.session.data["id"];
    let payrateLevel = req.session.data["incentive-level"];
    let payrateData;

    function removePayrateById(payrates, id) {
      // Iterate over the payrates object
      for (const level in payrates) {
        // Get the array of payrates for the current pay rate level
        const levelPayrates = payrates[level];
        // Iterate over the array of payrates
        for (let i = 0; i < levelPayrates.length; i++) {
          // If the payrate has the specified ID, remove it from the array
          if (levelPayrates[i].id === id) {
            levelPayrates.splice(i, 1);
            return true;
          }
        }
      }
      // If no payrate with the specified ID was found, return false
      return false;
    }

    // check the payrates object exists and is an object
    if (
      req.session.data.payrates &&
      typeof req.session.data.payrates === "object"
    ) {
      // update the payrateData variable
      if (removePayrateById(req.session.data.payrates, payrateId)) {
        payrateData = null;
      } else {
        payrateData = "Payrate not found";
      }
    }

    req.session.data["show-delete-dialog"] = true;
  }

  // Redirect the user to the payment details list page
  res.redirect("payment-details-list");
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
    res.redirect("start-date");
  }
});

// select education level page
router.get("/select-education-level", function (req, res) {
  res.render(req.protoUrl + "/select-education-level");
});
// redirect to education level list page
router.post("/select-education-level", function (req, res) {
  const educationLevel = req.session.data["education-level"];

  // Get the ID for the educationLevel or generate a random one
  let educationId;
  if (req.query.id) {
    educationId = req.query.id;
  } else {
    educationId = crypto.randomBytes(4).toString("hex");
  }

  let educationLevelData = {
    id: educationId,
    name: educationLevel,
  };

  // Check if the educationLevelData already exists in the educationLevels array
  let educationLevels = req.session.data.educationLevels || [];
  let existingEducation = educationLevels.find(
    (level) => level.id === educationId
  );

  if (existingEducation) {
    // If educationLevelData already exists, update it
    existingEducation.name = educationLevelData.name;
  } else {
    // If educationLevelData doesn't exist, add it to the array
    educationLevels.push(educationLevelData);
  }

  req.session.data.educationLevels = educationLevels;

  res.redirect("education-level-list");
});

// remove education level page
router.get("/remove-education-level", function (req, res) {
  let educationId = req.query.id;
  let educationLevels = req.session.data.educationLevels;
  let educationLevel = educationLevels.find(
    (level) => level.id === educationId
  );

  res.render(req.protoUrl + "/remove-education-level", { educationLevel });
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
  res.redirect("select-activity-location");
});

// activity location select page
router.get("/select-activity-location", function (req, res) {
  res.render(req.protoUrl + "/select-activity-location");
});
// redirect to allocation count page
router.post("/select-activity-location", function (req, res) {
  res.redirect("allocation-count");
});

// allocation count page
router.get("/allocation-count", function (req, res) {
  res.render(req.protoUrl + "/allocation-count");
});
// redirect to new activity check answers page
router.post("/allocation-count", function (req, res) {
  res.redirect("check-answers");
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
