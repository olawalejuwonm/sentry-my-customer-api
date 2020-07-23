const mongoose = require("mongoose");

const storeSchema = new mongoose.Schema(
  {
    store_admin_ref: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "store_admin",
    },
    store_name: { type: String, required: true },
    phone_number: {
      type: String,
      default: "Not set",
    },
    tagline: { type: String, Default: "Not set", required: true },
    shop_address: { type: String, required: true },
    email: { type: String, default: "Not set" },
  },
  { timestamp: true }
);

module.exports = mongoose.model("mycustomer_store", storeSchema);
