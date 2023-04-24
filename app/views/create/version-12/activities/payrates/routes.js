const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// payrates page
router.get("/", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityId = req.activityId;
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  // hide the confirmation dialog after showing it once
  if (req.session.data["confirmation-dialog"]) {
    delete req.session.data["confirmation-dialog"];
  }

  // remove payrates that do not have a value
  let payRates = activity.payRates.filter((payRate) => payRate.amount !== null);

  // convert payrates array to object grouped by incentive level keys
  // incentive levels: [basic, standard, enhanced]
  let incentiveLevels = ["basic", "standard", "enhanced", "flatRate"];
  let payRatesByIncentiveLevel = {};
  incentiveLevels.forEach((incentiveLevel) => {
    payRatesByIncentiveLevel[incentiveLevel] = payRates.filter((payRate) => payRate.incentiveLevel === incentiveLevel);
  });

  let noAlternativePayRates = false;
  if (
    payRatesByIncentiveLevel["basic"].length === 0 ||
    payRatesByIncentiveLevel["standard"].length === 0 ||
    payRatesByIncentiveLevel["enhanced"].length === 0
  ) {
    noAlternativePayRates = true;
  }

  // sum the number of prisoners allocated to each payrate and add it to the payratesByIncentiveLevel object
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let currentlyAllocatedPrisoners = prisoners.filter(
    (prisoner) =>
      prisoner.activity != undefined &&
      prisoner.activity != null &&
      prisoner.activity.length > 0 &&
      prisoner.activity.find((activity) => activity.toString() === activityId.toString())
  );
  // for each payrate in the payratesByIncentiveLevel object
  // get the number of prisoners who have the payrate id in their payRates array
  // we must check the prisoner.payRates array exists and is not undefined, null or empty
  // we need to compare the ids as strings
  for (let incentiveLevel in payRatesByIncentiveLevel) {
    payRatesByIncentiveLevel[incentiveLevel].forEach((payRate) => {
      // prisoner payrates are stored keyed by activity id where the value is the payrate id
      // we need to get the payrate id from the prisoner payrates object
      let prisonerPayRates = currentlyAllocatedPrisoners.map((prisoner) => prisoner.payrates[activityId]);
      let prisonerPayRateIds = prisonerPayRates.filter(
        (prisonerPayRate) => prisonerPayRate != undefined && prisonerPayRate != null
      );
      let prisonerCount = prisonerPayRateIds.filter(
        (prisonerPayRateId) => prisonerPayRateId.toString() === payRate.payRate_id.toString()
      ).length;
      payRate.prisonerCount = prisonerCount;
    });
  }

  res.render(req.protoUrl + "/payrates", {
    activity,
    payRatesByIncentiveLevel,
    noAlternativePayRates,
    currentPage: "pay-rates",
  });
});

// add payrate page
router.get("/add", function (req, res) {
  // redirect to the payrate type page
  res.redirect("add/type");
});

// payrate type page
router.get("/add/type", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  res.render(req.protoUrl + "/type");
});

// post route for payrate type page
router.post("/add/type", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateType = req.session.data["pay-rate-type"];

  // redirect to the payrate details page
  res.redirect("details");
});

// payrate details page
router.get("/add/details", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let incentiveLevel = req.session.data["pay-rate-incentive-level"];

  // render the payrate details page
  res.render(req.protoUrl + "/details", {
    activity,
    incentiveLevel,
    journey: "add",
  });
});

// post route for payrate details page
router.post("/add/details", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let incentiveLevel = req.session.data["pay-rate-incentive-level"];
  let amount = Math.round(parseFloat(req.session.data["pay-rate-amount"]) * 100) / 100; // convert amount to 2dp float e.g. 10.50 instead of a string e.g. "10.5023"
  let payBand = req.session.data["pay-rate-pay-band"];
  let flatRate = incentiveLevel === "flat-rate";

  let isFlatRate = "false";
  // create a new payrate object
  if (incentiveLevel == "flat-rate") {
    incentiveLevel = "flatRate";
    isFlatRate = "true";
  }

  let payRate = {
    payRate_id: Math.floor(Math.random() * 1000000000),
    incentiveLevel,
    amount,
    payBand,
    isFlatRate,
  };

  // add the new payrate to the activity
  activity.payRates.push(payRate);

  // redirect to the activity details page with a confirmation dialog
  req.session.data["confirmation-dialog"] = {
    title: "Pay rate added",
    display: true,
  };

  res.redirect("../../payrates");
});

