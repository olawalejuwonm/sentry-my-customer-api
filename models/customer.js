const mongoose = require("mongoose"),
  Transaction = require("./transaction");

const customerSchema = new mongoose.Schema(
  {
    store_ref_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "mycustomer_store",
    },
    name: { type: String, required: true },
    phone_number: { type: String, required: true },
    email: { type: String, default: "Not set" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("customer", customerSchema);
