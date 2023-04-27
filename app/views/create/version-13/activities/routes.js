const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// when we load any page in the activities section
router.get("/:activityId/*", function (req, res, next) {
  console.log("activities section");
  
  let activityId = req.params.activityId;
  // get the data for the activity we're on
  let activityData = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() == activityId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let currentlyAllocatedPrisoners = prisoners.filter(
    (prisoner) =>
      prisoner.activity != undefined &&
      prisoner.activity != null &&
      prisoner.activity.length > 0 &&
      prisoner.activity.find((activity) => activity.toString() === activityId.toString())
  );

  // loop through each prisoner in the currentlyAllocatedPrisoners array
  currentlyAllocatedPrisoners.forEach((prisoner) => {
    // if the prisoner doesn't have a payrates object - i.e. we haven't already added payrates to them
    if (!prisoner.payrates) {
      // create a payrates object on the prisoner
      prisoner.payrates = {};

      // get the payrates array for the activity if it has a length
      let activityPayrates = activityData.payRates ? activityData.payRates : [];

      // select a payrate from the activity's payrates array at random, where the payrate.amount value is not null
      let nonNullPayrates = activityPayrates.filter((payrate) => payrate.amount != null);
      let chosenPayrate = nonNullPayrates[Math.floor(Math.random() * nonNullPayrates.length)];

      // add the payrate to the prisoner's payrates object
      prisoner.payrates[activityId] = chosenPayrate.payRate_id;

      console.log("added payrate " + chosenPayrate.payRate_id + " to " + prisoner.id);
    }
  });

  next();
});

// router for deallocate prisoner journey
router.use("/:activityId/deallocate", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];
  let subJourney = req.originalUrl.split("/")[5];

  req.activityId = req.params.activityId;

  req.protoUrl = serviceName + "/" + version + "/" + journey + "/" + subJourney;
  require("./deallocate/routes")(req, res, next);
});

// router for allocate prisoner journey
router.use("/:activityId/allocate", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];
  let subJourney = req.originalUrl.split("/")[5];

  req.activityId = req.params.activityId;

  req.protoUrl = serviceName + "/" + version + "/" + journey + "/" + subJourney;
  require("./allocate/routes")(req, res, next);
});

// router for edit activity journey (from activity details page)
router.use("/:activityId/edit", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];
  let subJourney = req.originalUrl.split("/")[5];

  req.activityId = req.params.activityId;

  req.protoUrl = serviceName + "/" + version + "/" + journey + "/" + subJourney;
  require("./edit/routes")(req, res, next);
});

// router for payrates journey
router.use("/:activityId/payrates", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];
  let subJourney = req.originalUrl.split("/")[5];

  req.activityId = req.params.activityId;

  req.protoUrl = serviceName + "/" + version + "/" + journey + "/" + subJourney;
  require("./payrates/routes")(req, res, next);
});

// router for edit allocation journey
router.use("/:activityId/edit-allocation", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];
  let subJourney = req.originalUrl.split("/")[5];

  req.activityId = req.params.activityId;

  req.protoUrl = serviceName + "/" + version + "/" + journey + "/" + subJourney;
  require("./edit-allocation/routes")(req, res, next);
});

// routes for pages in the activities section
// activities page redirect root to /all
router.get("/", function (req, res) {
  res.redirect("activities/all");
});

// all activities page
router.get("/all", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let applications = req.session.data["applications"];

  // count the number of prisoners allocated to each activity
  // and add it to each activity object in the activities array
  addAllocationsCountToActivities(activities, req, applications);
  let activitiesCount = activities.length;

  let activitiesWithVacancies = activities.filter((activity) => activity.capacity - activity.currentlyAllocated > 0);
  let vacanciesCount = activitiesWithVacancies.length;

  // render the activities page and pass the activities array to the template
  res.render(req.protoUrl + "/activities", {
    activities,
    activitiesCount,
    list: "all",
    vacanciesCount,
  });
});

