module.exports = function (router) {

var version = '/v7';

router.post(version +'/setup', function(req, res) {
			if (req.session.data.setupTaskType == 'allocation'){
					//Allocate an activity
					res.redirect(version +'/allocate/activity-dashboard-1')
				}

				else if (req.session.data.setupTaskType == 'creation'){
						//Create an activity

						if (req.session.data.setupCategories == 'yes'){
							res.redirect(version +'/create/activity-type-select-with-category')
						}
							else {
							res.redirect(version +'/create/activity-type-select-with-category')
							}
						}
			else if  (req.session.data.setupTaskType == 'activityDashboard'){
				res.redirect(version +'/create/activity-dashboard')
			}
		else {
			//Schedule an activity
			res.redirect(version +'/create/activity-start-date')
		}
	});

	router.post(version +'/create/activity-dashboard', function(req, res) {
		{
			res.redirect(version +'/create/activity-start-date')
		}
	});

	router.post(version +'/allocate/activity-dashboard-1', function(req, res) {
		{
			res.redirect(version +'/create/activity-type-select-with-category')
		}
	});

	router.post(version +'/allocate/activity-dashboard-1-filtered', function(req, res) {
		{
			res.redirect(version +'/create/activity-type-select-with-category')
		}
	});

router.post(version +'/create/activity-type-select-with-category', function(req, res) {
	{
		res.redirect(version +'/create/activity-name')
	}
});

router.post(version +'/create/activity-name', function(req, res) {
	{
		res.redirect(version +'/create/activity-risk-assessment')
	}
});

// On activity-name-2 the continue creatong activity button is pressed.
//router.post(version +'/create/activity-name-2-create', function(req, res) {
	//{
		//res.redirect(version +'/create/activity-risk-assessment')
	//}
//});

router.post(version +'/create/activity-risk-assessment', function(req, res) {
	{
		res.redirect(version +'/create/activity-incentive-level')
	}
});

	router.post(version +'/create/activity-incentive-level', function(req, res) {
		{
			res.redirect(version +'/create/activity-payment-details')
		}
	});


	router.post(version +'/create/activity-payment-details', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-education')
		}
	});
	router.post(version +'/create/addEducation', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-education-one-added')
		}
	});
	router.post(version +'/create/addEducation2', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-education-two-added')
		}
	});
	router.post(version +'/create/addEducation3', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-education-three-added')
		}
	});

	router.post(version +'/create/activity-add-education', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-alerts')
		}
	});

	router.post(version +'/create/activity-add-education-one-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-alerts')
		}
	});
	router.post(version +'/create/activity-add-education-two-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-alerts')
		}
	});
	router.post(version +'/create/activity-add-education-three-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-alerts')
		}
	});

	router.post(version +'/create/activity-add-alerts', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

//SCHEDULING//

router.post(version +'/create/activity-name-2', function(req, res) {
	{
		res.redirect(version +'/create/activity-start-date')
	}
});
router.post(version +'/create/activity-start-date', function(req, res) {
	{
		res.redirect(version +'/create/activity-start-time')
	}
});
router.post(version +'/create/activity-start-time', function(req, res) {
	{
		res.redirect(version +'/create/activity-start-time-repeat')
	}
});

//If 'will this schedule repeat is YES'
router.post(version +'/create/activity-start-time-repeat', function(req, res) {
	{
		if (req.session.data.activityWillItRecur == 'yes')
		{
			res.redirect(version +'/create/activity-location-dropdown')
		}
		else {
			res.redirect(version +'/create/activity-location-dropdown')
		}
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

router.post(version +'/create/activity-location-dropdown', function(req, res) {
	{
		res.redirect(version +'/create/activity-capacity')
	}
});
router.post(version +'/create/activity-capacity', function(req, res) {
	{
		res.redirect(version +'/create/schedule-check-your-answers')
	}
});
router.post(version +'/create/schedule-check-your-answers', function(req, res) {
	{
		req.session.data['edit'] = 'false'
		res.redirect(version +'/create/schedule-confirmation-created')
	}
});




///////CREATE CHECK YOUR ANSWERS///////////////

router.post(version +'/create/check/activity-type-select-with-category', function(req, res) {
	{
		if (req.session.data.temp !== req.session.data.category){
			var changedCategory
			req.session.data.changedCategory='changed'
			res.redirect(version +'/create/activity-check-your-answers')

		}
		res.redirect(version +'/create/activity-check-your-answers')
	}
});

router.post(version +'/create/check/activity-name', function(req, res) {
	{
		res.redirect(version +'/create/activity-check-your-answers')
	}
});

router.post(version +'/create/check/activity-capacity', function(req, res) {
	{
		res.redirect(version +'/create/schedule-check-your-answers')
	}
});

router.post(version +'/create/check/activity-will-it-recur', function(req, res) {
	if (req.session.data.activityWillItRecur == 'yes')
	{
		res.redirect(version +'/create/check/activity-add-recurrence')
	}
	else {
		res.redirect(version +'/create/activity-start-date')
	}
});


router.post(version +'/create/check/activity-start-time', function(req, res) {
	{
		res.redirect(version +'/create/schedule-check-your-answers')
	}
});



		//Not recurring
		router.post(version +'/create/check/activity-start-date', function(req, res) {
			{
				res.redirect(version +'/create/schedule-check-your-answers')
			}
		});

		//Recurring
		router.post(version +'/create/check/activity-which-days', function(req, res) {
			{
				res.redirect(version +'/create/activity-check-your-answers')
			}
		});


	router.post(version +'/create/check/activity-location-dashboard-1', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-location-dropdown', function(req, res) {
		{
			res.redirect(version +'/create/schedule-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-incentive-level', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-risk-assessment', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});
	//Add another submit button
	router.post(version +'/create/check/addAlert', function(req, res) {
		{
			res.redirect(version +'/create/check/activity-add-alerts-one-added')
		}
	});

	router.post(version +'/create/check/addAlert2', function(req, res) {
		{
			res.redirect(version +'/create/check/activity-add-alerts-two-added')
		}
	});

	router.post(version +'/create/check/activity-add-alerts-one-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-add-alerts-two-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-add-alerts', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-payment-details', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});
	router.post(version +'/create/check/addEducation', function(req, res) {
		{
			res.redirect(version +'/create/check/activity-add-education-one-added')
		}
	});
	router.post(version +'/create/check/addEducation2', function(req, res) {
		{
			res.redirect(version +'/create/check/activity-add-education-two-added')
		}
	});
	router.post(version +'/create/check/addEducation3', function(req, res) {
		{
			res.redirect(version +'/create/check/activity-add-education-three-added')
		}
	});

	router.post(version +'/create/check/activity-add-education', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-add-education-one-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});
	router.post(version +'/create/check/activity-add-education-two-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});
	router.post(version +'/create/check/activity-add-education-three-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/check/activity-add-education-three-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/activity-check-your-answers', function(req, res) {
			if (req.session.data.returnToDashboard=='false'){
				res.redirect(version +'/create/activity-confirmation-created')
			}
			else if (req.session.data.fromActivityDashboard=='true'){
					res.redirect(version +'/create/activity-dashboard')
			}
			else {
				res.redirect(version +'/create/activity-confirmation-created')
			}
	});


//EDIT current activity
	router.post(version +'/create/activity-check-your-answers-edit', function(req, res) {
		{
			res.redirect(version +'/create/activity-confirmation-edited')
		}
	});


	router.post(version +'/create/activity-confirmation-created', function(req, res) {
		if (req.session.data['edit'] == 'true')
		{
			res.redirect(version +'/create/schedule-check-your-answers')
		}
		else {
			res.redirect(version +'/create/activity-start-date?edit=false')
		}
	});

///////END CREATE CHECK YOUR ANSWERS///////////////





//OLD CREATE TIME FUNCTIONS

//TIME
	//Start of recurring times / sessions
	router.post(version +'/create/addTime', function(req, res) {
		{
			res.redirect(version +'/create/activity-start-time-one-added')
		}
	});
	router.post(version +'/create/addTime2', function(req, res) {
		{
			res.redirect(version +'/create/activity-start-time-two-added')
		}
	});
	router.post(version +'/create/addTime3', function(req, res) {
		{
			res.redirect(version +'/create/activity-start-time-three-added')
		}
	});


//if dashboard view clicked on setup page


	router.post(version +'/create/activity-start-time-one-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-location-dropdown')
		}
	});
	router.post(version +'/create/activity-start-time-two-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-location-dropdown')
		}
	});
	router.post(version +'/create/activity-start-time-three-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-location-dropdown')
		}
	});

