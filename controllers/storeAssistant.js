const StoreAssistantModel = require("../models/storeAssistant");
const StoreModel = require("../models/store");
const UserModel = require("../models/store_admin");
const bCrypt = require("bcryptjs");
const { errorHandler } = require("./login_controler");

exports.createStoreAssistant = (req, res) => {
  const { phone_number, name, store_id } = req.body;
  const {_id: store_admin_ref } = req.user;

  if (!phone_number || !name || !store_id) {
    return res.status(400).json({
      success: false,
      message: "Enter the required details",
      data: {
        status: 400,
        message: "Enter the required details",
      },
    });
  }
try {
  const store = await StoreModel.findOne({
    _id: store_id,
    store_admin_ref
  });

  if (!store) {
    return res.status(404).json({
      success: false,
      message: 'store not found',
      error: {
        statusCode: 404
      }
    });
  }
  const password = await bCrypt.hash('password', 10);
  const assistant = await StoreAssistantModel.create({
    store_admin_ref,
    phone_number,
    name,
    password
  });
  store.assistant = assistant._id;
  await store.save();
  return res.status(200).json({
    success: true,
    message: "Assistant created",
    data: {
      assistants: [
        assistant
      ],
    }
  });
} catch (error) {
  errorHandler(error, res);
}
};
