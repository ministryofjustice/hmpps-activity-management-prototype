const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

//redirect the root url to the start page
router.get("/", function (req, res) {
  // redirect to the select date and location page
  res.redirect("/" + req.protoUrl + "/select-date-and-location");
});

// print unlock list
router.get("/print-unlock-list", function (req, res) {
  let file = `public/downloads/Concept 2.pdf`;
  res.download(file);
});

// Function to get prisoners by houseblock
const getPrisonersByHouseblock = (prisoners, houseblock) => {
  return prisoners.filter(
    (prisoner) => prisoner.location.houseblock === houseblock
  );
};

function getActivitiesForPeriod(activities, period, dayOfWeek) {
  return activities.filter((activity) => {
    let schedule = activity.schedule.find((day) => day.day === dayOfWeek);
    return schedule && schedule[period.toLowerCase()];
  });
}

// Function to filter a list of prisoners who have an activity on a given date (e.g. '2023-02-21') and period (e.g. 'am' or 'pm')
const getPrisonersByDateAndPeriod = (
  prisoners,
  activities,
  date,
  period,
  type
) => {
  // get day of week
  const dayOfWeek = new Date(date).getDay();

  // get list of prisoners with activity ids
  const prisonersWithActivityIds = prisoners.filter((prisoner) => {
    if (Array.isArray(prisoner.activity)) {
      return prisoner.activity.length > 0;
    } else {
      return prisoner.activity;
    }
  });

  // filter prisoners by activity ids
  const filteredPrisoners = prisonersWithActivityIds.filter((prisoner) => {
    const activityIds = Array.isArray(prisoner.activity)
      ? prisoner.activity
      : [prisoner.activity];
    return activityIds.some((activityId) => {
      // get activity
      const activity = activities.find(
        (activity) => activity.id.toString() === activityId.toString()
      );

      // check if activity has schedule for given day
      if (activity) {
        const scheduleForDay = activity.schedule.find(
          (schedule) => schedule.day === dayOfWeek
        );
        if (scheduleForDay) {
          const timesForPeriod = scheduleForDay[period.toLowerCase()];
          if (timesForPeriod && timesForPeriod.length > 0) {
            return true;
          }
        }
      }

      return false;
    });
  });

  // filter prisoners by appointments
  const prisonersWithAppointments = prisoners.filter((prisoner) => {
    if (
      Array.isArray(prisoner.appointments) &&
      prisoner.appointments.length > 0
    ) {
      return prisoner.appointments.some((appointment) => {
        const appointmentDate = new Date(appointment.date).toDateString();
        const givenDate = new Date(date).toDateString();
        return appointmentDate === givenDate;
      });
    }
  });

  // return merged array of prisoners if type is unlock
  if (type === "unlock") {
    return [...filteredPrisoners, ...prisonersWithAppointments];
  }
  // return filtered prisoners if type is attendance
  if (type === "attendance") {
    return [...filteredPrisoners];
  }
};

// Function to add a new "events" array of objects to each filtered prisoner, containing each activity or appointment the prisoner has on the given date
const addEventsToPrisoners = (
  prisoners,
  activities,
  date,
  period,
  attendanceData
) => {
  return prisoners.map((prisoner) => {
    let activityIds = [];
    if (prisoner.activity) {
      activityIds = Array.isArray(prisoner.activity)
        ? prisoner.activity
        : [prisoner.activity];
    }
    let appointments = [];
    if (prisoner.appointments) {
      appointments = Array.isArray(prisoner.appointments)
        ? prisoner.appointments
        : [prisoner.appointments];
    }
    const activitiesForDate = activityIds
      .map((activityId) => {
        const activity = activities.find(
          (activity) => activity.id.toString() === activityId.toString()
        );
        const scheduleForDay = activity.schedule.find(
          (schedule) => schedule.day === new Date(date).getDay()
        );
        let isSessionCancelled = false;

        if (scheduleForDay) {
          if (scheduleForDay.cancelledSessions) {
            isSessionCancelled = true;
          }

          const timesForPeriod = scheduleForDay[period.toLowerCase()];

          if (timesForPeriod && timesForPeriod.length > 0) {
            return {
              id: activity.id,
              name: activity.name,
              location: activity.location,
              times: timesForPeriod[0],
              period: period,
              cancelled: isSessionCancelled,
              type: "activity",
            };
          }
        }

        return null;
      })
      .filter((activity) => activity !== null);

    const appointmentsForDate = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.date).toDateString();
      const givenDate = new Date(date).toDateString();
      appointment.type = "appointment";
      return appointmentDate === givenDate;
    });

    // add attendance data to matching events
    const events = [...activitiesForDate, ...appointmentsForDate];
    events.forEach((event) => {
      const eventAttendance =
        attendanceData &&
        attendanceData[event.id] &&
        attendanceData[event.id][date] &&
        attendanceData[event.id][date][event.period];
      if (eventAttendance) {
        Object.keys(eventAttendance).forEach((prisonerId) => {
          if (prisonerId === prisoner.id) {
            let prisonerAttendanceData = eventAttendance[prisonerId];
            event.attendance =
              prisonerAttendanceData[
                prisonerAttendanceData.length - 1
              ].attendance;
          }
        });
      }
    });

    return {
      ...prisoner,
      events,
    };
  });
};