// delete payrate page
router.get("/delete/:payRateId", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateId = req.params.payRateId;

  // get a list of prisoners who have the activityId in their activity array
  // we must check the prisoner.activity array is not undefined, null or empty
  // we need to compare the ids as strings
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let currentlyAllocatedPrisoners = prisoners.filter(
    (prisoner) =>
      prisoner.activity != undefined &&
      prisoner.activity != null &&
      prisoner.activity.length > 0 &&
      prisoner.activity.find((activity) => activity.toString() === activityId.toString())
  );

  // get the matching payrate from the activity
  // we must check the payRate_id is not undefined or null
  let payRate = activity.payRates.find(
    (payRate) =>
      payRate.payRate_id != undefined &&
      payRate.payRate_id != null &&
      payRate.payRate_id.toString() === payRateId.toString()
  );

  // make a list of prisoner IDs on the payrate being deleted
  let prisonersOnPayRate = [];
  currentlyAllocatedPrisoners.forEach((prisoner) => {
    let prisonerPayRate = prisoner.payrates[activityId];
    if (prisonerPayRate != undefined && prisonerPayRate != null) {
      if (prisonerPayRate.toString() === payRate.payRate_id.toString()) {
        prisonersOnPayRate.push(prisoner.id);
      }
    }
  });

  console.log(prisonersOnPayRate);

  if (prisonersOnPayRate != undefined && prisonersOnPayRate.length > 1) {
    let prisonerIds = prisonersOnPayRate.join(",");

    // redirect to the check prisoners page with this payrate id as a url param
    res.redirect(payRate.payRate_id + "/check-prisoners/" + prisonerIds);
  } else if (prisonersOnPayRate != undefined && prisonersOnPayRate.length === 1) {
    let prisonerId = prisonersOnPayRate[0];

    // redirect to the check prisoner page with this payrate id as a url param
    res.redirect(payRate.payRate_id + "/prisoner-action/" + prisonerId);
  } else {
    // render the delete payrate page
    res.render(req.protoUrl + "/delete", {
      activity,
      payRate,
    });
  }
});

// post route for delete payrate page
router.post("/delete/:payRateId", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateId = req.params.payRateId;

  // delete the matching payrate from the activity
  // we must check the payRate_id is not undefined or null
  activity.payRates = activity.payRates.filter(
    (payRate) =>
      payRate.payRate_id != undefined &&
      payRate.payRate_id != null &&
      payRate.payRate_id.toString() !== payRateId.toString()
  );

  // redirect to the activity details page with a confirmation dialog
  req.session.data["confirmation-dialog"] = {
    title: "Pay rate deleted",
    display: true,
  };

  res.redirect("../../payrates");
});

// edit payrate page
router.get("/edit/:payRateId", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateId = req.params.payRateId;
  let payRate = activity.payRates.find(
    (payRate) =>
      payRate.payRate_id != undefined &&
      payRate.payRate_id != null &&
      payRate.payRate_id.toString() === payRateId.toString()
  );

  // render the edit payrate page
  res.render(req.protoUrl + "/details", {
    activity,
    payRate,
    journey: "edit",
  });
});

// post route for edit payrate page
router.post("/edit/:payRateId", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateId = req.params.payRateId;
  let payRate = activity.payRates.find(
    (payRate) =>
      payRate.payRate_id != undefined &&
      payRate.payRate_id != null &&
      payRate.payRate_id.toString() === payRateId.toString()
  );

  // update the payrate object with the new values
  payRate.amount = Math.round(req.session.data["pay-rate-amount"] * 100) / 100;
  payRate.payBand = req.session.data["pay-rate-pay-band"];

  // redirect to the activity details page with a confirmation dialog
  req.session.data["confirmation-dialog"] = {
    title: "Pay rate updated",
    display: true,
  };

  res.redirect("../../payrates");
});

// check prisoners page
router.get("/delete/:payRateId/check-prisoners/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateId = req.params.payRateId;
  let payRate = activity.payRates.find((payRate) => payRate.payRate_id.toString() === payRateId.toString());

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  let suitablePayrates = getSuitablePayrates(activity, payRateId);

  // render the check prisoners page
  res.render(req.protoUrl + "/check-prisoners", {
    activity,
    payRate,
    payRateId,
    prisonersOnPayRate,
    prisonerData,
    suitablePayrates,
  });
});

