module.exports = function (router) {

var version = '1';


// Setup new environment
router.post('/sps/work-in-progress/setup', function (req, res) {
	var unread = 0
	var dateFormat = require('dateformat')
	dateFormat.masks.dateSent = 'd mmmm yyyy'
	dateFormat.masks.timeNow = 'h:MMtt'

	// set up secondMessageDate and secondMessageTime for the read message time and date
	req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
	req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')

	for (var i = 0; i < req.session.data.readMessages.length; i++) {
		if (req.session.data.readMessages[i] === false && req.session.data.show[i] === true) {
		  unread++
		}
	}
	req.session.data.numberUnreadMessages = unread
	console.log("Unread", unread)
	console.log("verified", req.session.data.verified)

	if (req.session.data.route === 'interrupt') {
		res.redirect('re-optin-how-to-get-tax-letters')
	}
	else {
		res.redirect('personal-account')
	}

})

// Setup new environment
router.post('/sps/work-in-progress/dashboard', function (req, res) {
	var unread = 0
	var dateFormat = require('dateformat')
	dateFormat.masks.dateSent = 'd mmmm yyyy'
	dateFormat.masks.timeNow = 'h:MMtt'

	// set up secondMessageDate and secondMessageTime for the read message time and date
	req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
	req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')

	for (var i = 0; i < req.session.data.readMessages.length; i++) {
		if (req.session.data.readMessages[i] === false) {
		  unread++
		}
	}
	req.session.data.numberUnreadMessages = unread
	console.log("Unread", unread)
	console.log("verified", req.session.data.verified)

	if (req.session.data.route === 'interrupt') {
		res.redirect('re-optin-how-to-get-tax-letters')
	}
	else {
		res.redirect('personal-account')
	}

})

// Change address re-routing
router.post('/sps/work-in-progress/change-address', (req, res) => {
	if (req.body['address-uk'] === 'yes') {
		res.redirect('change-address-uk')
	}
	else {
		req.session.data.postalAddress = 'France'
		res.redirect('change-address-abroad')
	}
  })

// Update GG number
router.post('/sps/work-in-progress/update-gg-number', (req, res) => {
  req.session.data.ggNumber = req.body['new-gg-number']
		res.redirect('gg-enter-access-code')
})


// Re-opt-in add email re-routing
router.post('/sps/work-in-progress/re-opt-in-email-address', (req, res) => {
	if (req.body['address-uk'] === 'yes') {
		res.redirect('change-address-uk')
	}
	else {
		req.session.data.postalAddress = 'France'
		res.redirect('change-address-abroad')
	}
  })



// Setting the variables while adding a new email address
router.get('/sps/work-in-progress/add-email/:id', function (req, res) {
  console.log('route: ', req.session.data.route)
  res.redirect('/sps/work-in-progress/add-email')
})

// Setting the variables while adding a new email address
router.get('/sps/work-in-progress/tax-letters', function (req, res) {
  res.redirect('/sps/work-in-progress/how-toget-tax-letters')
})

// Mark as verified [Create and send "Finish signing up to online messages" message]?
router.post('/sps/work-in-progress/settings/:id', function (req, res) {
  var index = req.params.id
  var show = req.session.data.show[index - 1]
  var read = req.session.data.readMessages[index - 1]
  if (read === true) {
    req.session.data.show[index - 1] = true
    req.session.data.readMessages[index - 1] = false
    req.session.data.subject[index - 1] = 'Finish signing up to online messages'
    req.session.data.status[index - 1] = 'incomplete'
    req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length
    console.log('read true: ', req.session.data.subject[index - 1])
  } else {
    req.session.data.show[index - 1] = true
    req.session.data.subject[index - 1] = 'Finish signing up to online messages'
    req.session.data.status[index - 1] = 'incomplete'
    req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === true).length
    console.log('read false: ', req.session.data.subject[index - 1])
  }

  if (req.session.data.route === 'settings') {
    res.redirect('/sps/work-in-progress/settings')
  } else {
    res.redirect('/sps/work-in-progress/personal-account')
  }
})

