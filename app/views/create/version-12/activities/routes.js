const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// update application pages
router.use("/update", (req, res, next) => {
  let serviceName = req.originalUrl.split("/")[1];
  let version = req.originalUrl.split("/")[2];
  let journey = req.originalUrl.split("/")[3];

  req.protoUrl = serviceName + "/" + version + "/" + journey;
  require("./update/routes")(req, res, next);
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

  // render the activities page and pass the activities array to the template
  res.render(req.protoUrl + "/activities", {
    activities,
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
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let applications = req.session.data["applications"];
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  let activitySchedule = activity.schedule;
  let schedule = getActivitySchedule(activitySchedule);

  // get a list of all applications for the selected activity
  // exclude those with a status of 'rejected'
  let activityApplications = applications.filter(
    (application) =>
      application.activity.toString() === activityId.toString() &&
      application.status !== "rejected"
  );

  // hide the confirmation message if it's shown
  if (req.session.data["application-added-confirmation-message"] === true) {
    req.session.data["application-added-confirmation-message"] = false;
  }

  // create a human-readable list of days the activity is scheduled for
  let activityDays = humanReadableSchedule(schedule);

  // create an array of objects for the days the activity is scheduled and which time period it's scheduled for
  // e.g. [{day: 'Monday', times: '(AM)'}, {day: 'Tuesday', times: '(AM and PM)'}, {day: 'Friday', times: null}]
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  // get the category name for the activity
  let activityCategory = req.session.data["timetable-complete-1"][
    "categories"
  ].find((category) => category.id.toString() === activity.category.toString());

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

// activity currently allocated page
router.get("/:activityId/currently-allocated", function (req, res) {
  let currentPage = "currently-allocated";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
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
  let activityCategory = req.session.data["timetable-complete-1"][
    "categories"
  ].find((category) => category.id.toString() === activity.category.toString());

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

// other prisoners page
router.get("/:activityId/other-prisoners", function (req, res) {
  let currentPage = "other-prisoners";
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get a list of all prisoners without an application for the selected activity
  // and without the activity id in their activity array
  // make sure we account for prisoners whose activity array is empty or undefined (i.e. no activities)
  let prisonersWithoutApplication = prisoners.filter(
    (prisoner) =>
      !prisoner.activity ||
      prisoner.activity.length === 0 ||
      !prisoner.activity.includes(activityId)
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
  let prisonersWithoutApplicationPaginated = prisonersWithoutApplication.slice(
    offset,
    offset + limit
  );
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

  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) => application.id.toString() === applicationId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find(
    (prisoner) =>
      prisoner.id.toString() === application["selected-prisoner"].toString()
  );

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
  
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) => application.id.toString() === applicationId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find(
    (prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString()
  );

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
  
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) => application.id.toString() === applicationId.toString()
  );

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find(
    (prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString()
  );

  // get the update application from the radio buttons
  let updateApplication = req.session.data["update-application"];

  // logic for radios
  // if user rejects the application, set the application status to rejected
  // and redirect to the activity waitlist page
  // set the rejected dialog to show
  if (req.session.data["update-application"] === "reject") {
    // update the application status
    application["status"] = "rejected";
    application["eligible"] = "no";
    req.session.data["rejected-dialog"] = true;
    res.redirect("../../applications");
  }
  // if user accepts the application, set the application eligible to yes
  // and redirect to the activity waitlist page
  // set the accepted dialog to show
  else if (req.session.data["update-application"] === "eligible") {
    // update the application status
    application["eligible"] = "yes";
    req.session.data["accepted-dialog"] = true;
    res.redirect("../../applications");
  }
  // if user marks the application as pending, set the application eligible to pending
  // and redirect to the activity waitlist page
  // set the pending dialog to show
  else if (req.session.data["update-application"] === "pending") {
    // update the application status
    application["eligible"] = null;
    req.session.data["pending-dialog"] = true;
    res.redirect("../../applications");
  }
});

// update application confirmation page
router.get("/:activityId/applications/:applicationId/update-confirmation", function (req, res) {
  res.render(req.protoUrl + "/update-confirmation");
});

// activity allocate page
router.get("/:activityId/allocate/:prisonerId", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // if there is an application from this prisoner for this activity, find it and pass it to the template
  let applications = req.session.data["applications"];
  let application = applications.find(
    (application) =>
      application["selected-prisoner"].toString() === prisonerId.toString() &&
      application["activity"].toString() === activityId.toString()
  );
  
  res.render(req.protoUrl + "/allocate", {
    activityId,
    activity,
    application,
    prisoner,
    prisonerId,
  });
});

// allocate page post logic
router.post("/:activityId/allocate/:prisonerId", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // if the user chooses yes, continue to the payrate page for the allocate journey for this prisoner
  if (req.body["allocate"] === "yes") {
    res.redirect(req.params.prisonerId + '/payrate')
  } else {
    // if the user chooses no, redirect to the activity page
    res.redirect('../applications');
  }
});

// select payrate page, after the allocate page
router.get("/:activityId/allocate/:prisonerId/payrate", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  res.render(req.protoUrl + "/payrate", {
    activityId,
    activity,
    prisoner,
    prisonerId,
  });
});

// payrate page post logic
router.post("/:activityId/allocate/:prisonerId/payrate", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;

  // redirect to the check your answers page
  res.redirect("check-allocation-details");
});

// check allocation details page
router.get("/:activityId/allocate/:prisonerId/check-allocation-details", function (req, res) {
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );

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
    prisoner.activity = activity.id;
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
    allocation
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
    let activityApplications = applications.filter(
      (application) =>
        application.activity.toString() === activity.id.toString()
    );
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
    let dayNames = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
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
