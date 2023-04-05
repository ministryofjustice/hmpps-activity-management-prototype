const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const { DateTime } = require("luxon");

router.all("*", function (req, res, next) {
  // console.log(req.session.data["new-activity"]);
  next();
});

//redirect the root url to the start page
// router.get("/", function (req, res) {
//   res.redirect("edit-activity/select-category");
// });

module.exports = router;
