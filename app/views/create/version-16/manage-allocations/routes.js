const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// Add your routes here - above the module.exports line
// home page for manage allocations journey
router.get("/", function (req, res) {
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let applications = req.session.data["applications"];

    // count the number of prisoners allocated to each activity
    // and add it to each activity object in the activities array
    addAllocationsCountToActivities(activities, req, applications);
    let activitiesCount = activities.length;

    let activitiesWithVacancies = activities.filter((activity) => activity.capacity - activity.currentlyAllocated > 0);
    let vacanciesCount = activitiesWithVacancies.length;

    // for each activity, add the next session to the activities array
    for (let activity of activities) {
        // get and set the selected date and period using the current date and time
        // date should be formatted as YYYY-MM-DD
        let selectedDate = new Date().toISOString().slice(0, 10);
        let selectedPeriod = "AM";
        let currentTime = Date.now().toString().slice(11, 16);
        if (currentTime > "12:00") {
            selectedPeriod = "PM";
        }
        activity.nextSession = getNextSession(activity, selectedDate, selectedPeriod);
    }

    // render the activities page and pass the activities array to the template
    res.render(req.protoUrl + "/select-activity", {
        activities,
        activitiesCount,
        list: "all",
        vacanciesCount,
    });
});

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

    res.render(req.protoUrl + "/activity", {
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

// waitlist page
router.get("/:activityId/waitlist", function (req, res) {
    let activityId = req.params.activityId;
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

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

    // get the list of applications
    let applications = req.session.data["applications"];

    // get a list of all applications for the selected activity
    // exclude those with a status of 'rejected'
    let activityApplications = applications.filter(
        (application) => application.activity.toString() === activityId.toString() && application.status !== "rejected"
    );

    res.render(req.protoUrl + "/waitlist", {
        activity: activity,
        activityCategory: activityCategory,
        currentlyAllocated: currentlyAllocated,
        activityApplications: activityApplications,
    });
});

// POST route for waitlist page
router.post("/:activityId/waitlist", function (req, res) {
    let formAction = req.session.data["submit-action"];

    // route the user to the correct page based on the form action
    if (formAction === "allocate") {
        let prisonerId = req.session.data["selected-prisoner"].split(",")[0];
        res.redirect("allocate/" + prisonerId);
    } else if (formAction === "view-edit") {
        let applicationId = req.session.data["selected-prisoner"].split(",")[1];
        res.redirect("applications/" + applicationId);
    } else if (formAction === "apply-filters") {
        res.redirect("waitlist");
    }
});

// allocate page
router.get("/:activityId/allocate", function (req, res) {
    let activityId = req.params.activityId;
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

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

    res.render(req.protoUrl + "/allocate", {
        activity: activity,
        activityCategory: activityCategory,
        currentlyAllocated: currentlyAllocated,
        prisonersWithoutApplication: prisonersWithoutApplicationPaginated,
        totalPages: totalPages,
        offset: offset,
        limit: limit,
    });
});



// post route for activity page
router.post("/:activityId", function (req, res) {
    let activityId = req.params.activityId;
    let selectedPrisoners = req.session.data["selected-prisoners"];

    console.log("selected prisoners: " + selectedPrisoners);

    // if the user clicks the 'remove' button, redirect to the deallocate page
    // the button name is allocation-action
    if (req.body["allocation-action"] === "deallocate") {
        res.redirect(activityId + "/deallocate/" + selectedPrisoners);
    } else if (req.body["allocation-action"] === "edit-allocation") {
        res.redirect(activityId + "/edit-allocation/" + selectedPrisoners);
    }
});

// applications page
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

// update application page - POST request to confirm changes
router.post("/:activityId/applications/:applicationId", function (req, res) {
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

    // if user rejects the application, set the application status to rejected
    // redirect to the activity waitlist page and set the rejected dialog to show
    if (req.session.data["update-application"] === "reject") {
        // redirect to the confirm remove application page with the prisoner id
        // e.g. allocate/SH7137Q/confirm-remove as the url
        res.redirect(applicationId + "/confirm-remove");
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

        res.redirect("../../" + activityId + "#waitlist");
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

        res.redirect("../../" + activityId + "#waitlist");
    }
});

// change application page
router.get("/:activityId/applications/:applicationId/change-status", function (req, res) {
    let activityId = req.params.activityId;
    let applicationId = req.params.applicationId;
    let activities = req.session.data["timetable-complete-1"]["activities"];

    let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

    let applications = req.session.data["applications"];
    let application = applications.find((application) => application.id.toString() === applicationId.toString());

    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString());

    res.render(req.protoUrl + "/change-application-status", {
        activity,
        application,
        prisoner,
    });
});

// POST route for change application page
router.post("/:activityId/applications/:applicationId/change-status", function (req, res) {
    let newStatus = req.session.data["new-application-status"];

    let applicationId = req.params.applicationId;
    let applications = req.session.data["applications"];
    let application = applications.find((application) => application.id.toString() === applicationId.toString());
    
    // if the new status is 'pending', set the application eligible to null
    if (newStatus === "pending") {
        application["eligible"] = null;
    }
    // otherwise, set the application eligible to the new status
    else {
        application["eligible"] = newStatus;
    }

    application["application-status-date"] = new Date().toISOString().slice(0, 10);

    // redirect to the activity page
    res.redirect("../" + applicationId);
});

// change requester page
router.get("/:activityId/applications/:applicationId/change-requester", function (req, res) {
    let activityId = req.params.activityId;
    let applicationId = req.params.applicationId;
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

    let applications = req.session.data["applications"];
    let application = applications.find((application) => application.id.toString() === applicationId.toString());

    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString());

    res.render(req.protoUrl + "/change-application-requester", {
        activity,
        application,
        prisoner,
    });
});

