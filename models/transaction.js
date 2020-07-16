const mongoose = require("mongoose");
const Debt = require("./debt_reminders");

const transactionSchema = new mongoose.Schema(
  {
    amount: { type: String, required: true },
    interest: { type: String },
    total_amount: { type: String },
    description: { type: String, default: "Not set" },
    assistant_inCharge: { type: String, default: "Not set" },
    type: { type: String, required: true },
    status: { type: String, default: "unpaid" },
    expected_pay_date: { type: Date },
    store_ref_id: { type: String },
    customer_ref_id: { type: String },
    debts: [Debt.schema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("transaction", transactionSchema);
