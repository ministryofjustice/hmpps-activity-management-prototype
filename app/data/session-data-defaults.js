/*

Provide default values for user session data. These are automatically added
via the `autoStoreData` middleware. Values will only be added to the
session if a value doesn't already exist. This may be useful for testing
journeys where users are returning or logging in to an existing application.

============================================================================

Example usage:

"full-name": "Sarah Philips",

"options-chosen": [ "foo", "bar" ]

============================================================================

*/

module.exports = {

  // Insert values here
  "config": {
    "record-attendance-pattern": "single-button",
    "attendance-list-layout": "toolbar",
    "attend-pattern": "separate",
    "select-activity-pattern": "select-date-table",
    "navigation-tiles": [{
      "linkText": "Manage prisoner whereabouts",
      "descriptionText":"View unlock lists, all appointments and COVID units, manage attendance and add bulk appointments.",
      "linkURL":"/unlock/version-3/whereabouts"
    },
    {
      "linkText":"Manage activities and schedules",
      "descriptionText":"Create and manage activities and schedules. Allocate people in prison to activities.",
      "linkURL":"/v6/create/activity-type-select-with-category"
    }]
  },
  "activity": "Workshop",
  'prisoners': require('./prisoners-list-1'),
  'activities': require('./activities-list-1'),
  'residential-locations': require('./residential-list-1'),
  "times": "AM",
  "selected-locations": {},
  "prison-name": "HMP Leeds",
}
