const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// Route index page
router.get("/", function (req, res) {
    // redirect to select activities page
    res.redirect(req.journey + "/select-activities");
});

router.get("/select-activities", function (req, res) {
    let today = DateTime.now().toISODate();
    let activities = req.session.data["timetable-complete-1"]["activities"];

    res.render(req.protoUrl + "/select-activities", {
        today,
        activities,
    });
});

// post route for select activities page
router.post("/select-activities", function (req, res) {
    let selectedActivities = req.session.data["selected-activities"];

    res.redirect(selectedActivities);
});


// activities selected - go to date page
router.get("/:activityIds", function (req, res) {
    let activityIds = req.params.activityIds.split(",");
    let activities = req.session.data["timetable-complete-1"]["activities"];

    let activitiesData = [];
    activityIds.forEach((activityId) => {
        let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
        activitiesData.push(activity);
    });

    let today = DateTime.now().toISODate();

    res.render(req.protoUrl + "/date", {
        activitiesData,
        today,
    });
});

// post route for date page
router.post("/:activityIds", function (req, res) {
    // log the post data to the console
    console.log(req.body);

    if (req.body["date-type"] === "date") {
        let day = req.session.data["end-date-day"];
        let month = req.session.data["end-date-month"];
        let year = req.session.data["end-date-year"];

        // check there is a day, month and year
        if (day && month && year) {
            // if there is, create a date string using luxon
            req.session.data["end-date"] = DateTime.fromObject({
                day: parseInt(day),
                month: parseInt(month),
                year: parseInt(year),
            }).toISODate();
        } else {
            // if there isn't, set date to today
            req.session.data["end-date"] = DateTime.now().toISODate();
        }
    } else {
        // set the date to today
        req.session.data["end-date"] = DateTime.now().toISODate();
    }

    res.redirect(req.params.activityIds + "/check-answers");
});

// check answers page
router.get("/:activityIds/check-answers", function (req, res) {
    let activityIds = req.params.activityIds.split(",");
    let activities = req.session.data["timetable-complete-1"]["activities"];

    let activitiesData = [];
    activityIds.forEach((activityId) => {
        let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
        activitiesData.push(activity);
    });

    res.render(req.protoUrl + "/check-answers", {
        activitiesData,
    });
});

// post route for check answers page
router.post("/:activityIds/check-answers", function (req, res) {
    // redirect to the confirmation page
    res.redirect("confirmation");
});

// confirmation page
router.get("/:activityIds/confirmation", function (req, res) {
    let activityIds = req.params.activityIds.split(",");
    let activities = req.session.data["timetable-complete-1"]["activities"];

    let activitiesData = [];
    activityIds.forEach((activityId) => {
        let activity = activities.find((activity) => activity.id.toString() === activityId.toString());
        activitiesData.push(activity);
    });

    res.render(req.protoUrl + "/confirmation", {
        activitiesData,
    });
});

module.exports = router;
