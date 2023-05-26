const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// Route index page
router.get("/", function (req, res) {
    // redirect to select activities page
    res.redirect("select-activities");
});

router.get("/select-activities", function (req, res) {
    let today = DateTime.now().toISODate();
    let activities = req.session.data["timetable-complete-1"]["activities"];

    res.render(req.protoUrl + "/select-activities", {
        today,
    });
});

// activities selected - go to date page
router.get("/:activityIds", function (req, res) {
    let activityIds = req.params.activityIds.split(",");
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = activities.find((activity) => activity.id.toString() === activityIds[0].toString());

    let today = DateTime.now().toISODate();
    
    res.render(req.protoUrl + "/date", {
        activity,
        today,
    });
});

module.exports = router;
