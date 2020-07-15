const express = require("express");
const router = express.Router();
const bodyValidator = require("../util/body_validator");
const debt = require("./../controllers/debt_reminder.js");
const auth = require("../auth/auth");

// router.post(
//   "/debt/new",
//   auth,
//   debt.validate("body"),
//   bodyValidator,
//   debt.create
// );
router.get("/debt", auth, debt.getAll);
router.put("/debt/update/:debtId", auth, debt.markAsPaid);
// router.delete("/debt/delete/:debtId", auth, debt.deleteById);
router.get("/debt/:debtId", auth, debt.getById);
router.post("/debt/send", auth, debt.send);
router.post("/debt/schedule", auth, debt.schedule);

module.exports = router;
