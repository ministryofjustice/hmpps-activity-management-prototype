const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// activity page
router.get("/", function (req, res) {
  res.redirect(req.originalUrl + "/search-for-a-prisoner");
});