// Create and send "Finish signing up to online messages" message for system messages
router.post('/sps/work-in-progress/verify-system/:id', function (req, res) {
	if (req.session.data.route !== "interrupt") {
		var dateFormat = require('dateformat')
		dateFormat.masks.dateSent = 'd mmmm yyyy'
		dateFormat.masks.timeNow = 'h:MMtt'
		var index = req.params.id

		// find last index
		var i = req.session.data.id.length
		req.session.data.id[i] = i
		req.session.data.show[i] = true
		req.session.data.readMessages[i] = false
		req.session.data.dateSent[i] = dateFormat(Date(), 'timeNow')
		req.session.data.sender[i] = 'HMRC'

		// first system message - unverified (check firstMessageDate)
		// if (req.session.data.firstMessageDate === '3 April 2020') {
		req.session.data.status[i] = 'incomplete'
		req.session.data.subject[i] = 'Finish signing up to online messages'
		req.session.data.threadCount[i] = ''
		req.session.data.message[i] = 'message-new-email-unverified'
		req.session.data.tag[i] = 'incomplete'

		req.session.data.firstMessageDate = dateFormat(Date(), 'dateSent')
		req.session.data.firstMessageTime = dateFormat(Date(), 'timeNow')
		req.session.data.displayDate[i] = dateFormat(Date(), 'timeNow')
		req.session.data.dateSent[i] = dateFormat(Date(), 'dateSent')
		req.session.data.timeSent[i] = dateFormat(Date(), 'timeNow')
		// } else {
		// 	req.session.data.status[i] = 'done'
		// 	req.session.data.subject[i] = 'You now get tax letters and messages online'
		// 	req.session.data.threadCount[i] = '(2)'
		// 	req.session.data.timeSent[i] = dateFormat(Date(), 'timeNow')
		// 	req.session.data.dateSent[i] = dateFormat(Date(), 'dateSent')
		// 	req.session.data.displayDate[i] = dateFormat(Date(), 'timeNow')
		// 	req.session.data.message[i] = 'message-new-email-done'
		// 	req.session.data.tag[i] = 'done'
		// 	req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
		// 	req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')
		// 	req.session.data.displayDate[i] = dateFormat(Date(), 'timeNow')
		// 	req.session.data.dateSent[i] = dateFormat(Date(), 'dateSent')
		// 	req.session.data.timeSent[i] = dateFormat(Date(), 'timeNow')
		// }
		req.session.data.readMessages[i] = false
		req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length

		console.log('Date: ', dateFormat(Date(), 'dateSent'))
		console.log('Time: ', dateFormat(Date(), 'timeNow'))
		console.log("Number of unread messages: ", req.session.data.numberUnreadMessages)
		console.log("route", req.session.data.route)

		res.redirect('/sps/work-in-progress/confirmation-email-sent')
	}
	else {
		res.redirect('/sps/work-in-progress/personal-account')
	}
})

// Send "Finish signing up to online messages" email
router.post('/sps/work-in-progress/verify/:id', function (req, res) {
	var errors = []
	if (req.body['emailAddress'] === "") {
	  errors.push({
		text: 'Enter an email address in the correct format, like name@example.com',
		href: '#add-email'
	  })
	}
	if (errors.length !== 0) {
	  res.render('.//sps/work-in-progress/add-email', { errors: errors })
  } else {
    req.session.data.verified = 'No'
    req.session.data.howContacted = 'Online'
    res.redirect('/sps/work-in-progress/confirmation-email-sent')
	}

})

// Send "Finish signing up to online messages" email
router.post('/sps/work-in-progress/changeverify/:id', function (req, res) {
	var errors = []
	if (req.body['newEmailAddress'] === "") {
	  errors.push({
		text: 'Enter an email address in the correct format, like name@example.com',
		href: '#add-email'
	  })
	}
	if (errors.length !== 0) {
	  res.render('.//sps/work-in-progress/change-email', { errors: errors })
  } else {
    req.session.data.emailAddress = req.body['newEmailAddress']
    req.session.data.verified = 'No'
    req.session.data.howContacted = 'Online'
    res.redirect('/sps/work-in-progress/confirmation-email-sent')
	}

})