// only with vacancies page
router.get("/vacancies", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let applications = req.session.data["applications"];
  let activitiesCount = activities.length;

  // count the number of prisoners allocated to each activity
  // and add it to each activity object in the activities array
  addAllocationsCountToActivities(activities, req, applications);

  let activitiesWithVacancies = activities.filter((activity) => activity.capacity - activity.currentlyAllocated > 0);
  let vacanciesCount = activitiesWithVacancies.length;

  // render the activities page and pass the new activities array to the template
  res.render(req.protoUrl + "/activities", {
    activities: activitiesWithVacancies,
    activitiesCount,
    vacanciesCount,
    list: "vacancies",
  });
});

// specific activity page
router.get("/:activityId", function (req, res) {
  // redirect to the currently allocated page for the activity
  res.redirect(req.params.activityId + "/currently-allocated");
});

// activity applications page
router.get("/:activityId/applications", function (req, res) {
  let currentPage = "applications";

  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
  let applications = req.session.data["applications"];
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  let activitySchedule = activity.schedule;
  let schedule = getActivitySchedule(activitySchedule);

  // get a list of all applications for the selected activity
  // exclude those with a status of 'rejected'
  let activityApplications = applications.filter(
    (application) => application.activity.toString() === activityId.toString() && application.status !== "rejected"
  );

  // hide the confirmation message if it's shown
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"];
  }

  // create a human-readable list of days the activity is scheduled for
  let activityDays = humanReadableSchedule(schedule);

  // create an array of objects for the days the activity is scheduled and which time period it's scheduled for
  // e.g. [{day: 'Monday', times: '(AM)'}, {day: 'Tuesday', times: '(AM and PM)'}, {day: 'Friday', times: null}]
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // get the category name for the activity
  let activityCategory = req.session.data["timetable-complete-1"]["categories"].find(
    (category) => category.id.toString() === activity.category.toString()
  );

  res.render(req.protoUrl + "/applications", {
    activity,
    activityApplications,
    activityCategory,
    activityDays,
    activityDaysWithTimes,
    currentPage,
    schedule,
  });
});

// activity details page
router.get("/:activityId/details", function (req, res) {
  let currentPage = "details";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  // set an activitySchedule variable from the activity.schedule data
  let activitySchedule = activity.schedule;

  // for each day in the activity schedule, create a new object with the day name and am/pm values
  let schedule = getActivitySchedule(activitySchedule);

  // remove the confirmation message if it's shown
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"];
  }

  // remove payrates that do not have a value
  let payRates = activity.payRates.filter((payRate) => payRate.amount !== null);

  // convert payrates array to object grouped by incentive level keys
  // incentive levels: [basic, standard, enhanced]
  let incentiveLevels = ["basic", "standard", "enhanced"];
  let payRatesByIncentiveLevel = {};
  incentiveLevels.forEach((incentiveLevel) => {
    payRatesByIncentiveLevel[incentiveLevel] = payRates.filter((payRate) => payRate.incentiveLevel === incentiveLevel);
  });

  // render the activity details page and pass the activity object to the template
  res.render(req.protoUrl + "/details", {
    activity,
    activitySchedule,
    currentPage,
    schedule,
    payRates,
    payRatesByIncentiveLevel,
  });
});

// activity currently allocated page
router.get("/:activityId/currently-allocated", function (req, res) {
  let currentPage = "currently-allocated";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get list of prisoners with allocations
  const currentlyAllocated = getAllocatedPrisoners(prisoners, activityId);

  // set an activitySchedule variable from the activity.schedule data
  let activitySchedule = activity.schedule;

  // for each day in the activity schedule, create a new object with the day name and am/pm values
  let schedule = getActivitySchedule(activitySchedule);

  // create a human-readable list of days the activity is scheduled for
  let activityDays = humanReadableSchedule(schedule);
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // get the category name for the activity
  let activityCategory = req.session.data["timetable-complete-1"]["categories"].find(
    (category) => category.id.toString() === activity.category.toString()
  );

  // hide the confirmation message if it's shown
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"];
  }

  // get and set the index of the activity in each prisoner's activity array
  currentlyAllocated.forEach((prisoner) => {
    prisoner.activityIndex = prisoner.activity.findIndex((activity) => activity.toString() === activityId.toString());
  });

  res.render(req.protoUrl + "/currently-allocated", {
    activity,
    activityCategory,
    activityDays,
    activityDaysWithTimes,
    currentPage,
    currentlyAllocated,
    schedule,
    activitySchedule,
  });
});

