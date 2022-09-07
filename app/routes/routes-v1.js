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
		res.redirect(version +'/create/activity-will-it-recur3')
	}

});



///////END CREATE//////////
}
