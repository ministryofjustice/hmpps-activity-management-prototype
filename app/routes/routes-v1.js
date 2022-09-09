module.exports = function (router) {

var version = '/v1';

router.post(version +'/setup', function(req, res) {
///////CREATE//////////

	//use fresh posted data or use session data
	//if (req.body['setupCategories'] == 'yes')

	//SET UP PAGE//
	if (req.session.data.setupCategories == 'yes')
	{
		res.redirect(version +'/create/activity-type-select-with-category')
	}
	else {
		res.redirect(version +'/create/activity-name')
	}
	});

router.post(version +'/create/activity-type-select-with-category', function(req, res) {
	{
		res.redirect(version +'/create/activity-name')
	}
});

//Removed appointments so no need for a page with just activity on
//router.post(version +'/create/activity-type-select-no-category', function(req, res) {
//	{
//		res.redirect(version +'/create/activity-name')
//	}
//});

router.post(version +'/create/activity-name', function(req, res) {
	{
		res.redirect(version +'/create/activity-capacity')
	}
});

router.post(version +'/create/activity-capacity', function(req, res) {
	{
		res.redirect(version +'/create/activity-will-it-recur')
	}
});

router.post(version +'/create/activity-will-it-recur', function(req, res) {
	if (req.session.data.activityWillItRecur == 'yes')
	{
		res.redirect(version +'/create/activity-add-recurrence')
	}
	else {
		res.redirect(version +'/create/activity-start-date')
	}

		//Not recurring
		router.post(version +'/create/activity-start-date', function(req, res) {
			{
				res.redirect(version +'/create/activity-start-time')
			}
		});

		//Recurring
		router.post(version +'/create/activity-which-days', function(req, res) {
			{
				res.redirect(version +'/create/activity-start-time')
			}
		});

	router.post(version +'/create/activity-start-time', function(req, res) {
		{
			if (req.session.data.setupLocation == 'dashboard'){
				res.redirect(version +'/create/activity-location-list-dashboard')
			}
			else{
				res.redirect(version +'/create/activity-location-list-dropdown')
			}
		}
	});

	router.post(version +'/create/activity-location-list-dashboard', function(req, res) {
		{
			res.redirect(version +'/create/activity-incentive-level')
		}
	});

	router.post(version +'/create/activity-location-list-dropdown', function(req, res) {
		{
			res.redirect(version +'/create/activity-incentive-level')
		}
	});

	router.post(version +'/create/activity-incentive-level', function(req, res) {
		{
			res.redirect(version +'/create/activity-risk-assessment')
		}
	});

	router.post(version +'/create/activity-risk-assessment', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-alerts')
		}
	});
	//Add another submit button
	router.post(version +'/create/addAlert', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-alerts-one-added')
		}
	});

	router.post(version +'/create/addAlert2', function(req, res) {
		{
			res.redirect(version +'/create/activity-add-alerts-two-added')
		}
	});

	router.post(version +'/create/activity-add-alerts-one-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-payment-details')
		}
	});

	router.post(version +'/create/activity-add-alerts-two-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-payment-details')
		}
	});

	router.post(version +'/create/activity-add-alerts', function(req, res) {
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
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});

	router.post(version +'/create/activity-add-education-one-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});
	router.post(version +'/create/activity-add-education-two-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});
	router.post(version +'/create/activity-add-education-three-added', function(req, res) {
		{
			res.redirect(version +'/create/activity-check-your-answers')
		}
	});
});



///////END CREATE//////////
}
