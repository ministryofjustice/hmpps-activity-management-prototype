const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// routes for pages in the activities section
// activities page redirect root to /all
router.get("/:prisonerIds", function (req, res) {
  let prisonerIds = req.params.prisonerIds;
  let selectedPrisoners = prisonerIds.split(",");

  // if there is no deallocation session data, create it
  if (!req.session.data["deallocation"]) {
    req.session.data["deallocation"] = {};
  }

  // for each prisoner in selectedPrisoners, add a deallocation object to the session data
  selectedPrisoners.forEach((prisonerId) => {
    if (!req.session.data["deallocation"][prisonerId]) {
      req.session.data["deallocation"][prisonerId] = {};
    }
  });

  res.redirect(prisonerIds + "/date-check");
});

// dealocate date check page
router.get("/:prisonerIds/date-check", function (req, res) {
  // if there is only one selected prisoner, redirect to the deallocate date page
  let selectedPrisoners = req.params.prisonerIds.split(",");
  if (selectedPrisoners.length === 1) {
    // if there is a redirect query string in the URL, redirect to the correct page
    let redirect = req.query.redirect;
    res.redirect("date?redirect=" + redirect);
  } else {
    // make an object of prisoner data from each prisoner ID in the selectedPrisoners array
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerData = prisoners.filter((prisoner) =>
      selectedPrisoners.includes(prisoner.id.toString())
    );

    let activityId = req.activityId;
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId.toString()
    );

    // render the deallocate date check page
    res.render(req.protoUrl + "/date-check", {
      activity,
      prisonerData,
    });
  }
});

// deallocate date check page POST handler
router.post("/:prisonerIds/date-check", function (req, res) {
  // if the dates are the same, redirect to the date page
  if (req.session.data["deallocate-same-date"] === "no") {
    let selectedPrisoners = req.params.prisonerIds.split(",");
    res.redirect("date" + "/" + selectedPrisoners[0]);
  } else {
    // if the dates are different, redirect to the date entry page for the first prisoner
    res.redirect("date");
  }
});

// date entry page for multiple prisoners with different dates
router.get("/:prisonerIds/date/:prisonerId", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter((prisoner) => {
    return prisoner.id.toString() === prisonerId.toString();
  });

  let selectedPrisoners = req.params.prisonerIds.split(",");
  let prisonerIndex = selectedPrisoners.indexOf(prisonerId) + 1;

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let multiple = true;

  // render the date entry page
  res.render(req.protoUrl + "/date", {
    activity,
    prisonerData,
    multiple,
    selectedPrisoners,
    prisonerIndex,
  });
});

// date entry page POST handler
router.post("/:prisonerIds/date/:prisonerId", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let prisoners = req.params.prisonerIds.split(",");
  let prisonerIndex = prisoners.indexOf(prisonerId);

  let date = DateTime.now().toISODate();

  // if the radio is set to "specific-date", set the date to the date entered instead of today's date
  if (req.session.data["deallocation-date"] === "specific-date") {
    // get separate date parts from the deallocation date and format them as YYYY-MM-DD
    date = DateTime.fromObject({
      year: req.session.data["deallocation-date-year"],
      month: req.session.data["deallocation-date-month"],
      day: req.session.data["deallocation-date-day"],
    }).toISODate();
  }

  req.session.data["deallocation"][prisonerId]["date"] = date;

  // redirect to the check page if there is a query string in the URL
  if (req.query.redirect === "check-deallocation") {
    res.redirect("check-deallocation");
  } else {
    // redirect to the date entry page for the next prisoner
    if (prisonerIndex < prisoners.length - 1) {
      res.redirect(prisoners[prisonerIndex + 1]);
    } else {
      // if there are no more prisoners, redirect to the reason page
      res.redirect("../reason-check");
    }
  }
});

// deallocate date page
router.get("/:prisonerIds/date", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");

  // make an object of prisoner data from each prisoner ID in the selectedPrisoners array
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter((prisoner) =>
    selectedPrisoners.includes(prisoner.id.toString())
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let multiple = false;

  // render the deallocate date page
  res.render(req.protoUrl + "/date", {
    activity,
    multiple,
    prisonerData,
  });
});

// deallocate date page POST handler
router.post("/:prisonerIds/date", function (req, res) {
  let date = DateTime.fromObject({
    year: req.session.data["deallocation-date-year"],
    month: req.session.data["deallocation-date-month"],
    day: req.session.data["deallocation-date-day"],
  }).toISODate();

  // set the date in the deallocation session data for each prisoner
  let selectedPrisoners = req.params.prisonerIds.split(",");
  selectedPrisoners.forEach((prisonerId) => {
    req.session.data["deallocation"][prisonerId]["date"] = date;
  });

  // redirect to the check page if there is a query string in the URL
  if (req.query.redirect === "check-deallocation") {
    res.redirect("check-deallocation");
  } else {
    // if there are multiple prisoners, redirect to the reason check page
    if (selectedPrisoners.length > 1) {
      res.redirect("reason-check");
    } else {
      res.redirect("reason");
    }
  }
});

