const mongoose = require("mongoose");

const DebtReminder = new mongoose.Schema(
  {
    store_admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "store_admin",
    },
    customer_phone_number: {
      type: String,
      required: true,
    },
    name: {
      default: "",
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    store_ref_id: { type: mongoose.Schema.Types.ObjectId, ref: "store" },
    trans_ref_id: { type: mongoose.Schema.Types.ObjectId, ref: "transaction" },
    message: { type: String, required: true },
    status: { type: String, required: true },
    expected_pay_date: { type: Date, default: Date.now(), required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("debt_reminder", DebtReminder);