// post route for check prisoners page
router.post("/delete/:payRateId/check-prisoners/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let prisonersOnPayRate = req.params.prisonerIds.split(",");

  let suitablePayrates = getSuitablePayrates(activity, req.params.payRateId);

  // redirect depending on the user's choice
  if (req.session.data["prisoner-action"] === "select-payrate") {
    // redirect to the select payrate page
    res.redirect("../select-payrate/" + req.params.prisonerIds);
  } else if (req.session.data["prisoner-action"] === "move-to-payrate") {
    // set the payrate id in the session data
    req.session.data["new-payrate-id"] = suitablePayrates[0].payRate_id;
    // redirect to the confirm deallocate page
    res.redirect("../confirm-payrate/" + req.params.prisonerIds);
  } else if (req.session.data["prisoner-action"] === "remove-from-activity") {
    // redirect to the confirm deallocate page
    res.redirect("../confirm-deallocate/" + req.params.prisonerIds);
  } else {
    // redirect to the individual payrate page
    res.redirect("../prisoner-action/" + req.params.prisonerIds);
  }
});

// select payrate page
router.get("/delete/:payRateId/select-payrate/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateId = req.params.payRateId;

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  let payrates = activity.payRates;

  // get a list of suitable payrates to move the prisoners to from the activity
  let suitablePayrates = getSuitablePayrates(activity, payRateId);

  // if (suitablePayrates.length > 1) {
  //   // render the select payrate page
  //   res.render(req.protoUrl + "/select-payrate", {
  //     activity,
  //     payrates: suitablePayrates,
  //     prisonersOnPayRate,
  //     prisonerData,
  //   });
  // } else {
  //   // redirect to the confirm payrate page
  //   res.redirect("../confirm-payrate/" + req.params.prisonerIds);
  // }

  res.render(req.protoUrl + "/select-payrate", {
    activity,
    payrates: suitablePayrates,
    prisonersOnPayRate,
    prisonerData,
  });
});

// post route for select payrate page
router.post("/delete/:payRateId/select-payrate/:prisonerIds", function (req, res) {
  let newPayRateId = req.session.data["payrate-id"];

  // redirect to the confirm payrate page
  res.redirect("../confirm-payrate/" + req.params.prisonerIds);
});

// confirm payrate page
router.get("/delete/:payRateId/confirm-payrate/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let payRateId = req.params.payRateId;
  let payRate = activity.payRates.find((payRate) => payRate.payRate_id.toString() === payRateId.toString());
  let newPayRateId = req.session.data["new-payrate-id"];
  let newPayRate = activity.payRates.find((payRate) => payRate.payRate_id.toString() === newPayRateId.toString());

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  res.render(req.protoUrl + "/confirm-payrate", {
    activityId: req.activityId,
    activity,
    payRateId: req.params.payRateId,
    newPayRateId: req.params.newPayRateId,
    prisonerIds: req.params.prisonerIds,
    prisonerData,
    newPayRate,
    oldPayRate: payRate,
    oldPayRateId: payRateId,
    prisonersOnPayRate,
  });
});

// post route for confirm payrate page
router.post("/delete/:payRateId/confirm-payrate/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let newPayRateId = req.session.data["new-payrate-id"];

  // set the new payrate id for each prisoner
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  prisonerData.forEach((prisoner) => {
    prisoner.payrates[activityId.toString()] = newPayRateId;
  });

  // remove the old payrate from the activity
  let oldPayRateId = req.params.payRateId;
  activity.payRates = activity.payRates.filter((payRate) => payRate.payRate_id.toString() !== oldPayRateId.toString());

  // redirect to the payrates page showing the confirmation dialog
  req.session.data["confirmation-dialog"] = {
    title: "Pay rate deleted",
    display: true,
  };

  res.redirect("../../../../payrates");
});

// check prisoner page
router.get("/delete/:payRateId/prisoner-action/:prisonerIds", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let suitablePayrates = getSuitablePayrates(activity, req.params.payRateId);

  // render the check prisoner page
  res.render(req.protoUrl + "/prisoner-action", {
    prisonerData,
    payrates: suitablePayrates,
    activity,
  });
});

// post route for check prisoner page
router.post("/delete/:payRateId/prisoner-action/:prisonerIds", function (req, res) {
  // redirect to the confirm prisoner actions page
  res.redirect("../confirm-prisoner-actions/" + req.params.prisonerIds);
});

