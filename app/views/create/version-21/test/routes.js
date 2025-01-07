const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// activity page
router.get("/", function (req, res) {
  res.redirect(req.originalUrl + "/select-date");
});

// select-date page
router.get("/select-date", function (req, res) {
  res.render(req.protoUrl + "/select-date");
});

// post route for select-date page
router.post("/select-date", function (req, res) {
  // redirect to the list of changes page
  res.redirect("list-of-changes");
});

const changeTypes = [
  {
    name: "Release (end of sentence or release from remand)",
    type: "releases"
  },
  {
    name: "Transfer-out",
    type: "movements"
  },
  {
    name: "Transfer-in (return)",
    type: "movements"
  },
  {
    name: "Arrival",
    type: "movements"
  },
  {
    name: "Cell move",
    type: "movements"
  },
  {
    name: "Incentive level increased",
    type: "incentive level changes"
  },
  {
    name: "Incentive level decreased",
    type: "incentive level changes"
  },
  {
    name: "New alert",
    type: "New alerts"
  },
  {
    name: "New non-association in same prison",
    type: "non-associations"
  },
  {
    name: "New non-association in same activity",
    type: "non-associations"
  },
  {
    name: "Adjudication outcome",
    type: "adjudications"
  },
  {
    name: "Temporary release",
    type: "movements"
  },
  {
    name: "Release to hospital",
    type: "movements"
  }
];

// list-of-changes page
router.get("/list-of-changes", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"].prisoners;

  let changes = [];

  // for each status, assign a prisoner
  changeTypes.forEach(function (changeType) {
    // pick every 13th prisoner so appear to be random but are always the same ones
    let prisoner = prisoners[changeTypes.indexOf(changeType) * 13];

    // if the prisoner's activity is not set, select a different prisoner
    if (!prisoner.activity) {
      prisoner = prisoners[changeTypes.indexOf(changeType) * 13 + 3];
    }

    // give each change an id, which is the type of change converted to a lowercase url-friendly string (e.g. "Release (end of sentence or release from remand)" becomes "release-end-of-sentence-or-release-from-remand")
    let id = changeType.name.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");

    // create a change object
    let change = {
      id: id,
      changeType: changeType,
      prisoner: prisoner,
      date: DateTime.local().minus({ days: Math.floor(Math.random() * 30) })
    };

    // add the change to the changes array
    changes.push(change);
  });

  res.render(req.protoUrl + "/list-of-changes", {
    changes: changes
  });
});

// list-of-changes page
router.get("/list-of-changes-grouped", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"].prisoners;

  let changes = [];

  // for each status, assign a prisoner
  changeTypes.forEach(function (changeType) {
    // pick every 13th prisoner so appear to be random but are always the same ones
    let prisoner = prisoners[changeTypes.indexOf(changeType) * 13];

    // if the prisoner's activity is not set, select a different prisoner
    if (!prisoner.activity) {
      prisoner = prisoners[changeTypes.indexOf(changeType) * 13 + 3];
    }

    // give each change an id, which is the type of change converted to a lowercase url-friendly string (e.g. "Release (end of sentence or release from remand)" becomes "release-end-of-sentence-or-release-from-remand")
    let id = changeType.name.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");

    // create a change object
    let change = {
      id: id,
      changeType: changeType,
      prisoner: prisoner,
      date: DateTime.local().minus({ days: Math.floor(Math.random() * 30) })
    };

    // add the change to the changes array
    changes.push(change);
  });

  // sort the changes into nested arrays by type
  let changesByType = {};
  changes.forEach(function (change) {
    if (!changesByType[change.changeType.type]) {
      changesByType[change.changeType.type] = [];
    }
    changesByType[change.changeType.type].push(change);
  });

  res.render(req.protoUrl + "/list-of-changes-grouped", {
    changesByType: changesByType
  });
});