// activity currently allocated page
router.get("/:activityId/currently-allocated-v2", function (req, res) {
  let currentPage = "currently-allocated";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get list of prisoners with allocations
  const currentlyAllocated = getAllocatedPrisoners(prisoners, activityId);

  // set an activitySchedule variable from the activity.schedule data
  let activitySchedule = activity.schedule;

  // for each day in the activity schedule, create a new object with the day name and am/pm values
  let schedule = getActivitySchedule(activitySchedule);

  // create a human-readable list of days the activity is scheduled for
  let activityDays = humanReadableSchedule(schedule);
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // get the category name for the activity
  let activityCategory = req.session.data["timetable-complete-1"]["categories"].find(
    (category) => category.id.toString() === activity.category.toString()
  );

  // hide the confirmation message if it's shown
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"];
  }

  res.render(req.protoUrl + "/currently-allocated-v2", {
    activity,
    activityCategory,
    activityDays,
    activityDaysWithTimes,
    currentPage,
    currentlyAllocated,
    schedule,
    activitySchedule,
  });
});

// post handler for the currently allocated page
router.post("/:activityId/currently-allocated", function (req, res) {
  let selectedPrisoners = req.session.data["selected-prisoners"];

  // if the user clicks the 'remove' button, redirect to the deallocate page
  // the button name is allocation-action
  if (req.body["allocation-action"] === "deallocate") {
    res.redirect("deallocate/" + selectedPrisoners + "?redirect=");
  } else if (req.body["allocation-action"] === "edit-allocation") {
    res.redirect("edit-allocation/" + selectedPrisoners);
  }
});

// dealocate date check page
router.get("/:activityId/deallocate/:prisonerIds/date-check", function (req, res) {
  // if there is only one selected prisoner, redirect to the deallocate date page
  let selectedPrisoners = req.params.prisonerIds.split(",");
  if (selectedPrisoners.length === 1) {
    res.redirect("date");
  } else {
    // make an object of prisoner data from each prisoner ID in the selectedPrisoners array
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerData = prisoners.filter((prisoner) => selectedPrisoners.includes(prisoner.id.toString()));

    let activityId = req.params.activityId;
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId.toString()
    );

    // render the deallocate date check page
    res.render(req.protoUrl + "/deallocate-date-check", {
      activity,
      prisonerData,
    });
  }
});

// deallocate date check page POST handler
router.post("/:activityId/deallocate/:prisonerIds/date-check", function (req, res) {
  // if the radio is set to "yes", redirect to the deallocate date page
  if (req.session.data["deallocate-same-date"] === "yes") {
    res.redirect("date");
  } else {
    // redirect to the multiple deallocation date page
    res.redirect("multiple-date");
  }
});

// // activity deallocate page
// router.get("/:activityId/deallocate/:prisonerId", function (req, res) {
//   let currentPage = "deallocate";
//   let activityId = req.params.activityId;
//   let prisonerId = req.params.prisonerId;
//   let activities = req.session.data["timetable-complete-1"]["activities"];
//   let activity = activities.find(
//     (activity) => activity.id.toString() === activityId.toString()
//   );
//   let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
//   let prisoner = prisoners.find(
//     (prisoner) => prisoner.id.toString() === prisonerId.toString()
//   );

//   // render the deallocate page
//   res.render(req.protoUrl + "/deallocate", {
//     activity,
//     currentPage,
//     prisoner,
//     });
// });