// deallocate reason check page
router.get("/:prisonerIds/reason-check", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");

  if (selectedPrisoners.length === 1) {
    // if there is a redirect query string in the URL, redirect to the correct page
    let redirect = req.query.redirect;
    res.redirect("reason?redirect=" + redirect);
  } else {
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerData = prisoners.filter((prisoner) =>
      selectedPrisoners.includes(prisoner.id.toString())
    );

    let activityId = req.activityId;
    let activity = req.session.data["timetable-complete-1"]["activities"].find(
      (activity) => activity.id.toString() === activityId.toString()
    );

    // render the deallocate reason check page
    res.render(req.protoUrl + "/reason-check", {
      activity,
      prisonerData,
    });
  }
});

// deallocate reason check page POST handler
router.post("/:prisonerIds/reason-check", function (req, res) {
  // if the user clicks "Yes", redirect to the reason page
  if (req.session.data["deallocate-same-reason"] === "yes") {
    res.redirect("reason");
  } else {
    // if the user selects "No", redirect to the reason page for each prisoner
    let selectedPrisoners = req.params.prisonerIds.split(",");
    res.redirect("reason/" + selectedPrisoners[0]);
  }
});

// deallocate reason page for each prisoner
router.get("/:prisonerIds/reason/:prisonerId", function (req, res) {
  let prisonerId = req.params.prisonerId;
  // prisoners timetable data
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter(
    (prisoner) => prisoner.id.toString() === prisonerId.toString()
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let selectedPrisoners = req.params.prisonerIds.split(",");
  let prisonerIndex = selectedPrisoners.indexOf(prisonerId) + 1;

  let multiple = true;

  // render the deallocate reason page
  res.render(req.protoUrl + "/reason", {
    activity,
    multiple,
    prisonerId,
    prisonerData,
    selectedPrisoners,
    prisonerIndex,
  });
});

// deallocate reason page for each prisoner POST handler
router.post("/:prisonerIds/reason/:prisonerId", function (req, res) {
  let prisonerId = req.params.prisonerId;
  let reason = req.session.data["deallocation-reason"];

  // set the reason in the deallocation session data for each prisoner
  req.session.data["deallocation"][prisonerId]["reason"] = reason;

  // redirect to the date entry page for the next prisoner
  let selectedPrisoners = req.params.prisonerIds.split(",");
  let prisonerIndex = selectedPrisoners.indexOf(prisonerId);
  if (prisonerIndex < selectedPrisoners.length - 1) {
    res.redirect(selectedPrisoners[prisonerIndex + 1]);
  } else {
    // if there are no more prisoners, redirect to the confirmation page
    res.redirect("../check-deallocation");
  }
});

// deallocate reason page
router.get("/:prisonerIds/reason", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");

  // make an object of prisoner data from each prisoner ID in the selectedPrisoners array
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter((prisoner) =>
    selectedPrisoners.includes(prisoner.id.toString())
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  let multiple = false;

  let selectedReason =
    req.session.data["deallocation"][selectedPrisoners[0]]["reason"];

  // render the deallocate reason page
  res.render(req.protoUrl + "/reason", {
    activity,
    multiple,
    prisonerData,
    selectedReason,
  });
});

// deallocate reason page POST handler
router.post("/:prisonerIds/reason", function (req, res) {
  // set the date in the deallocation session data for each prisoner
  let selectedPrisoners = req.params.prisonerIds.split(",");
  let reason = req.session.data["deallocation-reason"];

  selectedPrisoners.forEach((prisonerId) => {
    req.session.data["deallocation"][prisonerId]["reason"] = reason;
  });

  res.redirect("check-deallocation");
});

// check same reason page
router.get("/:prisonerIds/check-same-reason", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");

  if (selectedPrisoners.length === 1) {
    res.redirect("reason");
  }
});

// deallocate check page
router.get("/:prisonerIds/check-deallocation", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");

  // make an object of prisoner data from each prisoner ID in the selectedPrisoners array
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter((prisoner) =>
    selectedPrisoners.includes(prisoner.id.toString())
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // render the deallocate check page
  res.render(req.protoUrl + "/check-deallocation", {
    activity,
    prisonerData,
  });
});

// deallocate check page POST handler
router.post("/:prisonerIds/check-deallocation", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");

  // make an object of prisoner data from each prisoner ID in the selectedPrisoners array
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter((prisoner) =>
    selectedPrisoners.includes(prisoner.id.toString())
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // remove the activity from the prisoner's activity list
  prisonerData.forEach((prisoner) => {
    prisoner.activity = prisoner.activity.filter(
      (activity) => activity.toString() !== activityId.toString()
    );
  });

  res.redirect("deallocation-confirmation");
});

// deallocate confirmation page
router.get("/:prisonerIds/deallocation-confirmation", function (req, res) {
  let selectedPrisoners = req.params.prisonerIds.split(",");

  // make an object of prisoner data from each prisoner ID in the selectedPrisoners array
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let prisonerData = prisoners.filter((prisoner) =>
    selectedPrisoners.includes(prisoner.id.toString())
  );

  let activityId = req.activityId;
  let activity = req.session.data["timetable-complete-1"]["activities"].find(
    (activity) => activity.id.toString() === activityId.toString()
  );

  // render the deallocate confirmation page
  res.render(req.protoUrl + "/confirmation", {
    activity,
    prisonerData,
  });
});

// activity deallocate page
router.get("/:activityId/deallocate/:prisonerId", function (req, res) {
  let currentPage = "deallocate";
  let activityId = req.activityId;
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
  if (req.session.data["confirm-deallocate"] === "yes") {
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
    };
  }

  res.redirect("../../" + req.params.activityId + "/currently-allocated");
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