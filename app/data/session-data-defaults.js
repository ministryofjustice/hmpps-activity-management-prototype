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
      "linkURL":"/v10/dps-home-2"
    },
    {
      "linkText":"Create and manage appointments",
      "descriptionText":"Add and edit appointments for individuals and groups of people.",
      "linkURL":"/v10/dps-home-2"
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
  'applications': require('./applications'),
  "times": "AM",
  "tier": "Tier 2",
  "provider": "Other",
  "selected-locations": {},
  "prison-name": "HMP Leeds",
  "chosen-date": "today",
  "date": "2023-01-02",
  "appointment-categories-1": require('./appointment-categories-1'),
  "prototype-versions": {
    'create-and-allocate': {
      'latest-version': 'version-16',
      'url': 'create/version-16'
    },
    'unlock-and-attend': {
      'latest-version': 'version-8',
      'url': '/unlock/version-8/whereabouts'
    },
    'appointments': {
      'latest-version': 'version-13',
      'url': '/appointments/version-13/dps-home'
    }
  },
  "areas-of-study": require('./areas-of-study'),
}