// // post handler for the deallocate page
// router.post("/:activityId/deallocate/:prisonerId", function (req, res) {
//   if(req.session.data['confirm-deallocate'] === "yes") {
//     // get the prisoner id from the url
//     let prisonerId = req.params.prisonerId;
//     // remove the activity id from the prisoner's activity array
//     let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
//     let prisoner = prisoners.find(
//       (prisoner) => prisoner.id.toString() === prisonerId.toString()
//     );
//     prisoner.activity = prisoner.activity.filter(
//       (activity) => activity.toString() !== req.params.activityId.toString()
//     );

//     // set the confirmation dialog data
//     req.session.data["confirmation-dialog"] = {
//       display: true,
//       type: "deallocate",
//       prisoner: prisonerId,
//     }
//   }

//   res.redirect("../../" + req.params.activityId + "/currently-allocated");
// });

// other prisoners page
router.get("/:activityId/other-prisoners", function (req, res) {
  let currentPage = "other-prisoners";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get a list of all prisoners without an application for the selected activity
  // and without the activity id in their activity array
  // make sure we account for prisoners whose activity array is empty or undefined (i.e. no activities)
  let prisonersWithoutApplication = prisoners.filter(
    (prisoner) => !prisoner.activity || prisoner.activity.length === 0 || !prisoner.activity.includes(activityId)
  );

  let activitySchedule = activity.schedule;
  let schedule = getActivitySchedule(activitySchedule);
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // simple code for paginating prisoners to 5 per page
  // should show like:
  // Previous 1 ⋯ 6 7 8 ⋯ 42 Next
  let page = req.query.page || 1;
  let limit = 5;
  let offset = (page - 1) * limit;
  let prisonersWithoutApplicationPaginated = prisonersWithoutApplication.slice(offset, offset + limit);
  let totalPages = Math.ceil(prisonersWithoutApplication.length / limit);

  res.render(req.protoUrl + "/other-prisoners", {
    activity,
    activityDaysWithTimes,
    currentPage,
    limit,
    offset,
    prisonersWithoutApplication,
    prisonersWithoutApplicationPaginated,
    totalPages,
  });
});

// application details page
router.get("/:activityId/applications/:applicationId", function (req, res) {
  let activityId = req.params.activityId;
  let applicationId = req.params.applicationId;
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  let applications = req.session.data["applications"];
  let application = applications.find((application) => application.id.toString() === applicationId.toString());

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString());

  res.render(req.protoUrl + "/application", {
    activity,
    application,
    prisoner,
  });
});

// update application page
router.get("/:activityId/applications/:applicationId/update", function (req, res) {
  let activityId = req.params.activityId;
  let applicationId = req.params.applicationId;
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  let applications = req.session.data["applications"];
  let application = applications.find((application) => application.id.toString() === applicationId.toString());

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString());

  res.render(req.protoUrl + "/update-application", {
    activity,
    application,
    prisoner,
  });
});

// update application page - POST request to confirm changes
router.post("/:activityId/applications/:applicationId/update", function (req, res) {
  let activityId = req.params.activityId;
  let applicationId = req.params.applicationId;
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  let applications = req.session.data["applications"];
  let application = applications.find((application) => application.id.toString() === applicationId.toString());

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString());

  // get the update application from the radio buttons
  let updateApplication = req.session.data["update-application"];

  // logic for radios
  // if user rejects the application, set the application status to rejected
  // and redirect to the activity waitlist page
  // set the rejected dialog to show
  if (req.session.data["update-application"] === "reject") {
    // redirect to the confirm remove application page with the prisoner id
    // e.g. allocate/SH7137Q/confirm-remove as the url
    res.redirect("confirm-remove");
  }
  // if user accepts the application, set the application eligible to yes
  // and redirect to the activity waitlist page
  // set the accepted dialog to show
  else if (req.session.data["update-application"] === "eligible") {
    // update the application status
    application["eligible"] = "yes";

    req.session.data["confirmation-dialog"] = {
      type: "eligible",
      display: true,
      prisoner: prisoner.id,
      activity: activityId,
    };

    res.redirect("../../applications");
  }
  // if user marks the application as pending, set the application eligible to pending
  // and redirect to the activity waitlist page
  // set the pending dialog to show
  else if (req.session.data["update-application"] === "pending") {
    // update the application status
    application["eligible"] = null;

    req.session.data["confirmation-dialog"] = {
      type: "pending",
      display: true,
      prisoner: prisoner.id,
      activity: activityId,
    };

    res.redirect("../../applications");
  }
});

