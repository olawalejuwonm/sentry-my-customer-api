const Store = require("./../models/store");
const UserModel = require("../models/store_admin");
const { errorHandler } = require("./login_controler");

exports.createStore = async (req, res) => {
  if (req.body.store_name === "" || req.body.shop_address === "") {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
  try {
    req.body.store_admin_ref = req.user._id;
    const store = await Store.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Store added successfully",
      data: {
        statusCode: 201,
        store
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.getAll = async (req, res) => {
  const id = req.user.phone_number;
  try {
    const User = await UserModel.findOne({ identifier: id });
    if (!User) {
      return res.status(404).json({
        success: false,
        message: "could not User",
        error: {
          statusCode: 404,
          message: "Could not find User"
        }
      });
    } else {
      if (User.local.user_role !== "super_admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorised, resource can only accessed by Super Admin",
          error: {
            statusCode: 401,
            message: "Unauthorised, resource can only accessed by Super Admin"
          }
        });
      } else {
        let stores = await Store.find({}).populate({
          path: "store_admin_ref",
          select: "-local.password -identifier -google -facebook -api_token"
        });

        res.status(200).json({
          success: true,
          result: stores.length,
          message: "Here are all your stores Super Admin",
          data: {
            statusCode: 200,
            stores
          }
        });
      }
    }
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.getAllStores = async (req, res) => {
  //current user's id to find user
  try {
    let stores = await Store.find({
      $or: [{ store_admin_ref: req.user._id }, { assistant: req.user._id }]
    });
    res.status(200).json({
      success: true,
      result: stores.length,
      message: "Here are all your stores",
      data: {
        statusCode: 200,
        stores
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.getStore = async (req, res) => {
  try {
    const store = await Store.findOne({
      _id: req.params.store_id,
      $or: [{ store_admin_ref: req.user._id }, { assistant: req.user._id }]
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }
    return res.status(200).json({
      success: true,
      message: "Operation successful",
      data: {
        store
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.updateStore = async (req, res) => {
  try {
    let store = await Store.findOne({
      _id: req.params.store_id,
      $or: [{ store_admin_ref: req.user._id }, { assistant: req.user._id }]
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }
    store.store_name = req.body.store_name || store.store_name;
    store.phone_number = req.body.phone_number || store.phone_number;
    store.tagline = req.body.tagline || store.tagline;
    store.email = req.body.email || store.email;
    store.shop_address = req.body.shop_address || store.shop_address;
    store = await store.save();
    res.status(201).json({
      success: true,
      message: "Store updated successfully",
      data: {
        statusCode: 201,
        store
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.deleteStore = async (req, res, next) => {
  try {
    let store = await Store.findOne({
      _id: req.params.store_id,
      $or: [{ store_admin_ref: req.user._id }, { assistant: req.user._id }]
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }
    await store.remove();
    res.status(200).json({
      success: true,
      message: "Store deleted successfully",
      data: {
        statusCode: 200,
        store
      }
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
