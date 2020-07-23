const mogoose = require("mongoose");

const marketingSchema = new mongoose.Schema({
  store_ref_code: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "mycustomer_store",
  },
  message: String,
  status: String,
  user_ref_id: {
    type: String,
    required: true,
  },
  status: {
    type: String,
  },
  user_ref_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  publish_date: {
    type: Date,
    default: Date.now(),
  },
});
module.exports = mongoose.model("marketing", marketingSchema);
