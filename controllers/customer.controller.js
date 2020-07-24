const UserModel = require("../models/store_admin");
const StoreModel = require("../models/store");
const { body } = require("express-validator/check");
const Customer = require("../models/customer");
const { errorHandler } = require("./login_controler");

exports.validate = (method) => {
  switch (method) {
    case "body": {
      return [body("name").isLength({ min: 3 })];
    }
  }
};

exports.create = async (req, res) => {
  const { phone_number, email, name, store_id } = req.body;
  try {
    let store;
    if ((req.user.user_role = "super_admin")) {
      store = await StoreModel.findOne({
        _id: store_id,
      });
    } else {
      store = await StoreModel.findOne({
        _id: store_id,
        store_admin_ref: req.user.store_admin_ref,
      });
    }
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        error: {
          statusCode: 404,
        },
      });
    }

    let customer = await Customer.findOne({
      phone_number,
      store_ref_id: store_id,
    });
    if (customer) {
      return res.status(409).json({
        sucess: false,
        message: "Customer already registered",
        data: {
          statusCode: 409,
        },
      });
    }
    customer = await Customer.create({
      phone_number,
      store_ref_id: store_id,
      name,
      email,
    });
    return res.status(201).json({
      success: true,
      message: "Customer registration successful",
      data: {
        statusCode: 201,
        customer,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.getById = async (req, res) => {
  try {
    let store = await StoreModel.findOne({
      _id: req.params.storeId,
      store_admin_ref: req.user.store_admin_ref,
    });
    if (!store) {
      return res.status(404).json({
        status: false,
        message: "store not found",
        error: {
          statusCode: 404,
          message: "store not found",
        },
      });
    }
    let customer = await Customer.findOne({
      store_ref_id: store._id,
      _id: req.params.customerId,
    });
    if (!customer) {
      return res.status(404).json({
        status: false,
        message: "Customer not found",
        error: {
          statusCode: 404,
          message: "customer not found",
        },
      });
    }
    return res.status(200).json({
      success: true,
      message: "successful",
      data: {
        statusCode: 200,
        customer,
        storeName: store.store_name,
        storeId: store._id,
      },
    });
  } catch (error) {
    return errorHandler(error, res);
  }
};

exports.updateById = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    const { name, phone_number, email, store_id } = req.body;
    let store = await StoreModel.findOne({
      _id: store_id,
      store_admin_ref: req.user.store_admin_ref,
    });
    if (!store) {
      return res.status(404).json({
        status: false,
        message: "store not found",
        error: {
          statusCode: 404,
          message: "store not found",
        },
      });
    }
    let customer = await Customer.findOne({
      store_ref_id: store._id,
      _id: customerId,
    });
    if (!customer) {
      return res.status(404).json({
        status: false,
        message: "Cannot find customer",
        error: {
          statusCode: 404,
          message: error,
        },
      });
    }
    customer.name = req.body.name || customer.name;
    customer.phone_number = req.body.phone_number || customer.phone_number;
    customer.email = req.body.email || customer.email;
    customer = await customer.save();
    return res.status(200).json({
      success: true,
      message: "Customer updated successfully.",
      data: {
        statusCode: 200,
        customer,
      },
    });
  } catch (error) {
    return errorHandler(error, res);
  }
};

//newly added
exports.findOneAdmin = async (req, res) => {
  // {
  //   phone_number: '08145156235',
  //   password: '$2a$10$hD.0n7SIfdhm0WjyW8l4S.hUHOFm9.vUeX5lsHoIV9o7NNh4ZrqwC',
  //   user_role: 'store_admin',
  //   _id: '5f104bee46f6dc12f8343d6c',
  //   iat: 1595607127,
  //   exp: 1595693527,
  //   store_admin_ref: '5f104bee46f6dc12f8343d6c'
  // }
  try {
    const identifier = req.user.phone_number;
    const admin = await UserModel.findOne({ identifier });
    if (!admin || req.user.user_role !== "super_admin") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }

    const user = await UserModel.findOne({
      stores: { 
        $elemMatch: { 
          _id: req.params.storeId,
          customers: { 
            $elemMatch: {
              _id: req.params.customerId
            }
          }
        }
      } 
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
          message: "Transaction not found"
        }
      });
    }

    const store = user.stores.find(store => store._id == req.params.storeId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found"
        }
      });
    }

    const customer = store.customers.find(
      customer => customer._id == req.params.customerId
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found"
        }
      });
    }

    const customerLocal = JSON.parse(JSON.stringify(customer));
    customerLocal.store_ref_id = store._id;
    customerLocal.store_name = store.store_name;

    res.status(200).json({
      success: true,
      message: "Customer",
      data: {
        customer: customerLocal
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrongr",
      data: {
        statusCode: 500,
        message: error
      }
    });
  }
};

exports.deleteById = async (req, res) => {
  try {
    let customer = await Customer.findOne({
      _id: req.params.customerId,
    }).populate({ path: "store_ref_id" });
    if (
      !customer ||
      (req.user._id.toString() !==
        customer.store_ref_id.store_admin_ref.toString() &&
        req.user._id.toString() !==
          (customer.store_ref_id.assistant &&
            customer.store_ref_id.assistant.toString()))
    ) {
      return res.status(404).json({
        status: false,
        message: "Cannot find customer",
        error: {
          statusCode: 404,
          customer,
        },
      });
    }
    await customer.remove();
    return res.status(200).json({
      success: true,
      message: "Customer deleted successful",
      data: {
        statusCode: 200,
      },
    });
  } catch (error) {
    return errorHandler(error, res);
  }
};

exports.getAll = async (req, res) => {
  try {
    let stores;
    if (req.user.user_role === "super_admin") {
      stores = await StoreModel.find({});
    } else {
      stores = await StoreModel.find({
        store_admin_ref: req.user.store_admin_ref,
      });
    }
    const customer = await Promise.all(
      stores.map(async (store) => {
        const customers = await Customer.find({ store_ref_id: store._id });
        return {
          storeName: store.store_name,
          storeId: store._id,
          customers,
        };
      })
    );
    return res.status(200).json({
      success: true,
      message: "Operation successful",
      data: {
        statusCode: 200,
        customer,
      },
    });
  } catch (error) {
    return errorHandler(error, res);
  }
};
//newly added
exports.findAllAdmin = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const admin = await UserModel.findOne({ identifier });
    if (!admin || req.user.user_role !== "super_admin") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }

    const users = await UserModel.find();
    if (!users) {
      return res.status(404).json({
        success: false,
        message: "Users not found",
        data: {
          statusCode: 404,
          message: "Users not found"
        }
      });
    }

    let customers = [];
    users.forEach(user => {
      user.stores.forEach(store => {
        customers = customers.concat(store.customers);
      });
    });

    res.status(200).json({
      success: true,
      message: "Customers",
      data: {
        customers: customers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      data: {
        statusCode: 500,
        message: error
      }
    });
  }
};

exports.findAllAdmin = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const admin = await UserModel.findOne({ identifier });
    if (!admin || admin.local.user_role !== "super_admin") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found"
        }
      });
    }

    const users = await UserModel.find();
    if (!users) {
      return res.status(404).json({
        success: false,
        message: "Users not found",
        data: {
          statusCode: 404,
          message: "Users not found"
        }
      });
    }

    let customers = [];
    users.forEach(user => {
      user.stores.forEach(store => {
        customers = customers.concat(store.customers);
      });
    });

    res.status(200).json({
      success: true,
      message: "Customers",
      data: {
        customers: customers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      data: {
        statusCode: 500,
        message: error
      }
    });
  }
};
