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

  let hasFlatRate = false;
  if (payRatesByIncentiveLevel["flatRate"].length > 0) {
    hasFlatRate = true;
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
  for (let incentiveLevel in payRatesByIncentiveLevel) {;
    const countRatesForIncentiveLevel = (incentiveLevel) => {
      return payRatesByIncentiveLevel[incentiveLevel].length;
    };
    
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

      // add a key to the payratesByIncentiveLevel object to indicate if the payrate can be deleted
      if (payRate.prisonerCount === 0) {
        payRate.canDelete = true;
      } else if (
        (payRate.incentiveLevel === "flatRate" && countRatesForIncentiveLevel("flatRate") > 1) ||
        (payRate.incentiveLevel !== "flatRate" && countRatesForIncentiveLevel("flatRate") > 0) ||
        (payRate.incentiveLevel !== "flatRate" && countRatesForIncentiveLevel(payRate.incentiveLevel) > 1)
      ) {
        payRate.canDelete = true;
      } else {
        payRate.canDelete = false;
      }
    });
  }

  res.render(req.protoUrl + "/payrates", {
    activity,
    payRatesByIncentiveLevel,
    noAlternativePayRates,
    currentPage: "pay-rates",
    hasFlatRate,
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

  let suitablePayRates = getSuitablePayrates(activity, payRateId);
  let prisonerIds = prisonersOnPayRate.join(",");

  // if there are multiple prisoners on the payrate, but only one suitable alternative payrate then redirect to the prisoner action list page

  // if there are any prisoners on the payrate
  if (prisonersOnPayRate.length) {
    // if there is only one suitable alternative payrate
    if (suitablePayRates.length === 1) {
      // set the prisoner action to move to payrate
      req.session.data["prisoner-action"] = "move-to-payrate";
      req.session.data["new-payrate-id"] = suitablePayRates[0].payRate_id;

      // redirect to the confirm payrate change page
      res.redirect(payRate.payRate_id + "/confirm-automatic-payrate-change/" + prisonerIds);
    }
    // otherwise if there are multiple suitable alternative payrates
    else if (suitablePayRates.length > 1) {
      // if there are multiple suitable alternative payrates then redirect to the check prisoners page if there are multiple prisoners on the payrate
      if (prisonersOnPayRate.length > 1) {
        // redirect to the check prisoners page
        res.redirect(payRate.payRate_id + "/choose-prisoner-action/" + prisonerIds);
      } else {
        // otherwise there is only one prisoner on the payrate, so redirect to the check prisoner page
        res.redirect(payRate.payRate_id + "/select-payrate/" + prisonerIds);
      }
    }
  }
  // otherwise, if there are no prisoners on the payrate
  else {
    let isLastPayrate = activity.payRates.length === 1;

    // render the delete payrate page
    res.render(req.protoUrl + "/delete", {
      activity,
      payRate,
      isLastPayrate,
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

// check prisoners list page
router.get("/delete/:payRateId/check-prisoners-list/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let payRateId = req.params.payRateId;
  let payRate = activity.payRates.find((payRate) => payRate.payRate_id.toString() === payRateId.toString());

  let prisonerIds = req.params.prisonerIds.split(",");
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter((prisoner) => prisonerIds.includes(prisoner.id));

  // render the check prisoners list page
  res.render(req.protoUrl + "/check-prisoners-list", {
    activity,
    payRate,
    prisonerIds,
    prisonerData,
  });
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

// choose-prisoner-action page
router.get("/delete/:payRateId/choose-prisoner-action/:prisonerIds", function (req, res) {
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

  // render the choose-prisoner-action page
  res.render(req.protoUrl + "/choose-prisoner-action", {
    activity,
    payRate,
    payRateId,
    prisonersOnPayRate,
    prisonerData,
    suitablePayrates,
  });
});

// post route for choose-prisoner-action page
router.post("/delete/:payRateId/choose-prisoner-action/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let prisonersOnPayRate = req.params.prisonerIds.split(",");

  let suitablePayrates = getSuitablePayrates(activity, req.params.payRateId);

  // redirect to the select payrate page
  res.redirect("../select-payrate/" + req.params.prisonerIds);
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

  // get a list of suitable payrates to move the prisoners to from the activity
  let suitablePayrates = getSuitablePayrates(activity, payRateId);

  // set the template file we use depending on the number of prisoners on the payrate
  let prisonerCount = prisonersOnPayRate.length;
  let action = req.session.data["prisoner-action"];
  let template;
  if (prisonerCount === 1) {
    template = req.protoUrl + "/select-single-payrate";
  } else if (prisonerCount > 1) {
    if (action === "choose-individually") {
      template = req.protoUrl + "/select-multiple-payrates";
    } else {
      template = req.protoUrl + "/select-single-payrate";
    }
  }

  res.render(template, {
    activity,
    payrates: suitablePayrates,
    prisonersOnPayRate,
    prisonerData,
  });
});

// post route for select payrate page
router.post("/delete/:payRateId/select-payrate/:prisonerIds", function (req, res) {
  // redirect to the confirm payrate page
  res.redirect("../check-answers/" + req.params.prisonerIds);
});

// confirm payrate page
router.get("/delete/:payRateId/confirm-automatic-payrate-change/:prisonerIds", function (req, res) {
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

  res.render(req.protoUrl + "/confirm-automatic-payrate-change", {
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
router.post("/delete/:payRateId/confirm-automatic-payrate-change/:prisonerIds", function (req, res) {
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

// confirm deallocate page
router.get("/delete/:payRateId/confirm-deallocate/:prisonerIds", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // render the confirm deallocate page
  res.render(req.protoUrl + "/confirm-deallocate", {
    prisonerData,
    activity,
  });
});

// confirm prisoner actions page
router.get("/delete/:payRateId/check-answers/:prisonerIds", function (req, res) {
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

  let payrates = activity.payRates;

  // when we load the check answers page, we need to format the new-payrate session data for display
  let newPayrateData = req.session.data["new-payrate"];

  // check if req.session.data["new-payrate"] is a string or an object
  // example data: {"WO4204F":"3","QA6177Q":"1","PN9252V":"3"}
  if (typeof newPayrateData === "object") {
    // if there is more than one payrate, we need to set payrate data for each prisoner
    prisonerData.forEach((prisoner) => {
      let newPayRateId = newPayrateData[prisoner.id.toString()];
      prisoner.oldPayRate = oldPayRate;
      prisoner.newPayRate = payrates.find((payRate) => payRate.payRate_id.toString() === newPayRateId.toString());
    });
  } else {
    // if there is only one payrate, we know that all prisoners will be affected
    prisonerData.forEach((prisoner) => {
      console.log("one payrate");
      let newPayRateId = newPayrateData;
      prisoner.oldPayRate = oldPayRate;
      prisoner.newPayRate = payrates.find((payRate) => payRate.payRate_id.toString() === newPayRateId.toString());
    });
  }

  // render the confirm prisoner actions page
  res.render(req.protoUrl + "/check-answers", {
    prisonerData,
    payrates,
    activity,
    oldPayRate,
  });
});

// post route for confirm prisoner actions page
router.post("/delete/:payRateId/check-answers/:prisonerIds", function (req, res) {
  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonersOnPayRate = req.params.prisonerIds.split(",");
  let prisonerData = prisoners.filter((prisoner) => prisonersOnPayRate.includes(prisoner.id.toString()));

  let newPayrateData = req.session.data["new-payrate"];

  // update the prisoner data
  // check if req.session.data["new-payrate"] is a string or an object
  if (typeof newPayrateData === "object") {
    // if there is more than one payrate, we need to set payrate data for each prisoner
    prisonerData.forEach((prisoner) => {
      let newPayRateId = newPayrateData[prisoner.id.toString()];
      prisoner.payrates[activityId] = newPayRateId;
    });
  } else {
    // if there is only one payrate, we know that all prisoners will be affected
    prisonerData.forEach((prisoner) => {
      let newPayRateId = newPayrateData;
      prisoner.payrates[activityId] = newPayRateId;
    });
  }

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

  // exclude the payrate being deleted from the list of suitable payrates
  suitablePayrates = suitablePayrates.filter((payRate) => payRate.payRate_id.toString() !== payRateId.toString());

  return suitablePayrates;
}