// Show and hide system messages with given id
router.get('/sps/work-in-progress/personal-details/:id', function (req, res) {
  var index = req.params.id
  var show = req.session.data.show[index - 1]
  var read = req.session.data.readMessages[index - 1]
  if (show === true) {
    req.session.data.show[index - 1] = false
    if (read === false) {
      req.session.data.readMessages[index - 1] = true
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length
    }
  } else {
    req.session.data.show[index - 1] = true
    if (read === true) {
      req.session.data.readMessages[index - 1] = false
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === true).length
    }
  }
  res.redirect('/sps/work-in-progress/personal-details')
})

// Verify magic link on settings for system messages
router.get('/sps/work-in-progress/link-settings-system/:id', function (req, res) {
	var dateFormat = require('dateformat')
	dateFormat.masks.dateSent = 'd mmmm yyyy'
	dateFormat.masks.timeNow = 'h:MMtt'
	var index = req.session.data.id.length
	var i = index - 1

	req.session.data.show[i] = true
	req.session.data.subject[i] = 'You now get tax letters and messages online'
	req.session.data.status[i] = 'done'
	req.session.data.threadCount[i] = '(2)'
	req.session.data.timeSent[i] = dateFormat(Date(), 'timeNow')
	req.session.data.dateSent[i] = dateFormat(Date(), 'dateSent')
	req.session.data.displayDate[i] = dateFormat(Date(), 'timeNow')
	req.session.data.message[i] = 'message-new-email-done'

	req.session.data.verified = 'Yes'
	req.session.data.howContacted = 'Online'

	req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
	req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')

	req.session.data.readMessages[i] = false
	req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length

	res.redirect('/sps/work-in-progress/settings')
  })

  // Verify magic link on settings for when there aren't system messages
  router.get('/sps/work-in-progress/link-settings/:id', function (req, res) {
    req.session.data.verified = 'Yes'
    req.session.data.howContacted = 'Online'
    var length = req.session.data.id.length
    i = length - 1
    // req.session.data.show[i] = true
    // req.session.data.readMessages[i] = false

    // req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length

    res.redirect('/sps/work-in-progress/settings')
    })

// Verify magic link on personal account for when there aren't system messages
router.get('/sps/work-in-progress/link-pta/:id', function (req, res) {
	req.session.data.verified = 'Yes'
	req.session.data.howContacted = 'Online'
	// var length = req.session.data.id.length
	// i = length - 1
	// req.session.data.show[i] = true
	// req.session.data.readMessages[i] = false

	// req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length

	res.redirect('/sps/work-in-progress/personal-account')
  })


// Temporary verify link on confirmation page without CTAs
router.get('/sps/work-in-progress/link-confirmation/:id', function (req, res) {
	req.session.data.verified = 'Yes'
	req.session.data.howContacted = 'Online'

	var length = req.session.data.id.length
	i = length - 1
	req.session.data.show[i] = true
	req.session.data.readMessages[i] = false

	req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length


	res.redirect('/sps/work-in-progress/confirmation-email-sent')
  })

// Temporary verify link on confirmation page without CTAs
// router.get('/sps/work-in-progress/confirmation-verify/:id', function (req, res) {
//   if (req.body['govuk-button'] === "verified") {
//     req.session.data.verified = 'Yes'
//     req.session.data.howContacted = 'Online'

//     var length = req.session.data.id.length
//     i = length - 1
//     req.session.data.show[i] = true
//     req.session.data.readMessages[i] = false

//     req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length
//   }

//   res.redirect('/sps/work-in-progress/settings')
//   })

// Verify magic link on settings for when there aren't system messages
router.get('/sps/work-in-progress/link-confirmation-normal/:id', function (req, res) {
	req.session.data.verified = 'Yes'
	req.session.data.howContacted = 'Online'

	var length = req.session.data.id.length
	i = length - 1
	req.session.data.show[i] = true
	req.session.data.readMessages[i] = false

	req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length


	res.redirect('/sps/work-in-progress/confirmation-email-sent')
  })




