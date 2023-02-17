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
      "linkText": "Manage unlock and movement",
      "descriptionText":"Create unlock and movement lists. Record unlock sickness, refusals and absences. ",
      "linkURL":""
    },
    {
      "linkText":"Manage activities",
      "descriptionText":"Create and manage activities. Log applications and allocate people to activities. Check and record attendance.",
      "linkURL":"/v9/dps-home-2"
    },
    {
      "linkText":"Create and manage appointments",
      "descriptionText":"Add and edit appointments for individuals and groups of people.",
      "linkURL":"/v9/dps-home-2"
    }]
  },
  "activity": "Workshop",
  'prisoners': require('./prisoners-list-1'),
  'activities': require('./activities-list-1'),
  'timetable': require('./timetable-1'),
  'activities-2': require('./activities-list-2'),
  'timetable-2': require('./timetable-2'),
  'prisoners-2': require('./prisoners-list-2'),
  'prisoners-3': require('./prisoners-list-3'),
  'timetable-complete-1': require('./timetable-complete-1'),
  'activity-locations-2': require('./activity-locations-list-2'),
  'timetable-3': require('./timetable-3'),
  'residential-locations': require('./residential-list-1'),
  'residential-locations-2': require('./residential-list-2'),
  'attendance-data-1': require('./attendance-data-1'),
  "times": "AM",
  "selected-locations": {},
  "prison-name": "HMP Leeds",
  "chosen-date": "today",
  "date": "2023-01-02",
  "prototype-versions": {
    'create-and-allocate': {
      'latest-version': 'v9',
      'url': '/v9/dps-home-2'
    },
    'unlock-and-attend': {
      'latest-version': 'version-5',
      'url': '/unlock/version-6/whereabouts'
    },
    'appointments': {
      'latest-version': 'version-3',
      'url': ''
    }
  }
}
