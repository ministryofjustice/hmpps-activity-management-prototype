const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// routes for pages in the activities section
// activities page redirect root to /all
router.get("/", function (req, res) {
  res.redirect("activities-version-2/all");
});

// all activities page
router.get("/all", function (req, res) {
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let applications = req.session.data["applications"];
  
  // count the number of prisoners allocated to each activity
  // and add it to each activity object in the activities array
  addAllocationsCountToActivities(activities, req, applications);
  let activitiesCount = activities.length;

  let activitiesWithVacancies = activities.filter(
    (activity) => activity.capacity - activity.currentlyAllocated > 0
  );
  let vacanciesCount = activitiesWithVacancies.length;

  // render the activities page and pass the activities array to the template
  res.render(req.protoUrl + "/activities", {
    activities,
    activitiesCount,
    list: 'all',
    vacanciesCount
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

  let activitiesWithVacancies = activities.filter(
    (activity) => activity.capacity - activity.currentlyAllocated > 0
  );
  let vacanciesCount = activitiesWithVacancies.length;

  // render the activities page and pass the new activities array to the template
  res.render(req.protoUrl + "/activities", {
    activities: activitiesWithVacancies,
    activitiesCount,
    vacanciesCount,
    list: 'vacancies',
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
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"]
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
router.get("/:activityId/information", function (req, res) {
  let currentPage = "information";
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

  // hide the confirmation message if it's shown
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"]
  }

  res.render(req.protoUrl + "/information", {
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

// activity schedule page
router.get("/:activityId/schedule", function (req, res) {
  let currentPage = "schedule";
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

  // hide the confirmation message if it's shown
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"]
  }

  res.render(req.protoUrl + "/schedule", {
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

  // hide the confirmation message if it's shown
  if (req.session.data["confirmation-dialog"] && req.session.data["confirmation-dialog"].display === true) {
    delete req.session.data["confirmation-dialog"]
  }

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

//post handler for the currently allocated page
router.post("/:activityId/currently-allocated", function (req, res) {
  // if no prisoner is selected, redirect back to the currently allocated page
  if (!req.body.prisonerId) {
    res.redirect("currently-allocated");
  } else {
    res.redirect("deallocate/" + req.body.prisonerId);
  }
});

// activity deallocate page
router.get("/:activityId/deallocate/:prisonerId", function (req, res) {
  let currentPage = "deallocate";
  let activityId = req.params.activityId;
  let prisonerId = req.params.prisonerId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisoner = prisoners.find(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  // render the deallocate page
  res.render(req.protoUrl + "/deallocate", {
    activity,
    currentPage,
    prisoner,
    });
});

// post handler for the deallocate page
router.post("/:activityId/deallocate/:prisonerId", function (req, res) {
  if(req.session.data['confirm-deallocate'] === "yes") {
    // get the prisoner id from the url
    let prisonerId = req.params.prisonerId;
    // remove the activity id from the prisoner's activity array
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisoner = prisoners.find(
      (prisoner) => prisoner.id.toString() === prisonerId.toString()
    );
    prisoner.activity = prisoner.activity.filter(
      (activity) => activity.toString() !== req.params.activityId.toString()
    );

    // set the confirmation dialog data
    req.session.data["confirmation-dialog"] = {
      display: true,
      type: "deallocate",
      prisoner: prisonerId,
    }
  }

  res.redirect("../../" + req.params.activityId + "/currently-allocated");
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
router.get(
  "/:activityId/applications/:applicationId/update",
  function (req, res) {
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

    res.render(req.protoUrl + "/update-application", {
      activity,
      application,
      prisoner,
    });
  }
);

// update application page - POST request to confirm changes
router.post(
  "/:activityId/applications/:applicationId/update",
  function (req, res) {
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

    // get the update application from the radio buttons
    let updateApplication = req.session.data["update-application"];

    // logic for radios
    // if user rejects the application, set the application status to rejected
    // and redirect to the activity waitlist page
    // set the rejected dialog to show
    if (req.session.data["update-application"] === "reject") {
      // redirect to the confirm remove application page with the prisoner id
      // e.g. allocate/SH7137Q/confirm-remove as the url
      res.redirect('../../allocate/' + prisoner.id + "/confirm-remove");
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
        activity: activityId
      }

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
        activity: activityId
      }

      res.redirect("../../applications");
    }
  }
);

router.get("/:activityId/allocate", function (req, res) {
  // if there are no prisoners in the activity waitlist, redirect to allocate from general
  let applications = req.session.data["applications"];
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activityWaitlist = getApplicationsForActivity(applications, activityId);

  function getApplicationsForActivity(applications, activityId) {
    return applications.filter(
      (application) =>
        application["activity"].toString() === activityId.toString()
    );
  }

  if (activityWaitlist.length === 0) {
    res.redirect("allocate/allocate-from-general");
  } else {
    res.redirect("allocate/allocate-check-waitlist");
  }
});

// allocate allocation source page
router.get("/:activityId/allocate/allocation-source", function (req, res) {
  //render the page
  res.render(req.protoUrl + "/allocate-from");
});

// allocate from page - POST request depending on the radio button selected
router.post("/:activityId/allocate/allocation-source", function (req, res) {
  // if user selects to allocate from the waitlist, redirect to the waitlist page
  if (req.session.data["allocate-from"] === "waitlist") {
    res.redirect("allocate-from-waitlist");
  } else {
    // if user selects to allocate from the prisoner list, redirect to the prisoner list page
    res.redirect("allocate-from-general");
  }
});

// find suitable prisoners page
router.get("/:activityId/find-suitable-prisoners", function (req, res) {
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get a list of all prisoners who are not already allocated to this activity
  // prisoner.activity is undefined, or does not contain the activity id
  let suitablePrisoners = prisoners.filter(
    (prisoner) =>
    // we need to make sure the prisoner has an activity property before we can check if it contains the activity id
    // if the prisoner does not have an activity property, we can assume they are not allocated to any activities
    // if the prisoner does have an activity property, we can check if it contains the activity id
      !prisoner.activity || !prisoner.activity.includes(activityId)
  );

  // simple code for paginating prisoners
  let page = req.query.page || 1;
  let limit = 5;
  let offset = (page - 1) * limit;
  let suitablePrisonersPaginated = suitablePrisoners.slice(
    offset,
    offset + limit
  );
  let totalPages = Math.ceil(suitablePrisoners.length / limit);

  // render the page
  res.render(req.protoUrl + "/find-suitable-prisoners", {
    activity,
    suitablePrisoners,
    suitablePrisonersPaginated,
    page,
    totalPages,
    });
});    


// allocate from waitlist page
router.get("/:activityId/allocate/allocate-from-waitlist", function (req, res) {
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find(
    (activity) => activity.id.toString() === activityId.toString()
  );
  let applications = req.session.data["applications"];
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get a list of all applications for the selected activity
  // exclude those with a status of 'rejected'
  let activityApplications = applications.filter(
    (application) =>
      application.activity.toString() === activityId.toString() &&
      application.status !== "rejected"
  );

  // get the category name for the activity
  let activityCategory = req.session.data["timetable-complete-1"][
    "categories"
  ].find((category) => category.id.toString() === activity.category.toString());

  res.render(req.protoUrl + "/allocate-from-waitlist", {
    activity,
    activityApplications,
    activityCategory,
  });
});

// allocate from page
router.get("/:activityId/allocate/select-prisoner", function (req, res) {
  //render the page
  res.render(req.protoUrl + "/allocate-select-prisoner");
});


// update application confirmation page
router.get(
  "/:activityId/applications/:applicationId/update-confirmation",
  function (req, res) {
    res.render(req.protoUrl + "/update-confirmation");
  }
);

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

  if (req.body["allocate"] === "no") {
    // if the user chooses no, go to the confirm remove prisoner page
    res.redirect(req.params.prisonerId + "/confirm-remove");
  } else {
    // otherwise, continue to the payrate page for the allocate journey for this prisoner
    res.redirect(req.params.prisonerId + "/payrate");
  }
});

// confirm remove prisoner page
router.get(
  "/:activityId/allocate/:prisonerId/confirm-remove",
  function (req, res) {
    let activityId = req.params.activityId;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
      (prisoner) => prisoner.id.toString() === prisonerId.toString()
    );
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = activities.find(
      (activity) => activity.id.toString() === activityId.toString()
    );

    // render the confirm remove prisoner page
    res.render(req.protoUrl + "/confirm-remove", {
      activityId,
      activity,
      prisoner,
      prisonerId,
    });
  }
);
// post logic for confirm remove prisoner page
router.post(
  "/:activityId/allocate/:prisonerId/confirm-remove",
  function (req, res) {
    let activityId = req.params.activityId;
    let prisonerId = req.params.prisonerId;

    if (req.body["confirm-remove"] === "yes") {
      // find the prisoner's application for this activity, if it exists
      let applications = req.session.data["applications"];
      let application = applications.find(
        (application) =>
          application["selected-prisoner"].toString() ===
            prisonerId.toString() &&
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
        activity: activityId
      }
      res.redirect("../../applications");
    } else {
      // redirect to the allocate page
      res.redirect("../" + req.params.prisonerId);
    }
  }
);

// remove prisoner confirmation page
router.get(
  "/:activityId/allocate/:prisonerId/remove-confirmation",
  function (req, res) {
    let activityId = req.params.activityId;
    let prisonerId = req.params.prisonerId;
    let prisoner = req.session.data["timetable-complete-1"]["prisoners"].find(
      (prisoner) => prisoner.id.toString() === prisonerId.toString()
    );
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = activities.find(
      (activity) => activity.id.toString() === activityId.toString()
    );

    // render the remove prisoner confirmation page
    res.render(req.protoUrl + "/remove-confirmation", {
      activityId,
      activity,
      prisoner,
      prisonerId,
    });
  }
);

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

  let payRate = {
    "payAmount": 1.3,
    "incentiveLevels": {
        "basic": true,
        "standard": true,
        "enhanced": true
    },
    "payBands": {
        "unskilled": true,
        "skilled": true,
        "experienced": true
    }
  }

  // redirect to the check your answers page
  res.redirect("check-allocation-details");
});

// check allocation details page
router.get(
  "/:activityId/allocate/:prisonerId/check-allocation-details",
  function (req, res) {
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
  }
);

// post logic for check allocation details page
// go to the confirmation page
router.post(
  "/:activityId/allocate/:prisonerId/check-allocation-details",
  function (req, res) {
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
        application["selected-prisoner"].toString() ===
          req.params.prisonerId.toString() &&
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
    if (
      req.session.data["allocations"] &&
      Array.isArray(req.session.data["allocations"])
    ) {
      req.session.data["allocations"].push(req.session.data["allocation"]);
    } else {
      req.session.data["allocations"] = [req.session.data["allocation"]];
    }

    // redirect to the confirmation page
    res.redirect(
      "allocation-confirmation?allocation=" +
        req.session.data["allocation"]["id"]
    );
  }
);

// allocation confirmation page
router.get(
  "/:activityId/allocate/:prisonerId/allocation-confirmation",
  function (req, res) {
    let allocation = req.session.data["allocations"].find(
      (allocation) =>
        allocation.id.toString() === req.query.allocation.toString()
    );

    res.render(req.protoUrl + "/allocation-confirmation", {
      allocation,
    });
  }
);

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
        application["activity"].toString() === activity.id.toString() &&
        application["status"] !== "rejected"
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
        times: {
          am: "AM",
          pm: "PM",
        }
      });
    } else if (day.am != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: {
          am: "AM",
        }
      });
    } else if (day.pm != null) {
      activityDaysWithTimes.push({
        day: day.day,
        times: {
          pm: "PM",
        }
      });
    } else {
      activityDaysWithTimes.push({
        day: day.day
      });
    }
  });
  return activityDaysWithTimes;
}
