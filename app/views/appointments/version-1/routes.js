const express = require('express')
const router = express.Router()

	//redirect the root url to the start page
	router.get('/', function(req, res) {
		res.redirect(req.version + '/start')
	});

	
	
module.exports = router