// Verify email address on how to verify
router.get('/sps/work-in-progress/link-verify/:id', function (req, res) {
  var index = req.params.id
  var show = req.session.data.show[index - 1]
  var read = req.session.data.readMessages[index - 1]

  if (req.session.data.emailAddress != 'alex@pyrotech.com') {
    req.session.data.route = 'messages'
  }

  req.session.data.subject[index - 1] = 'Fix your email address'
  if (show === true) {
    req.session.data.show[index - 1] = false
    if (read === false) {
      req.session.data.readMessages[index - 1] = true
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length
    }
  } else {
    req.session.data.show[index - 1] = true
    if (read === true) {
      req.session.data.readMessages[index - 1] = false
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === true).length
    }
  }
  res.redirect('/sps/work-in-progress/how-to-verify')
})

// Verify email address on verify journey
router.get('/sps/work-in-progress/link-verify-journey/:id', function (req, res) {
  var index = req.session.data.id.length

  var show = req.session.data.show[index - 1]
  var read = req.session.data.readMessages[index - 1]
  req.session.data.subject[index - 1] = 'Fix your email address'
  if (show === true) {
    req.session.data.show[index - 1] = false
    if (read === false) {
      req.session.data.readMessages[index - 1] = true
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length
    }
  } else {
    req.session.data.show[index - 1] = true
    if (read === true) {
      req.session.data.readMessages[index - 1] = false
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === true).length
    }
  }
  res.redirect('/sps/work-in-progress/verify')
})

// Verify email address on DONE link on verify journey
router.get('/sps/work-in-progress/button-verify-journey', function (req, res) {
  var dateFormat = require('dateformat')
  dateFormat.masks.dateSent = 'd mmmm yyyy'
  dateFormat.masks.timeNow = 'h:MMtt'
  var index = req.session.data.id.length
  var i = index - 1

  req.session.data.show[i] = true
  req.session.data.subject[i] = 'You now get tax letters and messages online'
  req.session.data.readMessages[i] = false
  req.session.data.status[i] = 'done'
  req.session.data.threadCount[i] = '(2)'
  req.session.data.timeSent[i] = dateFormat(Date(), 'timeNow')
  req.session.data.dateSent[i] = dateFormat(Date(), 'dateSent')
  req.session.data.displayDate[i] = dateFormat(Date(), 'timeNow')
  req.session.data.message[i] = 'message-new-email-done'

  req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
  req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')

  req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length

  res.redirect('/sps/work-in-progress/message-new-email-unverified')
})

// Verify email address on CONTINUE button on verify journey
router.get('/sps/work-in-progress/button-set-incomplete-journey', function (req, res) {
  var dateFormat = require('dateformat')
  dateFormat.masks.dateSent = 'd mmmm yyyy'
  dateFormat.masks.timeNow = 'h:MMtt'
  var index = req.session.data.id.length
  var i = index - 1

  req.session.data.show[i] = true
  req.session.data.subject[i] = 'Finish signing up to online messages'
  req.session.data.readMessages[i] = false
  req.session.data.status[i] = 'incomplete'
  req.session.data.threadCount[i] = '(3)'
  req.session.data.timeSent[i] = dateFormat(Date(), 'timeNow')
  req.session.data.dateSent[i] = dateFormat(Date(), 'dateSent')
  req.session.data.displayDate[i] = dateFormat(Date(), 'timeNow')
  req.session.data.message[i] = 'message-unverified-3'

  req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
  req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')

  req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length

  res.redirect('/sps/work-in-progress/personal-account')
})

// Verify email address on verify message
router.get('/sps/work-in-progress/link-verify-message/:id', function (req, res) {
  var index = req.params.id
  var show = req.session.data.show[index - 1]
  var read = req.session.data.readMessages[index - 1]
  req.session.data.subject[index - 1] = 'Fix your email address'
  if (show === true) {
    req.session.data.show[index - 1] = false
    if (read === false) {
      req.session.data.readMessages[index - 1] = true
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length
    }
  } else {
    req.session.data.show[index - 1] = true
    if (read === true) {
      req.session.data.readMessages[index - 1] = false
      req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === true).length
    }
  }
  res.redirect('/sps/work-in-progress/message-unverified')
})