// update application confirmation page
router.get("/:activityId/applications/:applicationId/update-confirmation", function (req, res) {
  res.render(req.protoUrl + "/update-confirmation");
});

// confirm remove application page
router.get("/:activityId/applications/:applicationId/confirm-remove", function (req, res) {
  let activityId = req.params.activityId;
  let applicationId = req.params.applicationId;
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  let applications = req.session.data["applications"];
  let application = applications.find((application) => application.id.toString() === applicationId.toString());

  let prisonerId = application["selected-prisoner"];
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === prisonerId.toString());

  // render the confirm remove application page
  res.render(req.protoUrl + "/confirm-remove-application", {
    activityId,
    activity,
    application,
    applicationId,
    prisoner,
  });
});

// post logic for confirm remove application page
router.post("/:activityId/applications/:applicationId/confirm-remove", function (req, res) {
  let activityId = req.params.activityId;
  let applicationId = req.params.applicationId;
  let activities = req.session.data["timetable-complete-1"]["activities"];

  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  let applications = req.session.data["applications"];
  let application = applications.find((application) => application.id.toString() === applicationId.toString());

  let prisonerId = application["selected-prisoner"];
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === prisonerId.toString());

  // if user confirms the removal of the application, remove the application
  // and redirect to the activity waitlist page
  if (req.session.data["confirm-remove-application"] === "yes") {
    // remove the application from the applications array
    let index = applications.indexOf(application);
    applications.splice(index, 1);

    // set the rejected dialog to show
    req.session.data["confirmation-dialog"] = {
      type: "rejected",
      display: true,
      prisoner: prisoner.id,
    };

    // redirect to the activity waitlist page
    res.redirect("../../applications");
  }
  // if user cancels the removal of the application, redirect to the activity waitlist page
  else if (req.session.data["confirm-remove-application"] === "no") {
    // redirect to the activity waitlist page
    res.redirect("../../applications");
  }
});

// confirm remove prisoner page
router.get("/:activityId/allocate/:prisonerId/confirm-remove", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  // render the confirm remove prisoner page
  res.render(req.protoUrl + "/confirm-remove", {
    activityId,
    activity,
    prisoner,
    prisonerId,
  });
});
// post logic for confirm remove prisoner page
router.post("/:activityId/allocate/:prisonerId/confirm-remove", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;

  if (req.body["confirm-remove"] === "yes") {
    // find the prisoner's application for this activity, if it exists
    let applications = req.session.data["applications"];
    let application = applications.find(
      (application) =>
        application["selected-prisoner"].toString() === prisonerId.toString() &&
        application["activity"].toString() === activityId.toString()
    );
    // if the application exists, set the application status to rejected
    if (application) {
      application["status"] = "rejected";
    }

    // redirect to the activity waitlist page
    // and show the removed dialog
    req.session.data["confirmation-dialog"] = {
      type: "removed",
      display: true,
      prisoner: prisonerId,
      activity: activityId,
    };
    res.redirect("../../applications");
  } else {
    // redirect to the allocate page
    res.redirect("../" + req.params.prisonerId);
  }
});

// remove prisoner confirmation page
router.get("/:activityId/allocate/:prisonerId/remove-confirmation", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  // render the remove prisoner confirmation page
  res.render(req.protoUrl + "/remove-confirmation", {
    activityId,
    activity,
    prisoner,
    prisonerId,
  });
});

