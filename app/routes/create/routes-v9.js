const crypto = require("crypto");
module.exports = function(router) {

	var version = '/v9';

	// app data
	const prisoners = require('../../data/prisoners-list-3')

	router.post(version + '/setup', function(req, res) {

			req.session.data.allocateEmployed = "Available"
			req.session.data.pageToShow =1
			res.redirect('dps-home?prototype-versions[create-and-allocate][url]=/'+version+'/dps-home-2')
	});

    //From activity dashboard, if schedule, delete (archive or suspend)
	router.post(version + '/create/activity-dashboard', function(req, res) {

		if (req.session.data.editDashboard == 'schedule') {
			res.redirect(version + '/create/schedule-name')
		} else if (req.session.data.editDashboard == 'archive') {
			res.redirect(version + '/create/activity-action?action=archiveActivity')
		} else if (req.session.data.editDashboard == 'suspend') {
			res.redirect(version + '/create/activity-action?action=suspendActivity')
		}
	});

	router.post(version + '/allocate/activity-dashboard-1', function(req, res) {
		{
			res.redirect(version + '/create/activity-type-select-with-category')
		}
	});

	router.post(version + '/allocate/activity-dashboard-1-filtered', function(req, res) {
		{
			res.redirect(version + '/create/activity-type-select-with-category')
		}
	});

	router.post(version + '/create/activity-type-select-with-category', function(req, res) {
		{
			res.redirect(version + '/create/activity-name')
		}
	});

	router.post(version + '/create/activity-name', function(req, res) {
		{
			res.redirect(version + '/create/activity-risk-assessment')
		}
	});

    // On activity-name-2 the continue creatong activity button is pressed.
    //router.post(version +'/create/activity-name-2-create', function(req, res) {
    //{
    //res.redirect(version +'/create/activity-risk-assessment')
    //}
    //});

	router.post(version + '/create/activity-risk-assessment', function(req, res) {
		{
			res.redirect(version + '/create/activity-payment-details')
		}
	});


    //OLD
    //router.post(version +'/create/activity-payment-details', function(req, res) {
    //	{
    //		res.redirect(version +'/create/activity-add-education')
    //	}
    //});


    // router.post(version + '/create/activity-payment-details', function(req, res) {
    //     {
    //         res.redirect(version + '/create/activity-payment-details-2')
    //     }
    // });

	router.get(version +'/create/activity-payment-details', function(req, res) {
		let payrateId = req.session.data['id']
		let payrateData;

		function getPayrateById(payrates, id) {
            // Iterate over the payrates object
			for (const level in payrates) {
                // Get the array of payrates for the current pay rate level
				const levelPayrates = payrates[level];
                // Iterate over the array of payrates
				for (const payrate of levelPayrates) {
                    // If the payrate has the specified ID, return it
					if (payrate.id === id) {
						return payrate;
					}
				}
			}
            // If no payrate with the specified ID was found, return null
			return null;
		}

        // check the payrates object exists and is an object
		if (req.session.data.payrates && typeof req.session.data.payrates === 'object') {
        	// update the payrateData variable
			payrateData = getPayrateById(req.session.data.payrates, payrateId)
		}

        // render the page and include the payrateData variable so we can access it
		res.render('../views/'+version+'/create/activity-payment-details', {payrateData})
	});

	router.post(version + '/create/activity-payment-details', function(req, res) {
        // Assign an empty object to req.session.data.payrates if it is null or undefined
		req.session.data.payrates = req.session.data.payrates ?? {};

        // Get the values of the paymentIncentiveName, paymentIncentiveAmount, and PayIncentiveLevel fields from the session data
		const paymentIncentiveName = req.session.data['paymentIncentiveName'];
		const paymentIncentiveAmount = req.session.data['paymentIncentiveAmount'];
		const payIncentiveLevel = req.session.data['PayIncentiveLevel'];

        // Get the ID for the payrate or generate a random one
		let payIncentiveId;
		if (req.session.data['id']) {
			payIncentiveId = req.session.data['id'];
		} else {
			payIncentiveId = crypto.randomBytes(4).toString("hex");
		}

        // Create the payrate data object
		const payrateData = {
			id: payIncentiveId,
			name: paymentIncentiveName,
			amount: paymentIncentiveAmount,
			'incentive-level': payIncentiveLevel
		};

		function updatePayrate(payrates, id, payrateData) {
            // remove payrates with matching id from all levels
			for (const level in payrates) {
				const levelPayrates = payrates[level];
				payrates[level] = levelPayrates.filter(payrate => payrate.id !== id);
			}

            // add payrate to the correct level
			if (Array.isArray(payrateData['incentive-level'])) {
				payrateData['incentive-level'].forEach(level => {
					if (!payrates[level]) {
						payrates[level] = [];
					}
					payrates[level].push(payrateData);
				});
			} else {
				if (!payrates[payrateData['incentive-level']]) {
					payrates[payrateData['incentive-level']] = [];
				}
				payrates[payrateData['incentive-level']].push(payrateData);
			}
			return payrateData;
		}

        // Update the payrate in the payrates object
		const updatedPayrate = updatePayrate(req.session.data.payrates, payIncentiveId, payrateData);

        // Redirect the user to the next page
		res.redirect(version + '/create/activity-check-your-answers-payment');
	});

	router.get(version +'/create/activity-payment-remove', function(req, res) {
		let payrateId = req.session.data['id']
		let payrateData;

		function getPayrateById(payrates, id) {
			for (const level in payrates) {
				const levelPayrates = payrates[level];
				for (const payrate of levelPayrates) {
					if (payrate.id === id) {
						return payrate;
					}
				}
			}
			return null;
		}

		if (req.session.data.payrates && typeof req.session.data.payrates === 'object') {
			payrateData = getPayrateById(req.session.data.payrates, payrateId)
		}

		res.render('../views/'+version+'/create/activity-payment-remove', {payrateData})
	});

	router.post(version + '/create/activity-payment-remove', function(req, res) {
		if(req.session.data['confirm-remove-payrate'] == 'yes'){
			let payrateId = req.session.data['id']
			let payrateLevel = req.session.data['incentive-level']
			let payrateData;

			function removePayrateById(payrates, id) {
            // Iterate over the payrates object
				for (const level in payrates) {
                // Get the array of payrates for the current pay rate level
					const levelPayrates = payrates[level];
                // Iterate over the array of payrates
					for (let i = 0; i < levelPayrates.length; i++) {
                    // If the payrate has the specified ID, remove it from the array
						if (levelPayrates[i].id === id) {
							levelPayrates.splice(i, 1);
							return true;
						}
					}
				}
            // If no payrate with the specified ID was found, return false
				return false;
			}

        // check the payrates object exists and is an object
			if (req.session.data.payrates && typeof req.session.data.payrates === 'object') {
            // update the payrateData variable
				if (removePayrateById(req.session.data.payrates, payrateId)) {
					payrateData = null;
				} else {
					payrateData = 'Payrate not found';
				}
			}

			req.session.data['show-delete-dialog'] = true
		}

        // Redirect the user to the next page
		res.redirect(version + '/create/activity-check-your-answers-payment');
	});

	router.get(version +'/create/activity-check-your-answers-payment', function(req, res) {
		if( req.session.data['id'] ){
			delete req.session.data['id']
		}

		// hide the dialog after first load
		if (req.session.data['show-delete-dialog']) {
			req.session.data['show-delete-dialog'] = false;
		}

		res.render('../views/'+version+'/create/activity-check-your-answers-payment')
	});

	router.post(version + '/create/activity-check-your-answers-payment', function(req, res) {
		res.redirect(version + '/create/activity-is-education-needed')
	});



	router.post(version + '/create/activity-is-education-needed', function(req, res) {

		if (req.session.data.EducationNeeded == 'yes') {
			res.redirect(version + '/create/activity-add-education-new')
		}
		else {
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});




	router.post(version + '/create/activity-add-education-new', function(req, res) {
		const educationLevel = req.session.data['educationChoice'];

        // Get the ID for the educationLevel or generate a random one
		let educationId;
		if (req.query.id) {
			educationId = req.query.id;
		} else {
			educationId = crypto.randomBytes(4).toString("hex");
		}

		let educationLevelData = {
			id: educationId,
			name: educationLevel
		};

        // Check if the educationLevelData already exists in the educationLevels array
		let educationLevels = req.session.data.educationLevels || [];
		let existingEducation = educationLevels.find(level => level.id === educationId);

		if (existingEducation) {
            // If educationLevelData already exists, update it
			existingEducation.name = educationLevelData.name;
		} else {
            // If educationLevelData doesn't exist, add it to the array
			educationLevels.push(educationLevelData);
		}

		req.session.data.educationLevels = educationLevels;

		res.redirect(version + '/create/activity-check-your-answers-education-new')
	});

	router.get(version +'/create/activity-education-level-remove', function(req, res) {
		let educationId = req.query.id
		let educationLevels = req.session.data.educationLevels;
		let educationLevel = educationLevels.find(level => level.id === educationId);

		res.render('../views/'+version+'/create/activity-education-level-remove', {educationLevel})
	});

	router.post(version + '/create/activity-education-level-remove', function(req, res) {
		if(req.session.data['confirm-remove-education-level'] == 'yes'){
			const educationId = req.query.id;
			let educationLevels = req.session.data.educationLevels;
			educationLevels = educationLevels.filter(function(obj) {
				return obj.id !== educationId;
			});
			req.session.data.educationLevels = educationLevels;
		}

        // Redirect the user to the next page
		res.redirect(version + '/create/activity-check-your-answers-education-new');
	});



	router.post(version + '/create/addEducation', function(req, res) {
		{
			res.redirect(version + '/create/activity-add-education-one-added')
		}
	});
	router.post(version + '/create/addEducation2', function(req, res) {
		{
			res.redirect(version + '/create/activity-add-education-two-added')
		}
	});

	router.post(version + '/create/activity-add-education', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/activity-add-education-one-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});
	router.post(version + '/create/activity-add-education-two-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});
	router.post(version + '/create/activity-add-education-three-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});


    //SCHEDULING//

	router.post(version + '/create/activity-name-2', function(req, res) {
		{
			res.redirect(version + '/create/schedule-name')
		}
	});

	router.post(version + '/create/schedule-name', function(req, res) {
		{
			res.redirect(version + '/create/activity-start-date')
		}
	});


	router.post(version + '/create/activity-start-date', function(req, res) {
		{
			//Change numerical month to short month name
			req.session.data.month = getMonthName(req.session.data.month)
			req.session.data.activityCreateScheduleStartDate = req.session.data.day + " " + req.session.data.month + " " + req.session.data.year
			res.redirect(version + '/create/activity-is-there-an-end-date')
		}
	});

	function getMonthName(monthNumber) {
  const date = new Date();
  date.setMonth(monthNumber - 1);
  return date.toLocaleString('en-US', { month: 'short' });
}


	router.post(version + '/create/activity-is-there-an-end-date', function(req, res) {

		if (req.session.data.ScheduleEndDate == 'yes') {

			res.redirect(version + '/create/activity-end-date')
		}
		else {
			res.redirect(version + '/create/activity-start-time')
		}
	});


	router.post(version + '/create/activity-end-date', function(req, res) {
		{
			//Change numerical month to short month name
			req.session.data.endMonth = getMonthName(req.session.data.endMonth)
			req.session.data.activityCreateScheduleEndDate = req.session.data.endDay + " " + req.session.data.endMonth + " " + req.session.data.endYear

			res.redirect(version + '/create/activity-start-time')
		}
	});


	router.post(version + '/create/activity-start-time', function(req, res) {
		{
			res.redirect(version + '/create/activity-location-dropdown')
		}
	});



    //If repeat
    //router.post(version +'/create/activity-start-time-repeat2', function(req, res) {
    //{
    //if (req.session.data.activityRecurSame == 'yes')
    //	{
    //		res.redirect(version +'/create/activity-repeat-check')
    //	}
    //	else {
    //		res.redirect(version +'/create/activity-repeat-check')
    //	}
    //}
    //});

    //router.post(version +'/create/activity-repeat-check', function(req, res) {
    //	{
    //		res.redirect(version +'/create/activity-location-dropdown')
    //	}
    //});

	router.post(version + '/create/activity-location-dropdown', function(req, res) {
		{
			res.redirect(version + '/create/activity-capacity')
		}
	});
	router.post(version + '/create/activity-capacity', function(req, res) {
		{
			res.redirect(version + '/create/schedule-check-your-answers')
		}
	});
	router.post(version + '/create/schedule-check-your-answers', function(req, res) {
		{
			req.session.data['edit'] = 'false'
			res.redirect(version + '/create/schedule-confirmation-created')
		}
	});




    ///////CREATE CHECK YOUR ANSWERS///////////////

	router.post(version + '/create/check/activity-type-select-with-category', function(req, res) {
		{
			if (req.session.data.temp !== req.session.data.category) {
				var changedCategory
				req.session.data.changedCategory = 'changed'
				res.redirect(version + '/create/activity-check-your-answers')

			}
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-name', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-capacity', function(req, res) {
		{
			res.redirect(version + '/create/schedule-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-start-time', function(req, res) {
		{
			res.redirect(version + '/create/schedule-check-your-answers')
		}
	});
	router.post(version + '/create/check/schedule-name', function(req, res) {
		{
			res.redirect(version + '/create/schedule-check-your-answers')
		}
	});


    //Not recurring
		router.post(version + '/create/check/activity-start-date', function(req, res) {
			{
				//Change numerical month to short month name
				req.session.data.Month = getMonthName(req.session.data.Month)
				req.session.data.activityCreateScheduleStartDate = req.session.data.Day + " " + req.session.data.Month + " " + req.session.data.Year

				res.redirect(version + '/create/schedule-check-your-answers')
			}
		});

	router.post(version + '/create/check/activity-end-date', function(req, res) {
		{
			//Change numerical month to short month name
			req.session.data.endMonth = getMonthName(req.session.data.endMonth)
			req.session.data.activityCreateScheduleEndDate = req.session.data.endDay + " " + req.session.data.endMonth + " " + req.session.data.endYear

			res.redirect(version + '/create/schedule-check-your-answers')
		}
	});



    //Recurring
	router.post(version + '/create/check/activity-which-days', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});


	router.post(version + '/create/check/activity-location-dashboard-1', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-location-dropdown', function(req, res) {
		{
			res.redirect(version + '/create/schedule-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-incentive-level', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-risk-assessment', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});
    //Add another submit button
	router.post(version + '/create/check/addAlert', function(req, res) {
		{
			res.redirect(version + '/create/check/activity-add-alerts-one-added')
		}
	});

	router.post(version + '/create/check/addAlert2', function(req, res) {
		{
			res.redirect(version + '/create/check/activity-add-alerts-two-added')
		}
	});

	router.post(version + '/create/check/activity-add-alerts-one-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-add-alerts-two-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-add-alerts', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-payment-details', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});
	router.post(version + '/create/check/addEducation', function(req, res) {
		{
			res.redirect(version + '/create/check/activity-add-education-one-added')
		}
	});
	router.post(version + '/create/check/addEducation2', function(req, res) {
		{
			res.redirect(version + '/create/check/activity-add-education-two-added')
		}
	});
	router.post(version + '/create/check/addEducation3', function(req, res) {
		{
			res.redirect(version + '/create/check/activity-add-education-three-added')
		}
	});

	router.post(version + '/create/check/activity-add-education', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-add-education-one-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});
	router.post(version + '/create/check/activity-add-education-two-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});
	router.post(version + '/create/check/activity-add-education-three-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/check/activity-add-education-three-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-check-your-answers')
		}
	});

	router.post(version + '/create/activity-check-your-answers', function(req, res) {
		if (req.session.data.returnToDashboard == 'false') {
			res.redirect(version + '/create/activity-confirmation-created')
		} else if (req.session.data.fromActivityDashboard == 'true') {
			res.redirect(version + '/create/activity-dashboard')
		} else {
			res.redirect(version + '/create/activity-confirmation-created')
		}
	});


    //EDIT current activity
	router.post(version + '/create/activity-check-your-answers-edit', function(req, res) {
		{
			res.redirect(version + '/create/activity-confirmation-edited')
		}
	});


	router.post(version + '/create/activity-confirmation-created', function(req, res) {
		if (req.session.data['edit'] == 'true') {
			res.redirect(version + '/create/schedule-check-your-answers')
		} else {
			res.redirect(version + '/create/schedule-name?edit=false')
		}
	});

    ///////END CREATE CHECK YOUR ANSWERS///////////////





    //OLD CREATE TIME FUNCTIONS

    //TIME
    //Start of recurring times / sessions
	router.post(version + '/create/addTime', function(req, res) {
		{
			res.redirect(version + '/create/activity-start-time-one-added')
		}
	});
	router.post(version + '/create/addTime2', function(req, res) {
		{
			res.redirect(version + '/create/activity-start-time-two-added')
		}
	});
	router.post(version + '/create/addTime3', function(req, res) {
		{
			res.redirect(version + '/create/activity-start-time-three-added')
		}
	});


    //if dashboard view clicked on setup page


	router.post(version + '/create/activity-start-time-one-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-location-dropdown')
		}
	});
	router.post(version + '/create/activity-start-time-two-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-location-dropdown')
		}
	});
	router.post(version + '/create/activity-start-time-three-added', function(req, res) {
		{
			res.redirect(version + '/create/activity-location-dropdown')
		}
	});

    ///////END CREATE//////////




    //////ALLOCATE////////

	router.post(version + '/allocate/searchAllocationDashboard-1', function(req, res) {
		{
			res.redirect(version + '/allocate/activity-dashboard-3-search')
		}
	});

	//router.get(version + '/allocate/activity-dashboard-3', function(req, res) {
	//	{
	//		if (req.session.data.currentActivityAllocateScheduleName !== data.activityAllocateScheduleName )
	//		{
	//			req.session.data.vacanciesCount = 10;
	//		}

	//		res.redirect(version + '/allocate/activity-dashboard-4-1')
	//	}
	//});

	router.post(version + '/allocate/searchAllocationDashboard', function(req, res) {
		{
			res.redirect(version + '/allocate/activity-dashboard-3-search')
		}
	});

	router.post(version + '/allocate/searchAllocationDashboard-1', function(req, res) {
		{
			res.redirect(version + '/allocate/activity-dashboard-3-search')
		}
	});

	router.post(version + '/allocate/clearSearchAllocate', function(req, res) {
		{
			res.redirect(version + '/allocate/activity-dashboard-3-search')
		}
	});

	router.post(version + '/allocate/activityConfirmedAllocation', function(req, res) {
		if (req.session.data.activityConfirmedAllocation == 'yes') {
			res.redirect(version + '/allocate/allocate-confirmation')
		} else {
			res.redirect(version + '/allocate/allocate-cancel')
		}
	});

	router.post(version + '/allocate/allocate-cancel', function(req, res) {
		if (req.session.data.allocateCancel == 'yes') {
			if (req.session.data.activityAllocateName == 'Gardening') {
				res.redirect(version + '/allocate/activity-dashboard-4-garden')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 1') {
				res.redirect(version + '/allocate/activity-dashboard-4-1')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 2') {
				res.redirect(version + '/allocate/activity-dashboard-4-2')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 3') {
				res.redirect(version + '/allocate/activity-dashboard-4-3')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 4') {
				res.redirect(version + '/allocate/activity-dashboard-4-4')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 5') {
				res.redirect(version + '/allocate/activity-dashboard-4-5')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 6') {
				res.redirect(version + '/allocate/activity-dashboard-4-6')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 7') {
				res.redirect(version + '/allocate/activity-dashboard-4-7')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 8') {
				res.redirect(version + '/allocate/activity-dashboard-4-8')
			} else {
				res.redirect(version + '/allocate/activity-dashboard-1')
			}
		} else {
			res.redirect(version + '/allocate/activity-dashboard-5-1')
		}
	});

	router.post(version + '/allocate/AllocateRemove', function(req, res) {
		{
			res.redirect(version + '/allocate/allocate-remove-offender')
		}
	});


    //Removal of offender ALREADY allocated to an activity
	router.post(version + '/allocate/allocate-remove-offender', function(req, res) {
		if (req.session.data.activityConfirmRemoval == 'yes') {
			if (req.session.data.RemoveOffenderName[0] == 'Lance Arm') {
				var LanceArm = 'NotAllocated'
				req.session.data.LanceArm = LanceArm
				res.redirect(version + '/allocate/activity-dashboard-4-1#allocated')
			} else {
				res.redirect(version + '/allocate/activity-dashboard-4-1#allocated')
			}
		}
	});

    //If cancel offender on the identify candidates route of allocation, not yet allocated
	router.post(version + '/allocate/allocate-cancel-offender', function(req, res) {
		if (req.session.data.cancelAllocationYesNo == 'yes') {
			res.redirect(version + '/allocate/activity-dashboard-4-1#allocate')
		} else {
			res.redirect(version + '/allocate/activity-dashboard-5-1')
		}
	});


    //Offender dashbaord allocations
		//Set the offender for allocate passed in on radio button on dashboard-4-1

	router.post(version + '/allocate/activity-dashboard-4-1', function(req, res) {

		if (req.session.data.currentActivityAllocateScheduleName !== req.session.data.activityAllocateScheduleName){

		req.session.data.offenderAllocatedStatusNeilRudge = 'false';
		req.session.data.offenderAllocatedStatusIvorNorisk = 'false';
		req.session.data.offenderAllocatedStatusLeeMilson = 'false';
		req.session.data.offenderAllocatedStatusLionelMesser = 'false';
		req.session.data.offenderAllocatedStatusNoffRens = 'false';
		req.session.data.offenderAllocatedStatusNeilRudge = 'false';

		req.session.data.offenderAllocatedStatusHenryTatton = 'false';
		req.session.data.offenderAllocatedStatusAlaricMesser = 'false';
		req.session.data.offenderAllocatedStatusEniolaAldebrandi = 'false';
		req.session.data.offenderAllocatedStatusBurcoCharves = 'false';
		req.session.data.offenderAllocatedStatusJairusCatalano = 'false';
		req.session.data.offenderAllocatedStatusAbdelGarcon = 'false';
		req.session.data.offenderAllocatedStatusAlmogTanzer = 'false';
		req.session.data.offenderAllocatedStatusErmisPiotrowski = 'false';
		req.session.data.offenderAllocatedStatusCerenWieck = 'false';
		req.session.data.offenderAllocatedStatusClaudWaller = 'false';
		//req.session.data.vacanciesCount = 5;
	}

		if (req.session.data.offenderAllocate=="Neil Rudge"){
			req.session.data.offenderIDAllocate = 'AA4309K';
			}
			else if (req.session.data.offenderAllocate=="Ivor Norisk"){
				req.session.data.offenderIDAllocate = 'BA3219B';
				}
			else if (req.session.data.offenderAllocate=="Lee Milson"){
				req.session.data.offenderIDAllocate = 'CV1291A';
				}
			else if (req.session.data.offenderAllocate=="Lionel Messer"){
				req.session.data.offenderIDAllocate = 'NH7239A';
				}
			else if (req.session.data.offenderAllocate=="Lionel Draganov"){
				req.session.data.offenderIDAllocate = 'NH7239A';
				}
			else if (req.session.data.offenderAllocate=="Noff Rens"){
				req.session.data.offenderIDAllocate = 'BN7622L';
				}
			else if (req.session.data.offenderAllocate=="Henry Tatton"){
					req.session.data.offenderIDAllocate = 'BN5297F';
					}
			else if (req.session.data.offenderAllocate=="Alaric Messer"){
				req.session.data.offenderIDAllocate = 'DE6192M';
				}
			else if (req.session.data.offenderAllocate=="Eniola Aldebrandi"){
				req.session.data.offenderIDAllocate = 'GK9675V';
				}
			else if (req.session.data.offenderAllocate=="Burco Charves"){
				req.session.data.offenderIDAllocate = 'AL7634M';
			}
			else if (req.session.data.offenderAllocate=="Jairus Catalano"){
				req.session.data.offenderIDAllocate = 'DY8443K';
				}
			else if (req.session.data.offenderAllocate=="Abdel Garcon"){
				req.session.data.offenderIDAllocate = 'ST9127U';
				}
			else if (req.session.data.offenderAllocate=="Almog Tanzer"){
				req.session.data.offenderIDAllocate = 'KR7121C';
				}
			else if (req.session.data.offenderAllocate=="Ermis Piotrowski"){
				req.session.data.offenderIDAllocate = 'BB1076W';
				}
			else if (req.session.data.offenderAllocate=="Ceren Wieck"){
				req.session.data.offenderIDAllocate = 'AB8540Z';
				}
		else {
			req.session.data.offenderAllocate="Neil Rudge";
			req.session.data.offenderIDAllocate = 'AA4309K';
					}
		{
				res.redirect(version + '/allocate/allocate-payment-details')
			}
	});

	router.post(version + '/allocate/activity-dashboard-5-1', function(req, res) {
		{
			res.redirect(version + '/allocate/allocate-payment-details')
		}
	});

	router.post(version + '/allocate/allocate-payment-details', function(req, res) {
		{
			res.redirect(version + '/allocate/allocate-check-answers')
		}
	});





//Allocate payments - chan ge current payment choices
//Get current ID
	router.get(version +'/allocate/allocate-payment-details-change', function(req, res) {
		let payrateId = req.session.data['id']
		let payrateData;

		function getPayrateById(payrates, id) {
					// Iterate over the payrates object
			for (const level in payrates) {
							// Get the array of payrates for the current pay rate level
				const levelPayrates = payrates[level];
							// Iterate over the array of payrates
				for (const payrate of levelPayrates) {
									// If the payrate has the specified ID, return it
					if (payrate.id === id) {
						return payrate;
					}
				}
			}
					// If no payrate with the specified ID was found, return null
			return null;
		}

			// check the payrates object exists and is an object
		if (req.session.data.payrates && typeof req.session.data.payrates === 'object') {
				// update the payrateData variable
			payrateData = getPayrateById(req.session.data.payrates, payrateId)
		}

			// render the page and include the payrateData variable so we can access it
		res.render('../views/'+version+'/allocate/allocate-payment-details-change', {payrateData})
	});




//When submitted
	router.post(version + '/allocate/allocate-payment-details-change', function(req, res) {
			// Assign an empty object to req.session.data.payrates if it is null or undefined
		req.session.data.payrates = req.session.data.payrates ?? {};

			// Get the values of the paymentIncentiveName, paymentIncentiveAmount, and PayIncentiveLevel fields from the session data
		const paymentIncentiveName = req.session.data['paymentIncentiveName'];
		const paymentIncentiveAmount = req.session.data['paymentIncentiveAmount'];
		const payIncentiveLevel = req.session.data['PayIncentiveLevel'];

			// Get the ID for the payrate or generate a random one
		let payIncentiveId;
		if (req.session.data['id']) {
			payIncentiveId = req.session.data['id'];
		} else {
			payIncentiveId = crypto.randomBytes(4).toString("hex");
		}

			// Create the payrate data object
		const payrateData = {
			id: payIncentiveId,
			name: paymentIncentiveName,
			amount: paymentIncentiveAmount,
			'incentive-level': payIncentiveLevel
		};

		function updatePayrate(payrates, id, payrateData) {
					// remove payrates with matching id from all levels
			for (const level in payrates) {
				const levelPayrates = payrates[level];
				payrates[level] = levelPayrates.filter(payrate => payrate.id !== id);
			}

					// add payrate to the correct level
			if (Array.isArray(payrateData['incentive-level'])) {
				payrateData['incentive-level'].forEach(level => {
					if (!payrates[level]) {
						payrates[level] = [];
					}
					payrates[level].push(payrateData);
				});
			} else {
				if (!payrates[payrateData['incentive-level']]) {
					payrates[payrateData['incentive-level']] = [];
				}
				payrates[payrateData['incentive-level']].push(payrateData);
			}
			return payrateData;
		}

			// Update the payrate in the payrates object
		const updatedPayrate = updatePayrate(req.session.data.payrates, payIncentiveId, payrateData);

			// Redirect the user to the next page
		res.redirect(version + '/allocate/allocate-check-your-answers-payment');
	});

	router.get(version +'/create/activity-payment-remove', function(req, res) {
		let payrateId = req.session.data['id']
		let payrateData;

		function getPayrateById(payrates, id) {
			for (const level in payrates) {
				const levelPayrates = payrates[level];
				for (const payrate of levelPayrates) {
					if (payrate.id === id) {
						return payrate;
					}
				}
			}
			return null;
		}

		if (req.session.data.payrates && typeof req.session.data.payrates === 'object') {
			payrateData = getPayrateById(req.session.data.payrates, payrateId)
		}

		res.render('../views/'+version+'/allocate/allocate-payment-remove', {payrateData})
	});

	router.post(version + '/allocate/allocate-payment-remove', function(req, res) {
		if(req.session.data['confirm-remove-payrate'] == 'yes'){
			let payrateId = req.session.data['id']
			let payrateLevel = req.session.data['incentive-level']
			let payrateData;

			function removePayrateById(payrates, id) {
					// Iterate over the payrates object
				for (const level in payrates) {
							// Get the array of payrates for the current pay rate level
					const levelPayrates = payrates[level];
							// Iterate over the array of payrates
					for (let i = 0; i < levelPayrates.length; i++) {
									// If the payrate has the specified ID, remove it from the array
						if (levelPayrates[i].id === id) {
							levelPayrates.splice(i, 1);
							return true;
						}
					}
				}
					// If no payrate with the specified ID was found, return false
				return false;
			}

			// check the payrates object exists and is an object
			if (req.session.data.payrates && typeof req.session.data.payrates === 'object') {
					// update the payrateData variable
				if (removePayrateById(req.session.data.payrates, payrateId)) {
					payrateData = null;
				} else {
					payrateData = 'Payrate not found';
				}
			}

			req.session.data['show-delete-dialog'] = true
		}

			// Redirect the user to the next page
		res.redirect(version + '/allocate/allocate-check-your-answers-payment');
	});

	router.get(version +'/allocate/allocate-check-your-answers-payment', function(req, res) {
		if( req.session.data['id'] ){
			delete req.session.data['id']
		}

	// hide the dialog after first load
		if (req.session.data['show-delete-dialog']) {
			req.session.data['show-delete-dialog'] = false;
		}

		res.render('../views/'+version+'/allocate/allocate-check-your-answers-payment')
	});

//Now allocate completed set status of prisoner to alllocate to activity
	router.post(version + '/allocate/allocate-check-answers', function(req, res) {

		if (req.session.data.offenderAllocate=="Neil Rudge"){
			req.session.data.offenderAllocatedStatusNeilRudge = 'true';
			}
			else if (req.session.data.offenderAllocate=="Ivor Norisk"){
				req.session.data.offenderAllocatedStatusIvorNorisk = 'true';
				}
			else if (req.session.data.offenderAllocate=="Lee Milson"){
				req.session.data.offenderAllocatedStatusLeeMilson = 'true';
				}
			else if (req.session.data.offenderAllocate=="Lionel Messer"){
				req.session.data.offenderAllocatedStatusLionelMesser = 'true';
				}
			else if (req.session.data.offenderAllocate=="Noff Rens"){
				req.session.data.offenderAllocatedStatusNoffRens = 'true';
				}
			else if (req.session.data.offenderAllocate=="Lionel Draganov"){
				req.session.data.offenderAllocatedStatusLionelDraganov = 'true';
				}
			else if (req.session.data.offenderAllocate=="Henry Tatton"){
					req.session.data.offenderAllocatedStatusHenryTatton = 'true';
					}
			else if (req.session.data.offenderAllocate=="Alaric Messer"){
				req.session.data.offenderAllocatedStatusAlaricMesser = 'true';
				}
			else if (req.session.data.offenderAllocate=="Eniola Aldebrandi"){
				req.session.data.offenderAllocatedStatusEniolaAldebrandi = 'true';
				}
			else if (req.session.data.offenderAllocate=="Burco Charves"){
				req.session.data.offenderAllocatedStatusBurcoCharves = 'true';
			}
			else if (req.session.data.offenderAllocate=="Jairus Catalano"){
				req.session.data.offenderAllocatedStatusJairusCatalano = 'true';
				}
			else if (req.session.data.offenderAllocate=="Abdel Garcon"){
				req.session.data.offenderAllocatedStatusAbdelGarcon = 'true';
				}
			else if (req.session.data.offenderAllocate=="Almog Tanzer"){
				req.session.data.offenderAllocatedStatusAlmogTanzer = 'true';
				}
			else if (req.session.data.offenderAllocate=="Ermis Piotrowski"){
				req.session.data.offenderAllocatedStatusErmisPiotrowski = 'true';
				}
			else if (req.session.data.offenderAllocate=="Ceren Wieck"){
				req.session.data.offenderAllocatedStatusCerenWieck = 'true';
				}
		else {
			req.session.data.offenderAllocate="Neil Rudge";
				req.session.data.offenderAllocatedStatusNeilRudge = 'true';
					}

			req.session.data.currentActivityAllocateScheduleName = req.session.data.activityAllocateScheduleName;

			if(req.session.data.vacanciesCount <=10){
				req.session.data.vacanciesCount= req.session.data.vacanciesCount - 1;
				req.session.data.allocatedCount ++;
			}
			else {req.session.data.vacanciesCount=10}

		{

			res.redirect(version + '/allocate/allocate-confirmation')
		}
	});


	router.get(version +'/allocate/poster', function(req, res) {
			res.redirect(version + '/allocate/activity-dashboard-4-1#allocate')
});



}
