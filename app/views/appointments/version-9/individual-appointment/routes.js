const express = require('express')
const router = express.Router()


  // select prisoner page
router.get("/select-prisoner", function (req, res) {
  let prisoners = req.session.data["timetable-complete-1"]["prisoners"];
  let searchTerm = req.query.search;

  const matchingPrisoners = prisoners.filter((prisoner) => {
    const fullName = `${prisoner.name.forename} ${prisoner.name.surname}`;
    return (
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prisoner.id.toLowerCase() === searchTerm.toLowerCase()
    );
  });

  req.session.data["new-application"] = {}

	res.redirect("prisoner-search");

});

module.exports = router