// check allocation details page
router.get("/:activityId/allocate/:prisonerId/check-allocation-details", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  // render the check your answers page
  res.render(req.protoUrl + "/check-allocation-details", {
    activityId,
    activity,
    prisoner,
    prisonerId,
  });
});

// post logic for check allocation details page
// go to the confirmation page
router.post("/:activityId/allocate/:prisonerId/check-allocation-details", function (req, res) {
  // allocate the prisoner to the activity
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === req.params.prisonerId.toString()
  );
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === req.params.activityId.toString()
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
      application["activity"].toString() === req.params.activityId.toString() &&
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
router.get("/:activityId/allocate/:prisonerId/allocation-confirmation", function (req, res) {
  let allocation = req.session.data["allocations"].find(
    (allocation) => allocation.id.toString() === req.query.allocation.toString()
  );

  res.render(req.protoUrl + "/allocation-confirmation", {
    allocation,
  });
});

// edit allocation page
router.get("/:activityId/edit-allocation/:prisonerId", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  // render the edit allocation page
  res.render(req.protoUrl + "/edit-allocation/allocation-details", {
    activityId,
    activity,
    prisoner,
    prisonerId,
  });
});

module.exports = router;

function addAllocationsCountToActivities(activities, req, applications) {
  activities.forEach((activity) => {
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerCount = 0;
    prisoners.forEach((prisoner) => {
      const prisonerActivities = prisoner.activity
        ? Array.isArray(prisoner.activity)
          ? prisoner.activity
          : [prisoner.activity]
        : false;

      if (prisonerActivities && prisonerActivities.includes(activity.id)) {
        prisonerCount++;
      }
    });
    activity.currentlyAllocated = prisonerCount;

    // get a count of all applications for the activity and add it to the activity object
    // but exclude ones that have been rejected
    let activityApplications = applications.filter(
      (application) =>
        application["activity"].toString() === activity.id.toString() && application["status"] !== "rejected"
    );

    // add the count of vacancies to the activity object
    // we work this out by subtracting the number of prisoners allocated to the activity from the activity capacity
    activity.vacancies = activity.capacity - prisonerCount;

    activity.applicationCount = activityApplications.length;
  });
}

// get list of prisoners with allocations
function getAllocatedPrisoners(prisoners, activityId) {
  return prisoners.filter((prisoner) => {
    let prisonerActivities;
    // check prisoner.activity is not null
    if (prisoner.activity) {
      // check prisoner.activity is an array
      if (Array.isArray(prisoner.activity)) {
        // set prisonerActivities to prisoner.activity
        prisonerActivities = prisoner.activity;
      } else {
        // set prisonerActivities to an array containing prisoner.activity
        prisonerActivities = [prisoner.activity];
      }
    } else {
      // return false if prisoner.activity is null
      return false;
    }
    // if the prisoners activity array contains the activityId, return true
    return prisonerActivities.includes(parseInt(activityId));
  });
}

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

// create a human-readable list of days the activity is scheduled for
function humanReadableSchedule(schedule) {
  let activityDays = [];
  schedule.forEach((day) => {
    if (day.am != null && day.pm != null) {
      activityDays.push(day.day + " (AM and PM)");
    } else if (day.am != null) {
      activityDays.push(day.day + " (AM)");
    } else if (day.pm != null) {
      activityDays.push(day.day + " (PM)");
    }
  });
  // capitalize the first letter of each day
  activityDays = activityDays.map((day) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  });
  // join the list of days with commas and 'and'
  activityDays = activityDays.join(", ").replace(/,([^,]*)$/, " and$1");
  return activityDays;
}

function scheduleDaysWithTimes(schedule) {
  let activityDaysWithTimes = [];
  schedule.forEach((day) => {
    if (day.am != null && day.pm != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: "AM and PM",
      });
    } else if (day.am != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: "AM",
      });
    } else if (day.pm != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: "PM",
      });
    } else {
      activityDaysWithTimes.push({
        day: day.day,
        times: null,
      });
    }
  });
  return activityDaysWithTimes;
}