// list-of-changes page
router.get("/list-of-changes-accordion", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"].prisoners;

  let changes = [];

  // for each status, assign a prisoner
  changeTypes.forEach(function (changeType) {
    // pick every 13th prisoner so appear to be random but are always the same ones
    let prisoner = prisoners[changeTypes.indexOf(changeType) * 13];

    // if the prisoner's activity is not set, select a different prisoner
    if (!prisoner.activity) {
      prisoner = prisoners[changeTypes.indexOf(changeType) * 13 + 3];
    }

    // give each change an id, which is the type of change converted to a lowercase url-friendly string (e.g. "Release (end of sentence or release from remand)" becomes "release-end-of-sentence-or-release-from-remand")
    let id = changeType.name.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");

    // create a change object
    let change = {
      id: id,
      changeType: changeType,
      prisoner: prisoner,
      date: DateTime.local().minus({ days: Math.floor(Math.random() * 30) })
    };

    // add the change to the changes array
    changes.push(change);
  });

  // sort the changes into nested arrays by type
  let changesByType = {};
  changes.forEach(function (change) {
    if (!changesByType[change.changeType.type]) {
      changesByType[change.changeType.type] = [];
    }
    changesByType[change.changeType.type].push(change);
  });

  res.render(req.protoUrl + "/list-of-changes-accordion", {
    changesByType: changesByType
  });
});

// change-details page
router.get("/details/:id", function (req, res) {
  res.render(req.protoUrl + "/change-details");
});

// Schedule page
router.get("/list-of-changes-grouped", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"].prisoners;

  let changes = [];

  // for each status, assign a prisoner
  changeTypes.forEach(function (changeType) {
    // pick every 13th prisoner so appear to be random but are always the same ones
    let prisoner = prisoners[changeTypes.indexOf(changeType) * 13];

    // if the prisoner's activity is not set, select a different prisoner
    if (!prisoner.activity) {
      prisoner = prisoners[changeTypes.indexOf(changeType) * 13 + 3];
    }

    // give each change an id, which is the type of change converted to a lowercase url-friendly string (e.g. "Release (end of sentence or release from remand)" becomes "release-end-of-sentence-or-release-from-remand")
    let id = changeType.name.toLowerCase().replace(/ /g, "-").replace(/[^a-z0-9-]/g, "");

    // create a change object
    let change = {
      id: id,
      changeType: changeType,
      prisoner: prisoner,
      date: DateTime.local().minus({ days: Math.floor(Math.random() * 30) })
    };

    // add the change to the changes array
    changes.push(change);
  });

  res.render(req.protoUrl + "/list-of-changes-grouped", {
    changes: changes
  });
});

//new

// activity page
router.get("/:activityId", function (req, res) {
  let activityId = req.params.activityId;
  let activities = req.session.data["timetable-complete-1"]["activities"];
  let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

  let activitySchedule = activity.schedule;
  let schedule = getActivitySchedule(activitySchedule);
  let activityDaysWithTimes = scheduleDaysWithTimes(schedule);

  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];

  // get list of prisoners with allocations
  const currentlyAllocated = getAllocatedPrisoners(prisoners, activityId);

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

  // get the list of applications
  let applications = req.session.data["applications"];

  // get a list of all applications for the selected activity
  // exclude those with a status of 'rejected'
  let activityApplications = applications.filter(
      (application) => application.activity.toString() === activityId.toString() && application.status !== "rejected"
  );

  // get a list of all prisoners without an application for the selected activity
  // and without the activity id in their activity array
  // make sure we account for prisoners whose activity array is empty or undefined (i.e. no activities)
  let prisonersWithoutApplication = prisoners.filter(
      (prisoner) => !prisoner.activity || prisoner.activity.length === 0 || !prisoner.activity.includes(activityId)
  );

  // simple code for paginating prisoners to 5 per page
  // should show like:
  // Previous 1 ⋯ 6 7 8 ⋯ 42 Next
  let page = req.query.page || 1;
  let limit = 5;
  let offset = (page - 1) * limit;
  let prisonersWithoutApplicationPaginated = prisonersWithoutApplication.slice(offset, offset + limit);
  let totalPages = Math.ceil(prisonersWithoutApplication.length / limit);

  if (!req.session.data["page"]) {
      req.session.data["page"] = 1;
  }

  res.render(req.protoUrl + "/list-of-changes-grouped", {
      activity: activity,
      activityDaysWithTimes: activityDaysWithTimes,
      activityCategory: activityCategory,
      currentlyAllocated: currentlyAllocated,
      activityApplications: activityApplications,
      prisonersWithoutApplication: prisonersWithoutApplicationPaginated,
      totalPages: totalPages,
      offset: offset,
      limit: limit,
  });
});

module.exports = router;