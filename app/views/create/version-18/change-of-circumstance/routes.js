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

module.exports = router;