///////END CREATE//////////




//////ALLOCATE////////

router.post(version +'/allocate/searchAllocationDashboard-1', function(req, res) {
	{
		res.redirect(version +'/allocate/activity-dashboard-3-search')
	}
});

router.post(version +'/allocate/searchAllocationDashboard', function(req, res) {
	{
		res.redirect(version +'/allocate/activity-dashboard-3-search')
	}
});

router.post(version +'/allocate/searchAllocationDashboard-1', function(req, res) {
	{
		res.redirect(version +'/allocate/activity-dashboard-3-search')
	}
});

router.post(version +'/allocate/clearSearchAllocate', function(req, res) {
	{
		res.redirect(version +'/allocate/activity-dashboard-3-search')
	}
});

router.post(version +'/allocate/activityConfirmedAllocation', function(req, res) {
	if (req.session.data.activityConfirmedAllocation == 'yes')
	{
		res.redirect(version +'/allocate/allocate-confirmation')
	}
	else {
		res.redirect(version +'/allocate/allocate-cancel')
	}
});

router.post(version +'/allocate/allocate-cancel', function(req, res) {
	if (req.session.data.allocateCancel == 'yes'){
			if (req.session.data.activityAllocateName == 'Gardening'){
				res.redirect(version +'/allocate/activity-dashboard-4-garden')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 1'){
				res.redirect(version +'/allocate/activity-dashboard-4-1')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 2'){
				res.redirect(version +'/allocate/activity-dashboard-4-2')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 3'){
				res.redirect(version +'/allocate/activity-dashboard-4-3')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 4'){
				res.redirect(version +'/allocate/activity-dashboard-4-4')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 5'){
				res.redirect(version +'/allocate/activity-dashboard-4-5')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 6'){
				res.redirect(version +'/allocate/activity-dashboard-4-6')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 7'){
				res.redirect(version +'/allocate/activity-dashboard-4-7')
			}
			if (req.session.data.activityAllocateName == 'Wing cleaning 8'){
				res.redirect(version +'/allocate/activity-dashboard-4-8')
			}
			else{
				res.redirect(version +'/allocate/activity-dashboard-1')
			}
		}
	else {
		res.redirect(version +'/allocate/activity-dashboard-5-1')
	}
});

