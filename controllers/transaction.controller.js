const Transaction = require("../models/transaction");
const UserModel = require("../models/store_admin");
const StoreModel = require("../models/store");
const Customer = require("../models/customer");
const { body } = require("express-validator/check");
const { errorHandler } = require("./login_controler");

exports.validate = (method) => {
  switch (method) {
    case "create": {
      return [
        body("store_id").isString(),
        body("customer_id").isString(),
        body("amount").isNumeric(),
        body("interest").optional().isNumeric(),
        body("total_amount").optional().isNumeric(),
        body("description").optional().isString(),
        body("type").isString(),
        body("status").optional().isBoolean(),
        body("expected_pay_date").optional().isISO8601(),
      ];
    }
    case "update": {
      return [
        body("store_id").isString(),
        body("customer_id").isString(),
        body("amount").optional().isNumeric(),
        body("interest").optional().isNumeric(),
        body("total_amount").optional().isNumeric(),
        body("description").optional().isString(),
        body("type").optional().isString(),
        body("status").optional().isBoolean(),
        body("expected_pay_date").optional().isISO8601(),
      ];
    }
  }
};

// Create and Save a new Transaction
exports.create = async (req, res) => {
  try {
    let store = await StoreModel.findOne({
      _id: req.body.store_id,
      $or: [{ store_admin_ref: req.user._id }, { assistant: req.user._id }],
    });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found",
        },
      });
    }
    let customer = await Customer.findOne({
      _id: req.body.customer_id,
      store_ref_id: store._id,
    });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found",
        },
      });
    }
    const trans = await Transaction.create({
      store_ref_id: req.body.store_id,
      customer_ref_id: req.body.customer_id,
      store_admin_ref: store.store_admin_ref,
      amount: req.body.amount,
      interest: req.body.interest || null,
      total_amount: req.body.total_amount || null,
      ass_ref_id: store.assistant,
      assistant_inCharge: store.assistant,
      description: req.body.description || "Not set",
      type: req.body.type,
      status: req.body.status || false,
      expected_pay_date: req.body.expected_pay_date || null,
    });
    return res.status(200).json({
      success: true,
      message: "Transaction saved",
      data: {
        transaction: trans,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Retrieve and return all transactions from the database.
exports.findAll = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const user = await UserModel.findOne({
      $or: [
        { identifier: req.user.phone_number, user_role: req.user.user_role },
        {
          "assistants.phone_number": req.user.phone_number,
          "assistants.user_role": req.user.user_role,
        },
      ],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found",
        },
      });
    }

    const store = user.stores.find((store) => store._id == req.params.store_id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found",
        },
      });
    }

    const customer = store.customers.find(
      (customer) => customer._id == req.params.customer_id
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found",
        },
      });
    }

    res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        transactions: customer.transactions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      data: {
        statusCode: 500,
        message: error,
      },
    });
  }
};

exports.findAllStore = async (req, res) => {
  try {
    let transactions = await Transaction.find({
      $or: [
        { assistant_inCharge: req.user._id },
        { store_admin_ref: req.user._id },
      ],
    });
    return res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        statusCode: 200,
        transactions,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.findAllAdmin = async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.user._id });
    if (!user || user.local.user_role !== "super_admin") {
      return res.status(401).json({
        success: false,
        message: "not enough permissions",
        data: {
          statusCode: 401,
        },
      });
    }
    const transactions = await Transaction.find({});

    res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        transactions,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.findAllUser = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const admin = await UserModel.findOne({ identifier });
    if (!admin || admin.user_role !== "super_admin") {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found",
        },
      });
    }

    const users = await UserModel.find();
    if (!users) {
      return res.status(404).json({
        success: false,
        message: "Users not found",
        data: {
          statusCode: 404,
          message: "Users not found",
        },
      });
    }

    let transactions;
    users.forEach((user) => {
      user.stores.forEach((store) => {
        store.customers.forEach((customer) => {
          if (transactions) {
            transactions = customer.transactions.concat(transactions);
          } else {
            transactions = customer.transactions;
          }
        });
      });
    });

    res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        transactions: transactions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      data: {
        statusCode: 500,
        message: error,
      },
    });
  }
};

// Find a single transaction with a transaction_id
exports.findOne = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const user = await UserModel.findOne({
      $or: [
        { identifier: req.user.phone_number, user_role: req.user.user_role },
        {
          "assistants.phone_number": req.user.phone_number,
          "assistants.user_role": req.user.user_role,
        },
      ],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found",
        },
      });
    }

    const store = user.stores.find((store) => store._id == req.params.store_id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found",
        },
      });
    }

    const customer = store.customers.find(
      (customer) => customer._id == req.params.customer_id
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found",
        },
      });
    }

    const transaction = customer.transactions.find(
      (transactions) => transactions._id == req.params.transaction_id
    );
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
          message: "Transaction not found",
        },
      });
    }

    let localTransaction = JSON.parse(JSON.stringify(transaction));
    localTransaction.store_name = store.store_name;

    res.status(200).json({
      success: true,
      message: "Transaction",
      data: {
        transaction: localTransaction,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrongr",
      data: {
        statusCode: 500,
        message: error,
      },
    });
  }
};

// Update a transaction identified by the transaction_id in the request
exports.update = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const user = await UserModel.findOne({ identifier });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found",
        },
      });
    }

    const store = user.stores.find((store) => store._id == req.body.store_id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found",
        },
      });
    }

    const customer = store.customers.find(
      (customer) => customer._id == req.body.customer_id
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found",
        },
      });
    }

    const transaction = customer.transactions.find(
      (transactions) => transactions._id == req.params.transaction_id
    );
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
          message: "Transaction not found",
        },
      });
    }

    transaction.amount = req.body.amount || transaction.amount;
    transaction.interest = req.body.interest || transaction.interest;
    transaction.total_amount =
      req.body.total_amount || transaction.total_amount;
    transaction.description = req.body.description || transaction.description;
    transaction.type = req.body.type || transaction.type;
    transaction.status =
      typeof req.body.status !== "undefined"
        ? req.body.status
        : transaction.status;
    transaction.expected_pay_date =
      req.body.expected_pay_date || transaction.expected_pay_date;

    await user.save();
    res.status(200).json({
      success: true,
      message: "Transaction updated",
      data: {
        transaction: transaction,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong",
      data: {
        statusCode: 500,
        message: error,
      },
    });
  }
};

// Delete a transaction with the specified transaction_id in the request
exports.delete = async (req, res) => {
  try {
    const identifier = req.user.phone_number;
    const user = await UserModel.findOne({ identifier });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        data: {
          statusCode: 404,
          message: "User not found",
        },
      });
    }

    const store = user.stores.find((store) => store._id == req.params.store_id);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store not found",
        data: {
          statusCode: 404,
          message: "Store not found",
        },
      });
    }

    const customer = store.customers.find(
      (customer) => customer._id == req.params.customer_id
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        data: {
          statusCode: 404,
          message: "Customer not found",
        },
      });
    }

    const transactions = customer.transactions.filter(
      (transactions) => transactions._id != req.params.transaction_id
    );
    customer.transactions = transactions;

    await user.save();
    res.status(200).json({
      success: true,
      message: "Transactions",
      data: {
        transactions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrongr",
      data: {
        statusCode: 500,
        message: error,
      },
    });
  }
};
