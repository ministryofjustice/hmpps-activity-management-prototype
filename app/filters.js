const {
    DateTime
} = require('luxon')

module.exports = function(env) {
    /**
     * Instantiate object used to store the methods registered as a
     * 'filter' (of the same name) within nunjucks. You can override
     * gov.uk core filters by creating filter methods of the same name.
     * @type {Object}
     */
    var filters = {}

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


    filters.currentDate = function(dateString, format) {
        return DateTime.local().setLocale('en-GB').toFormat(format);
    }

    filters.getActivity = function(activityId) {
        const activities = require('./data/activities-list-1')
        let match = activities.filter(activity => activity.id == activityId);
        let activity = match[0]

        return activity
    }

    filters.getPrisoner = function(prisonerId) {
        const prisoners = require('./data/prisoners-list-1')
        let match = prisoners.filter(prisoner => prisoner._id == prisonerId);
        let prisoner = match[0]

        return prisoner
    }

    filters.getHouseblock = function(houseblockId) {
        const locations = require('./data/residential-list-1')
        let match = locations.filter(location => location.id == houseblockId);
        let houseblock = match[0]

        return houseblock
    }

    filters.longDateFormat = function(inputDate) {
        return DateTime.fromFormat(inputDate, "yyyy-M-d").setLocale('en-GB').toFormat("DDDD")
    }

    filters.shortDateFormat = function(inputDate) {
        return DateTime.fromFormat(inputDate, "yyyy-M-d").setLocale('en-GB').toFormat("yyyy-MM-dd")
    }

    filters.convertShortDateToLongDate = function(inputDate) {
        return DateTime.fromFormat(inputDate, "yyyy-MM-dd").setLocale('en-GB').toFormat("d MMMM yyyy")
    }

    filters.convertShortDateToVeryLongDate = function(inputDate) {
        return DateTime.fromFormat(inputDate, "yyyy-MM-dd").setLocale('en-GB').toFormat("DDDD")
    }

    filters.today = function(inputDate) {
        return DateTime.now().toFormat("yyyy-MM-dd")
    }

    filters.dayBefore = function(inputDate) {
        return DateTime.fromFormat(inputDate, "yyyy-MM-dd").minus({
            days: 1
        }).setLocale('en-GB').toFormat("yyyy-MM-dd")
    }

    filters.dayAfter = function(inputDate) {
        return DateTime.fromFormat(inputDate, "yyyy-MM-dd").plus({
            days: 1
        }).setLocale('en-GB').toFormat("yyyy-MM-dd")
    }

    filters.formatDate = object => {
        if (object) {
            const month = object.month.padStart(2, '0')
            const day = object.day.padStart(2, '0')
            const date = `${object.year}-${month}-${day}`

            return filters.date(date, 'd MMMM yyyy')
        }
    }

    filters.date = (str, format = 'yyyy-LL-dd') => {
        if (str) {
            const date = (str === 'now') ? DateTime.local() : str

            const datetime = DateTime.fromISO(date, {
                locale: 'en-GB'
            }).toFormat(format)

            return datetime
        }
    }

    filters.push = (array, item) => {
        array.push(item)
        return array
    }

    /* ------------------------------------------------------------------
      keep the following line to return your filters to the app
    ------------------------------------------------------------------ */
    return filters
}