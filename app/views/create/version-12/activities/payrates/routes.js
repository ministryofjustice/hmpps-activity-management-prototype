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
    payRatesByIncentiveLevel[incentiveLevel] = payRates.filter(
      (payRate) => payRate.incentiveLevel === incentiveLevel
    );
  });

  let noAlternativePayRates = false;
  if (payRatesByIncentiveLevel["basic"].length === 0 || payRatesByIncentiveLevel["standard"].length === 0 || payRatesByIncentiveLevel["enhanced"].length === 0) {
    noAlternativePayRates = true;
  }

  // sum the number of prisoners allocated to each payrate and add it to the payratesByIncentiveLevel object
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let currentlyAllocatedPrisoners = prisoners.filter((prisoner) => prisoner.activity != undefined && prisoner.activity != null && prisoner.activity.length > 0 && prisoner.activity.find((activity) => activity.toString() === activityId.toString()));
  // for each payrate in the payratesByIncentiveLevel object
  // get the number of prisoners who have the payrate id in their payRates array
  // we must check the prisoner.payRates array exists and is not undefined, null or empty
  // we need to compare the ids as strings
  for (let incentiveLevel in payRatesByIncentiveLevel) {
    payRatesByIncentiveLevel[incentiveLevel].forEach((payRate) => {
      // prisoner payrates are stored keyed by activity id where the value is the payrate id
      // we need to get the payrate id from the prisoner payrates object
      let prisonerPayRates = currentlyAllocatedPrisoners.map((prisoner) => prisoner.payrates[activityId]);
      let prisonerPayRateIds = prisonerPayRates.filter((prisonerPayRate) => prisonerPayRate != undefined && prisonerPayRate != null);
      let prisonerCount = prisonerPayRateIds.filter((prisonerPayRateId) => prisonerPayRateId.toString() === payRate.payRate_id.toString()).length;
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

  // create a new payrate object
  let payRate = {
    payRate_id: Math.floor(Math.random() * 1000000000),
    incentiveLevel,
    amount,
    payBand,
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
  let currentlyAllocatedPrisoners = prisoners.filter((prisoner) => prisoner.activity != undefined && prisoner.activity != null && prisoner.activity.length > 0 && prisoner.activity.find((activity) => activity.toString() === activityId.toString()));

  // get the matching payrate from the activity
  // we must check the payRate_id is not undefined or null
  let payRate = activity.payRates.find((payRate) => payRate.payRate_id != undefined && payRate.payRate_id != null && payRate.payRate_id.toString() === payRateId.toString());


  // check if there are any prisoners on the payrate being deleted
  let prisonersOnPayRate = false;
  if (currentlyAllocatedPrisoners.length > 0) {
    // get the prisoner payrates for the activity
    // we need to get the payrate id from the prisoner payrates object
    let prisonerPayRates = currentlyAllocatedPrisoners.map((prisoner) => prisoner.payrates[activityId]);
    let prisonerPayRateIds = prisonerPayRates.filter((prisonerPayRate) => prisonerPayRate != undefined && prisonerPayRate != null);
    let prisonerCount = prisonerPayRateIds.filter((prisonerPayRateId) => prisonerPayRateId.toString() === payRate.payRate_id.toString()).length;

    if (prisonerCount > 0) {
      prisonersOnPayRate = true;
    }
  }

  // check if there is an alternative payrate for the incentive level of the payrate being deleted
  let alternativePayRates = false;

  // count the number of payrates with the same incentive level as the payrate being deleted
  // add the number of flatRate payrates to the count
  let payRateCount = activity.payRates.filter((r) => r.incentiveLevel === payRate.incentiveLevel && r.payRate_id.toString() !== payRateId.toString()).length;
  let flatRateCount = activity.payRates.filter((r) => r.incentiveLevel === "flatRate" && r.payRate_id.toString() !== payRateId.toString()).length;
  let totalPayRateCount = payRateCount + flatRateCount;

  // if totalPayRateCount is greater than 0 then there is an alternative payrate
  if (totalPayRateCount > 0) {
    alternativePayRates = true;
  }

  console.log(totalPayRateCount);

  // render the delete payrate page
  res.render(req.protoUrl + "/delete", {
    activity,
    payRate,
  });
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
  activity.payRates = activity.payRates.filter((payRate) => payRate.payRate_id != undefined && payRate.payRate_id != null && payRate.payRate_id.toString() !== payRateId.toString());

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
  let payRate = activity.payRates.find((payRate) => payRate.payRate_id != undefined && payRate.payRate_id != null && payRate.payRate_id.toString() === payRateId.toString());

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
  let payRate = activity.payRates.find((payRate) => payRate.payRate_id != undefined && payRate.payRate_id != null && payRate.payRate_id.toString() === payRateId.toString());

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


module.exports = router;