function getWings(data) {
  let locations = {};

  if (data.hasOwnProperty("houseblocks")) {
    locations[data.houseblocks] = [];

    if (data.hasOwnProperty("wings")) {
      data.wings.forEach((string) => {
        const [houseblock, wing] = string.split("-");
        if (locations.hasOwnProperty(houseblock)) {
          locations[houseblock].push(wing);
        }
      });
    }
  }

  return locations;
}

// SELECT UNLOCK LOCATIONS
router.get("/select-date-and-location", function (req, res) {
  let date = new Date();
  let dateFormatted = date.toISOString().slice(0, 10);
  let dateIn60Days = DateTime.fromFormat(dateFormatted, "yyyy-MM-dd")
    .plus({
      days: 60,
    })
    .toFormat("yyyy-MM-dd");
  dateIn60Days = dateIn60Days.slice(0, 8) + "27";

  res.render(req.protoUrl + "/select-unlock-locations", {
    dateIn60Days,
  });
});
router.post("/select-date-and-location", function (req, res) {
  let date = req.session.data["date"];
  let period = req.session.data["period"].toUpperCase();
  let locations = getWings(req.session.data["selected-locations"]);
  let houseblock = Object.keys(locations)[0];

  if (date == "other-date") {
    if (
      req.session.data["other-date-year"] !== undefined &&
      req.session.data["other-date-month"] !== undefined &&
      req.session.data["other-date-day"] !== undefined
    ) {
      date = req.session.data[
        "date"
      ] = `${req.session.data["other-date-year"]}-${req.session.data["other-date-month"]}-${req.session.data["other-date-day"]}`;
      res.redirect("unlock-list/" + date + "/" + period + "/" + houseblock);
    } else {
      res.redirect("select-unlock-locations");
    }
  } else {
    res.redirect(date + "/" + period + "/" + houseblock);
  }
});

// unlock list
router.get(
  "/:selectedDate/:selectedPeriod/:selectedHouseblock",
  function (req, res) {
    let period = req.params.selectedPeriod;
    let date = req.params.selectedDate;
    let dayOfWeek = new Date(date).getDay();

    let activities = req.session.data["timetable-complete-1"]["activities"];
    let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
    let houseblock = req.params.selectedHouseblock;

    let attendanceData = req.session.data["attendance"];

    const prisonersByHouseblock = getPrisonersByHouseblock(
      prisoners,
      houseblock
    );
    const prisonersByDateAndPeriod = getPrisonersByDateAndPeriod(
      prisonersByHouseblock,
      activities,
      date,
      period,
      "unlock"
    );
    let prisonersWithEvents = addEventsToPrisoners(
      prisonersByDateAndPeriod,
      activities,
      date,
      period,
      attendanceData
    );

    let filteredActivities = getActivitiesForPeriod(
      activities,
      period,
      dayOfWeek
    );

    let relativeDate;
    let today = DateTime.local().startOf("day");
    let dateLuxon = DateTime.fromFormat(date, "yyyy-MM-dd").startOf("day");
    let diff = Math.abs(today.diff(dateLuxon, "days").days);
    if (diff <= 1) {
      relativeDate = dateLuxon.toRelativeCalendar();
    }

    // remove the confirmation notification on loading the page
    if (req.session.data["attendance-confirmation"] == "true") {
      delete req.session.data["attendance-confirmation"];
    }

    //landing filters
    if (
      req.session.data["filters"] &&
      req.session.data["filters"]["landings"]
    ) {
      let landings = req.session.data["filters"]["landings"];

      const removeLanding = req.query["remove-landing"];
      if (removeLanding) {
        landings = landings.filter((landing) => landing !== removeLanding);
        if (landings.length === 0) {
          delete req.session.data["filters"]["landings"];
        } else {
          req.session.data["filters"]["landings"] = landings;
        }
        delete req.query["remove-landing"];
      }

      if (landings !== "_unchecked" && landings.length > 0) {
        landings = landings.map((landing) => landing.toString());
        prisonersWithEvents = prisonersWithEvents.filter((prisoner) =>
          landings.includes(prisoner.location.landing.toString())
        );
      }
    }

    // create a list of unique sub-locations based on the location properties of each prisoner in prisonersWithEvents
    // residentialLocations should be an array of unique landing numbers, e.g. [1,2,3]
    let residentialLocations = [];
    prisonersWithEvents.forEach((prisoner) => {
      if (
        !residentialLocations.includes(prisoner.location.landing) &&
        prisoner.location.landing !== undefined
      ) {
        residentialLocations.push(prisoner.location.landing);
      }
    });

    res.render(req.protoUrl + "/unlock-list", {
      residentialLocations,
      prisonersWithEvents,
      date,
      relativeDate,
      period,
      houseblock,
      filteredActivities,
    });
  }
);

router.get("/download", function (req, res) {
  const file = `public/downloads/Unlock list concept.pdf`;
  res.download(file);
});

module.exports = router;
