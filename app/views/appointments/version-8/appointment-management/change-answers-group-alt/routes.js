const express = require("express");
const router = express.Router();
const { DateTime } = require("luxon");

// post handler for the currently allocated page
router.post("/manage-group-appointments", function (req, res) {
    let selectedPrisoners = req.session.data["selected-prisoners"];
  
    // if the user clicks the 'remove' button, redirect to the deallocate page
    // the button name is allocation-action
    if (req.body["allocation-action"] === "deallocate") {
      res.redirect("deallocate/" + selectedPrisoners + "?redirect=");
    } 
  });