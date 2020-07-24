const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const auth = require("../auth/auth");

// router.post("/reminder/sms/:customer_id", auth, messageController.sendMessage);

router.get("/message/numbers", auth, messageController.getCustomer);

router.post("/message/send", auth, messageController.send);

module.exports = router;
