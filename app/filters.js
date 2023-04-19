const { DateTime } = require("luxon");

module.exports = function (env) {
  /**
   * Instantiate object used to store the methods registered as a
   * 'filter' (of the same name) within nunjucks. You can override
   * gov.uk core filters by creating filter methods of the same name.
   * @type {Object}
   */
  var filters = {};

  /* ------------------------------------------------------------------
      add your methods to the filters obj below this comment block:
      @example:

      filters.sayHi = function(name) {
          return 'Hi ' + name + '!'
      }

      Which in your templates would be used as:

      {{ 'Paul' | sayHi }} => 'Hi Paul'

      Notice the first argument of your filters method is whatever
      gets 'piped' via '|' to the filter.

      Filters can take additional arguments, for example:

      filters.sayHi = function(name,tone) {
        return (tone == 'formal' ? 'Greetings' : 'Hi') + ' ' + name + '!'
      }

      Which would be used like this:

      {{ 'Joel' | sayHi('formal') }} => 'Greetings Joel!'
      {{ 'Gemma' | sayHi }} => 'Hi Gemma!'

      For more on filters and how to write them see the Nunjucks
      documentation.

    ------------------------------------------------------------------ */

  filters.currentDate = function (dateString, format) {
    return DateTime.local().setLocale("en-GB").toFormat(format);
  };

  filters.getActivity = function (activityId) {
    const activities = require("./data/activities-list-1");
    let match = activities.filter((activity) => activity.id == activityId);
    let activity = match[0];

    return activity;
  };

  filters.getPrisoner = function (prisonerId) {
    const prisoners = require("./data/prisoners-list-1");
    let match = prisoners.filter((prisoner) => prisoner._id == prisonerId);
    let prisoner = match[0];

    return prisoner;
  };

  filters.getPrisonerDetails = function (prisonerId) {
    const timetable = require("./data/timetable-complete-1");
    let match = timetable.prisoners.filter(
      (prisoner) => prisoner.id == prisonerId
    );
    let prisoner = match[0];

    return prisoner;
  };

  filters.getActivityDetails = function (activityId) {
    const timetable = require("./data/timetable-complete-1");
    let match = timetable.activities.filter(
      (activity) => activity.id == activityId
    );
    let activity = match[0];

    return activity;
  };

  filters.getActivityCategoryName = function (activityCategoryId) {
    const timetable = require("./data/timetable-complete-1");
    const activityCategories = timetable.categories;

    let categoryMatch = activityCategories.filter(
      (category) => category.id.toString() == activityCategoryId.toString()
    );
    let activityCategory = categoryMatch[0];

    return activityCategory.name;
  };

  filters.getCurrentlyAllocatedCount = function (prisonersData, activityId) {
    const timetable = require("./data/timetable-complete-1");
    const prisoners = prisonersData;
    const activities = timetable.activities;

    let activityMatch = activities.filter(
      (activity) => activity.id == activityId
    );
    let activity = activityMatch[0];

    activities.forEach((activity) => {
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
      activity.currentlyAllocatedCount = prisonerCount;
    });

    return activity.currentlyAllocatedCount;
  };

  // count applications for a given activity id
  filters.getApplicationCount = function (activityId) {
    const applications = require("./data/applications");
    let activityApplications = applications.filter(
      (application) => application.activity.toString() == activityId.toString()
    );

    return activityApplications.length;
  };

  // count applications for a given activity id and applications data
  filters.countApplications = function (applications, activityId) {
    let activityApplications = applications.filter(
      // exclude applications that have status rejected
      (application) =>
        application.activity.toString() == activityId.toString() &&
        application.status != "rejected"
    );

    return activityApplications.length;
  };

  filters.getOtherPrisonersCount = function (prisonersData, activityId) {
    let prisonersWithoutApplication = prisonersData.filter(
      (prisoner) =>
        !prisoner.activity ||
        prisoner.activity.length === 0 ||
        !prisoner.activity.includes(activityId)
    );

    return prisonersWithoutApplication.length;
  };

  filters.getHouseblock = function (houseblockId) {
    const locations = require("./data/residential-list-1");
    let match = locations.filter((location) => location.id == houseblockId);
    let houseblock = match[0];

    return houseblock;
  };

  filters.longDateFormat = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-M-d")
      .setLocale("en-GB")
      .toFormat("DDDD");
  };

  filters.shortDateFormat = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-M-d")
      .setLocale("en-GB")
      .toFormat("yyyy-MM-dd");
  };

  filters.convertShortDateToExampleDate = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-MM-dd")
      .setLocale("en-GB")
      .toFormat("d M yyyy");
  };

  filters.convertShortDateToExampleDate = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-MM-dd")
      .setLocale("en-GB")
      .toFormat("d M yyyy");
  };

  filters.convertShortDateToMediumDate = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-MM-dd")
      .setLocale("en-GB")
      .toFormat("d MMM yyyy");
  };

  filters.convertShortDateToLongDate = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-MM-dd")
      .setLocale("en-GB")
      .toFormat("d MMMM yyyy");
  };

  filters.convertShortDateToVeryLongDate = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-MM-dd")
      .setLocale("en-GB")
      .toFormat("DDDD");
  };

  filters.today = function (inputDate) {
    return DateTime.now().toFormat("yyyy-MM-dd");
  };

  filters.timestamp = function (date) {
    return new Date()
      .toLocaleTimeString("en-US", { hour12: false })
      .substr(0, 5);
  };

  filters.dayBefore = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-MM-dd")
      .minus({
        days: 1,
      })
      .setLocale("en-GB")
      .toFormat("yyyy-MM-dd");
  };

  filters.dayAfter = function (inputDate) {
    return DateTime.fromFormat(inputDate, "yyyy-MM-dd")
      .plus({
        days: 1,
      })
      .setLocale("en-GB")
      .toFormat("yyyy-MM-dd");
  };

  filters.formatDate = (object) => {
    if (object) {
      const month = object.month.padStart(2, "0");
      const day = object.day.padStart(2, "0");
      const date = `${object.year}-${month}-${day}`;

      return filters.date(date, "d MMMM yyyy");
    }
  };

  filters.date = (str, format = "yyyy-LL-dd") => {
    if (str) {
      const date = str === "now" ? DateTime.local() : str;

      const datetime = DateTime.fromISO(date, {
        locale: "en-GB",
      }).toFormat(format);

      return datetime;
    }
  };

  // filter to convert a number to n decimal places
  filters.decimalPlaces = (number, decimalPlaces) => {
    return number.toFixed(decimalPlaces);
  };

  filters.push = (array, item) => {
    array.push(item);
    return array;
  };

  /* ------------------------------------------------------------------
      keep the following line to return your filters to the app
    ------------------------------------------------------------------ */
  return filters;
};