// Hide or show new message regarding bounce
router.get('/sps/work-in-progress/link/:id', function (req, res) {
  var dateFormat = require('dateformat')
  dateFormat.masks.dateSent = 'd mmmm yyyy'
  dateFormat.masks.timeNow = 'h:MMtt'
  var index = req.session.data.id.length
  var i = index - 1

  req.session.data.show[i] = true
  req.session.data.subject[i] = 'You now get tax letters and messages online'
  req.session.data.readMessages[i] = false
  req.session.data.status[i] = 'done'
  req.session.data.threadCount[i] = '(2)'
  req.session.data.timeSent[i] = dateFormat(Date(), 'timeNow')
  req.session.data.dateSent[i] = dateFormat(Date(), 'dateSent')
  req.session.data.displayDate[i] = dateFormat(Date(), 'timeNow')
  req.session.data.message[i] = 'message-new-email-done'

  req.session.data.verified = 'Yes'
  req.session.data.howContacted = 'Online'

  req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
  req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')

  req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length

  res.redirect('/sps/work-in-progress/messages')
})

// Route to return all messages with a given id
router.get('/sps/work-in-progress/message/:id', function (req, res) {
  var index = req.params.id
  var message = req.session.data.message[index - 1]
  var dateFormat = require('dateformat')
  dateFormat.masks.dateSent = 'd mmmm yyyy'
  dateFormat.masks.timeNow = 'h:MMtt'


  // set up secondMessageDate and secondMessageTime for the read message time and date
  req.session.data.secondMessageDate = dateFormat(Date(), 'dateSent')
  req.session.data.secondMessageTime = dateFormat(Date(), 'timeNow')

  req.session.data.readMessages[index - 1] = true
  req.session.data.numberUnreadMessages = _.filter(req.session.data.readMessages, (value) => value === false).length
  // if (req.session.data.subject[index-1] === 'Finish signing up to online messages') {
  // 	res.redirect('/sps/work-in-progress/message-unverified')
  // }
  // else {
  res.redirect('/sps/work-in-progress/' + message)
  // }
})

router.post('/sps/work-in-progress/how-to-verify', function(req, res) {
  console.log("route", req.session.data.route)
	if (req.body['verifyOrChange'] === 'verify') {
		res.redirect('/sps/work-in-progress/confirmation-email-sent')
	} else {
      if (req.session.data.route === 'external' || req.session.data.route === 'current-bouncing' || req.session.data.route === 'current-unverified') {
        res.redirect('/sps/work-in-progress/how-to-verify')
      }
      else {
      req.session.data.route = "settings"
      res.redirect('/sps/work-in-progress/change-email')
    }
	}
})

// Error messages on how-to-get-tax-letters
router.post('/sps/work-in-progress/how-to-get-tax-letters', (req, res) => {
	var errors = []
	if (req.body['howContacted'] === undefined) {
	  errors.push({
		text: 'Select how you want to get your tax letters',
		href: '#how-to-get-tax-letters'
	  })
	}
	if (errors.length === 0) {
	  if (req.body['howContacted'] === 'Online') {
		res.redirect('/sps/work-in-progress/add-email')
	  }
    else {
        if (req.session.data.route === 'external') {
          res.redirect('/sps/work-in-progress/confirmation-post-alternative')
        }
        else {
        res.redirect('/sps/work-in-progress/confirmation-post')
      }
	  }
	} else {
	  res.render('.//sps/work-in-progress/how-toget-tax-letters', { errors: errors })
	}
  })

