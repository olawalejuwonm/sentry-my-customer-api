const mongoose = require("mongoose"),
  Customer = require("./customer"),
  Transaction = require("./transaction");

const storeSchema = new mongoose.Schema(
  {
    store_name: { type: String, required: true },
    phone_number: {
      type: String,
      Default: "Not set",
    },
    tagline: { type: String, Default: "Not set" },
    shop_address: { type: String, required: true },
    email: { type: String, default: "Not set" },
    assistant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "storeAssistant",
    },
  },
  { timestamp: true }
);

module.exports = mongoose.model("store", storeSchema);