// change application date page
router.get("/:activityId/applications/:applicationId/change-date", function (req, res) {
    let activityId = req.params.activityId;
    let applicationId = req.params.applicationId;
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

    let applications = req.session.data["applications"];
    let application = applications.find((application) => application.id.toString() === applicationId.toString());

    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === application["selected-prisoner"].toString());

    res.render(req.protoUrl + "/change-application-date", {
        activity,
        application,
        prisoner,
    });
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

// comment page
router.get("/:activityId/applications/:applicationId/add-comment", function (req, res) {
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activityId = req.params.activityId;
    let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

    let applications = req.session.data["applications"];
    let applicationId = req.params.applicationId;
    let application = applications.find((application) => application.id.toString() === applicationId.toString());

    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerId = application["selected-prisoner"];
    let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === prisonerId.toString());

    res.render(req.protoUrl + "/application-comment", {
        activity,
        application,
        prisoner,
    });
});

// POST route for comment page
router.post("/:activityId/applications/:applicationId/add-comment", function (req, res) {
    let activities = req.session.data["timetable-complete-1"]["activities"];
    let activityId = req.params.activityId;
    let activity = activities.find((activity) => activity.id.toString() === activityId.toString());

    let applications = req.session.data["applications"];
    let applicationId = req.params.applicationId;
    let application = applications.find((application) => application.id.toString() === applicationId.toString());

    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let prisonerId = application["selected-prisoner"];
    let prisoner = prisoners.find((prisoner) => prisoner.id.toString() === prisonerId.toString());

    // create a comment object (date should be the current date formatted as yyyy-mm-dd)
    let comment = {};

    // if the user has entered a comment, add it to the application
    if (req.session.data["application-comment"].length > 0) {
        comment["date"] = new Date().toISOString().slice(0, 10);
        comment["text"] = req.session.data["application-comment"];
        console.log(comment);
        application.comment = comment;
    } else {
        application.comment = null;
    }

    // redirect to the application page
    res.redirect("../" + applicationId);
});


// confirm remove application page - POST request to confirm removal
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
        res.redirect("../../../" + activityId + "#waitlist");
    }
    // if user cancels the removal of the application, redirect to the activity waitlist page
    else if (req.session.data["confirm-remove-application"] === "no") {
        // redirect to the activity waitlist page
        res.redirect("../../../" + activityId + "#waitlist");
    }
});


// allocate journey routes
router.use("/:activityId/allocate", function (req, res, next) {
    req.activityId = req.params.activityId;
    req.protoUrl = req.serviceName + "/" + req.version + "/" + req.journey + "/" + req.subJourney;

    require("./allocate/routes")(req, res, next);
});

// deallocate journey routes
router.use("/:activityId/deallocate", function (req, res, next) {
    req.activityId = req.params.activityId;
    req.protoUrl = req.serviceName + "/" + req.version + "/" + req.journey + "/" + req.subJourney;

    require("./deallocate/routes")(req, res, next);
});

// edit allocation journey routes
router.use("/:activityId/edit-allocation", function (req, res, next) {
    req.activityId = req.params.activityId;
    req.protoUrl = req.serviceName + "/" + req.version + "/" + req.journey + "/" + req.subJourney;

    require("./edit-allocation/routes")(req, res, next);
});

module.exports = router;

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

// generate the activity schedule with times from the activity schedule data
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

// count the number of prisoners allocated to each activity
// and add it to each activity object in the activities array
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

function getNextSession(activity, selectedDate, selectedPeriod) {
    selectedDate = new Date(selectedDate);
    var currentDay = selectedDate.getDay();

    var nextSession = {
        date: null,
        period: null,
    };

    var maxIterations = 8;
    while (maxIterations > 0) {
        if (selectedPeriod === "AM") {
            if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {
                return (nextSession = {
                    date: selectedDate.toISOString().slice(0, 10),
                    period: "PM",
                });
            } else {
                currentDay++;
                if (currentDay === 7) {
                    currentDay = 0;
                }
                if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].am !== null) {
                    selectedDate.setDate(selectedDate.getDate() + 1);
                    return (nextSession = {
                        date: selectedDate.toISOString().slice(0, 10),
                        period: "AM",
                    });
                } else {
                    if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {
                        selectedDate.setDate(selectedDate.getDate() + 1);
                        return (nextSession = {
                            date: selectedDate.toISOString().slice(0, 10),
                            period: "PM",
                        });
                    } else {
                        selectedDate.setDate(selectedDate.getDate() + 1);
                        maxIterations--;
                    }
                }
            }
        } else if (selectedPeriod === "PM") {
            currentDay++;
            if (currentDay === 7) {
                currentDay = 0;
                // selectedDate.setDate(selectedDate.getDate() + 1);
            }
            if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].am !== null) {
                selectedDate.setDate(selectedDate.getDate() + 1);
                return (nextSession = {
                    date: selectedDate.toISOString().slice(0, 10),
                    period: "AM",
                });
            } else {
                if (activity.schedule && activity.schedule[currentDay] && activity.schedule[currentDay].pm !== null) {
                    selectedDate.setDate(selectedDate.getDate() + 1);
                    return (nextSession = {
                        date: selectedDate.toISOString().slice(0, 10),
                        period: "PM",
                    });
                } else {
                    selectedDate.setDate(selectedDate.getDate() + 1);
                    maxIterations--;
                }
            }
        }
    }

    return "No upcoming sessions found";
}