router.post(version +'/allocate/AllocateRemove', function(req, res) {
	{
		res.redirect(version +'/allocate/allocate-remove-offender')
	}
});


//Removal of offender ALREADY allocated to an activity
router.post(version +'/allocate/allocate-remove-offender', function(req, res) {
	if (req.session.data.activityConfirmRemoval == 'yes'){
		 if (req.session.data.RemoveOffenderName[0]=='Lance Arm')
		 {
			var LanceArm = 'NotAllocated'
			req.session.data.LanceArm = LanceArm
			 res.redirect(version +'/allocate/activity-dashboard-4-1#allocated')
		 }
		 else {
	 		 res.redirect(version +'/allocate/activity-dashboard-4-1#allocated')
	 		}
		}
});

//If cancel offender on the identify candidates route of allocation, not yet allocated
router.post(version +'/allocate/allocate-cancel-offender', function(req, res) {
	if (req.session.data.cancelAllocationYesNo == 'yes'){
			 res.redirect(version +'/allocate/activity-dashboard-4-1#allocate')
		 }
		 else {
	 		 res.redirect(version +'/allocate/activity-dashboard-5-1')
	 		}
});


//Offender dashbaord allocations

router.post(version +'/allocate/Dashboard4', function(req, res) {
	{
		if (req.session.data.offenderAllocate=="Ivor Norisk" ){
			res.redirect(version +'/allocate/allocate-payment-details')
		}
		else{
		res.redirect(version +'/allocate/activity-dashboard-5-1')
		}
	}
});

router.post(version +'/allocate/activity-dashboard-5-1', function(req, res) {
	{
		res.redirect(version +'/allocate/allocate-payment-details')
	}
});

router.post(version +'/allocate/allocate-payment-details', function(req, res) {
	{
		res.redirect(version +'/allocate/allocate-check-answers')
	}
});




router.post(version +'/allocate/allocate-check-answers', function(req, res) {
	{
		res.redirect(version +'/allocate/allocate-confirmation')
	}
});




}