// confirm prisoner actions page
router.get("/delete/:payRateId/confirm-prisoner-actions/:prisonerIds", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let oldPayRate = activity.payRates.find(
    (payRate) => payRate.payRate_id.toString() === req.params.payRateId.toString()
  );

  // get and set the action for each prisoner
  let prisonerActionsData = req.session.data["prisoner-actions"];
  let prisonerActions = [];

  // for each prisoner in the prisonersOnPayRate array
  // get the action from the prisonerActionsData object
  // and set the action on the prisoner
  prisonersOnPayRate.forEach((prisonerId) => {
    let prisoner = prisonerData.find((prisoner) => prisoner.id.toString() === prisonerId.toString());
    let action = prisonerActionsData[prisonerId];

    // if the action is "deallocate" then set the action on the prisoner
    if (action === "deallocate") {
      prisoner.action = "deallocate";
    } else {
      // otherwise set the action on the prisoner to "move"
      let newPayRate = activity.payRates.filter((payRate) => payRate.payRate_id.toString() === action.toString());

      prisoner.action = "move";
      prisoner.newPayRate = newPayRate[0];
      prisoner.oldPayRate = activity.payRates.filter(
        (payRate) => payRate.payRate_id.toString() === req.params.payRateId.toString()
      )[0];
    }

    // add the prisoner to the prisonerActions array
    prisonerActions.push(prisoner);
  });


  // split the prisonerActions array into two arrays:
  // one for prisoners who are being moved and one for prisoners who are being deallocated
  let prisonersToMove = prisonerActions.filter((prisoner) => prisoner.action === "move");
  let prisonersToDeallocate = prisonerActions.filter((prisoner) => prisoner.action === "deallocate");

  prisonerActions = {
    prisonersToMove,
    prisonersToDeallocate,
  };

  let payrates = activity.payRates;

  // render the confirm prisoner actions page
  res.render(req.protoUrl + "/confirm-prisoner-actions", {
    prisonerData,
    payrates,
    activity,
    prisonerActions,
    oldPayRate,
  });
});

// post route for confirm prisoner actions page
router.post("/delete/:payRateId/confirm-prisoner-actions/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  prisonerData.forEach((prisoner) => {
    let action = req.session.data["prisoner-actions"][prisoner.id.toString()];
    if (action === "deallocate") {
      // remove the activity from the prisoner's activity array
      // use string comparison because the prisoner's activity array contains strings
      prisoner.activity = prisoner.activity.filter((activity) => activity.toString() !== activityId.toString());
    } else {
      prisoner.payrates[activityId.toString()] = action;
    }
  });

  // remove the old payrate from the activity
  let oldPayRateId = req.params.payRateId;
  activity.payRates = activity.payRates.filter((payRate) => payRate.payRate_id.toString() !== oldPayRateId.toString());

  // redirect to the payrates page showing the confirmation dialog
  req.session.data["confirmation-dialog"] = {
    title: "Pay rate deleted",
    display: true,
  };

  res.redirect("../../../../payrates");
});

module.exports = router;
function getSuitablePayrates(activity, payRateId) {
  let suitablePayrates = [];
  let payRateBeingDeleted = activity.payRates.find((payRate) => payRate.payRate_id.toString() === payRateId.toString());

  // get the payrates that are the same incentive level as the payrate being deleted
  let sameIncentiveLevelPayrates = activity.payRates.filter(
    (payRate) => payRate.incentiveLevel === payRateBeingDeleted.incentiveLevel
  );

  // add any flat rate payrates to the list of suitable payrates
  let flatRatePayrates = activity.payRates.filter((payRate) => payRate.incentiveLevel === "flatRate");

  // if the payrate is not a flat rate payrate then combine the flat rate payrates and the payrates with the same incentive level
  // otherwise just use the flat rate payrates
  if (payRateBeingDeleted.incentiveLevel !== "flatRate") {
    suitablePayrates = suitablePayrates.concat(flatRatePayrates, sameIncentiveLevelPayrates);
  } else {
    suitablePayrates = suitablePayrates.concat(flatRatePayrates);
  }

  console.log(suitablePayrates);

  // exclude the payrate being deleted from the list of suitable payrates
  suitablePayrates = suitablePayrates.filter((payRate) => payRate.payRate_id.toString() !== payRateId.toString());

  return suitablePayrates;
}
