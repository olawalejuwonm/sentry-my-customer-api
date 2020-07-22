const Store = require("./../models/store");
const UserModel = require("../models/store_admin");
const CustomerModel = require("../models/customer");
const { errorHandler } = require("./login_controler");
const TransactionModel = require("../models/transaction");

exports.createStore = async (req, res) => {
  if (req.body.store_name === "" || req.body.shop_address === "") {
    return res.status(500).json({
      success: false,
      message: error.message,
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
        store,
      },
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
          message: "Could not find User",
        },
      });
    } else {
      if (User.local.user_role !== "super_admin") {
        return res.status(401).json({
          success: false,
          message: "Unauthorised, resource can only accessed by Super Admin",
          error: {
            statusCode: 401,
            message: "Unauthorised, resource can only accessed by Super Admin",
          },
        });
      } else {
        let stores = await Store.find({}).populate({
          path: "store_admin_ref",
          select: "-local.password -identifier -google -facebook -api_token",
        });
        stores = Object.values(
          stores.reduce((acc, cur) => {
            if (acc[cur.store_admin_ref._id])
              return {
                ...acc,
                [cur.store_admin_ref._id]: [
                  ...acc[cur.store_admin_ref._id],
                  cur,
                ],
              };
            return { ...acc, [cur.store_admin_ref._id]: [cur] };
          }, {})
        );

        res.status(200).json({
          success: true,
          result: stores.length,
          message: "Here are all your stores Super Admin",
          data: {
            statusCode: 200,
            stores,
          },
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
    let stores;
    if (req.user.user_role === "super_admin") {
      stores = await Store.find();
    } else {
      stores = await Store.find({
        $or: [{ store_admin_ref: req.user._id }, { assistant: req.user._id }],
      });
    }
    res.status(200).json({
      success: true,
      result: stores.length,
      message: "Here are all your stores",
      data: {
        statusCode: 200,
        stores,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.getStore = async (req, res) => {
  try {
    let store = await Store.findOne({
      _id: req.params.store_id,
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found",
        },
      });
    }
    let customers = await CustomerModel.find({ store_ref_id: store._id });
    customers = await Promise.all(
      customers.map(async (customer) => {
        const transactions = await TransactionModel.find({
          customer_ref_id: customer._id,
        });
        return { ...customer.toObject(), transactions };
      })
    );
    store = { tagline: "Not Set", ...store.toObject(), customers };
    return res.status(200).json({
      success: true,
      message: "Operation successful",
      data: {
        store,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.updateStore = async (req, res) => {
  try {
    let store = await Store.findOne({
      _id: req.params.store_id,
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found",
        },
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
        store,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.deleteStore = async (req, res, next) => {
  try {
    let store = await Store.findOne({
      _id: req.params.store_id,
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        Message: "Store not found",
        error: {
          statusCode: 404,
          message: "Store not found",
        },
      });
    }
    await TransactionModel.deleteMany({ store_ref_id: store._id });
    await CustomerModel.deleteMany({ store_ref_id: store._id });
    await store.remove();
    res.status(200).json({
      success: true,
      message: "Store deleted successfully",
      data: {
        statusCode: 200,
        store,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