// Re-opt-in choice between online and post
router.post('/sps/work-in-progress/re-optin-how', (req, res) => {
  var errors = []
	if (req.body['howContacted'] === undefined) {
	  errors.push({
		text: 'Select how you want to get your tax letters',
		href: '#re-optin-how-to-get-tax-letters'
	  })
	}
	if (errors.length === 0) {
    if (req.body['howContacted'] === 'Online') {
      if (req.session.data.route === 'external') {
        res.redirect('/sps/work-in-progress/add-email')
      }
      else {
        res.redirect('/sps/work-in-progress/re-optin-add-email')
      }
    }
    else {
      if (req.session.data.route === 'external') {
        res.redirect('/sps/work-in-progress/confirmation-post-alternative')
      }
      else {
        res.redirect('/sps/work-in-progress/confirmation-post')
      }
    }
  }
    else {
	  res.render('.//sps/work-in-progress/re-optin-how-to-get-tax-letters', { errors: errors })
	}
})

// Re-opt-in choice between existing or new email address
// router.post('/sps/work-in-progress/re-optin-how', (req, res) => {
//   var errors = []
// 	if (req.body['contact'] === undefined && req.body['email-address'] === '') {
// 	  errors.push({
// 		text: 'Select how you want to get your tax letters',
// 		href: '#re-optin-add-email'
// 	  })
// 	}
// 	if (errors.length === 0) {
//     if (req.body['howContacted'] === 'Online') {
//       res.redirect('/sps/work-in-progress/re-optin-add-email')
//       }
//       else {
//       res.redirect('/sps/work-in-progress/confirmation-post')
//       }
//     }
//     else {
// 	  res.render('.//sps/work-in-progress/re-optin-add-email', { errors: errors })
// 	}
// })

// Re-opt-in choice between existing or new email address
router.post('/sps/work-in-progress/re-optin-email', (req, res) => {
    // req.session.data.route = "interrupt"
    req.session.data.bouncing = "No"
    console.log("route", req.session.data.route)
    if (req.body['contact'] === 'existing-email-address') {
      req.session.data.verified = "Yes"
      if (req.session.data.route === 'external' || req.session.data.route === 'external8') {
        res.redirect('/sps/work-in-progress/external-exit')
      }
      else {
        res.redirect('/sps/work-in-progress/personal-account')
      }
      } else {
      req.session.data.emailAddress = req.body['email-address']
      req.session.data.verified = "No"
      res.redirect('/sps/work-in-progress/confirmation-email-sent')
    }
})

// Re-opt-in choice between existing or new email address
// router.post('/sps/work-in-progress/re-optin-email', (req, res) => {
//   var errors = []
// 	if (req.body['contact'] === undefined) {
// 	  errors.push({
// 		text: 'Select which email address to use',
// 		href: '#re-optin-add-email'
// 	  })
// 	}
//   else if (req.body['email-address'] == '') {
// 	  errors.push({
//       text: 'Enter an email address in the correct format, like name@example.com',
//       href: '#re-optin-add-email'
//       })
//   }

// 	if (errors.length === 0) {
//     req.session.data.route = "interrupt"
//     if (req.body['contact'] === 'existing-email-address') {
//       req.session.data.verified = "Yes"
//       res.redirect('/sps/work-in-progress/personal-account')
//       } else {
//       req.session.data.emailAddress = req.body['email-address']
//       req.session.data.verified = "No"
//       res.redirect('/sps/work-in-progress/confirmation-email-sent')
//     }
// 	} else {
// 	  res.render('.//sps/work-in-progress/re-optin-add-email', { errors: errors })
// 	}
// })

// // Re-opt-in choice between existing or new email address
// router.post('/sps/work-in-progress/re-optin-how', (req, res) => {
// 	if (req.body['howContacted'] === 'Online') {
// 		res.redirect('/sps/work-in-progress/re-optin-add-email')
// 		} else {
// 		res.redirect('/sps/work-in-progress/confirmation-post')
// 	}
// })

router.get('/sps/work-in-progress/how-to-get-tax-letters', (req, res) => {
  console.log('Session data', req.session)
})

router.post('/sps/work-in-progress/opt-out-options', function (req, res) {
  if (req.body['choice-button'] == 'post') {
    req.session.data.howContacted = 'Post'
  }
  else {
    req.session.data.howContacted = 'Online'
    req.session.data.verified = 'Yes'
  }
  res.redirect('/sps/work-in-progress/settings')

})
}
