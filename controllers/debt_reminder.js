const UserModel = require("../models/store_admin");
const { body } = require("express-validator/check");
const Debt = require("../models/debt_reminders");
const Response = require("../util/response_manager");
const HttpStatus = require("../util/http_status");
const mongoose = require("mongoose");
const Transaction = require("../models/transaction");
const { all } = require("../routes/customer");
const cron = require("node-cron");
const africastalking = require("africastalking")({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME,
});
const { errorHandler } = require("./login_controler");

exports.validate = (method) => {
  switch (method) {
    case "body": {
      return [
        body("store_name").isString(),
        body("customer_phone_number").isLength({ min: 3 }),
        body("message").isLength({ min: 3 }),
        body("status").isLength({ min: 3 }),
        body("pay_date").isLength({ min: 3 }),
        body("transaction_id").optional(),
        body("name").isString().isLength({ min: 1 }),
        body("amount").isLength({ min: 3 }),
      ];
    }
  }
};

// Find all transaction with stat
exports.getAll = async (req, res) => {
  try {
    let debts;
    if (req.user.user_role === "super_admin") {
      debts = await Transaction.find({ type: "debt" });
    } else {
      debts = await Transaction.find({
        type: "debt",
        store_admin_id: req.user.store_admin_id,
      });
    }
    return res.status(200).json({
      success: true,
      message: "All Debts",
      data: {
        statusCode: 200,
        debts,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

//Gets the debt of a particular store
exports.getStoreDebt = async (req, res) => {
  try {
    let debts;
    if (req.user.user_role === "super_admin") {
      debts = await Transaction.find({
        type: "debt",
        store_ref_id: req.params.storeId,
      });
    } else {
      debts = await Transaction.find({
        type: "debt",
        store_ref_id: req.params.storeId,
        $or: [{ store_admin_id: req.user._id }, { assistant: req.user._id }],
      });
    }

    return res.status(200).json({
      success: true,
      message: "All Debts",
      data: {
        statusCode: 200,
        debts,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
  const identifier = req.user.phone_number;
  let allDebts = [];

  UserModel.findOne({
    $or: [
      {
        identifier: req.user.phone_number,
        "local.user_role": req.user.user_role,
      },
      {
        "assistants.phone_number": req.user.phone_number,
        "assistants.user_role": req.user.user_role,
      },
    ],
  })
    .then((user) => {
      //search loop to get the debt of a store passed in the params
      user.stores.forEach((store) => {
        if (store._id == req.params.storeId) {
          store.customers.forEach((customer) => {
            customer.transactions.forEach((transaction) => {
              if (
                transaction.type.toLowerCase() == "debt" &&
                transaction.status == false
              ) {
                allDebts.push(transaction);
              }
            });
          });
        }
      });

      return res.status(200).json({
        success: true,
        message: "All Debts",
        data: {
          statusCode: 200,
          debts: allDebts,
        },
      });
    })
    .catch((err) => {
      res.status(500).json({
        sucess: false,
        message: "Couldn't find user or some server error occurred",
        error: {
          statusCode: 500,
          message: err.message,
        },
      });
    });
};

exports.getById = async (req, res) => {
  try {
    let debt;
    if (req.user.user_role === "super_admin") {
      debt = await Transaction.find({
        type: "debt",
        _id: req.params.transactionId,
      });
    } else {
      debt = await Transaction.find({
        _id: req.params.transactionId,
        typs: "debt",
        $or: [{ store_admin_id: req.user._id }, { assistant: req.user._id }],
      });
    }
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
        },
      });
    }
    return res.status(200).json({
      success: true,
      message: "found",
      data: {
        statusCode: 200,
        debt,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

//Route to set the status of a debt to paid
exports.markAsPaid = async (req, res) => {
  try {
    let debt;
    if (req.user.user_role === "super_admin") {
      debt = await Transaction.find({
        type: "debt",
        _id: req.params.transactionId,
      });
    } else {
      debt = await Transaction.find({
        _id: req.params.transactionId,
        typs: "debt",
        $or: [{ store_admin_id: req.user._id }, { assistant: req.user._id }],
      });
    }
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
        },
      });
    }
    debt.status = true;
    debt = await debt.save();
    return res.status(201).json({
      sucess: true,
      message: "Operation Successful",
      data: {
        debt,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

exports.send = async (req, res) => {
  try {
    let { transaction_id, message } = req.body;

    if (!transaction_id) {
      return res.send(400).json({
        success: false,
        Message: "Please enter a valid transaction_id",
        error: {
          errorCode: "400",
          Message: "Please enter a valid transaction_id",
        },
      });
    }
    let debt;
    if (req.user.user_role === "super_admin") {
      debt = await Transaction.find({ type: "debt", _id: transaction_id })
        .populate({ path: "customer_ref_id store_ref_id" })
        .exec();
    } else {
      debt = await Transaction.find({
        _id: transaction_id,
        typs: "debt",
        $or: [{ store_admin_id: req.user._id }, { assistant: req.user._id }],
      })
        .populate({ path: "customer_ref_id store_ref_id" })
        .exec();
    }
    if (!debt) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
        },
      });
    }
    let to = debt.customer_ref_id.phone_number;
    let amount = debt.total_amount;
    let store_name = debt.store_ref_id.store_name;
    message =
      message || `You have an unpaid debt of ${amount} Naira in ${store_name}`;
    if (!regex.test(to)) {
      if (to.charAt(0) == "0") {
        to = to.slice(1);
        to = "+234" + to;
      } else if (to.charAt(0) == "2") {
        to = "+" + to;
      } else {
        to = "+234" + to;
      }
    }
    const sms = await africastalking.SMS;
    sms.send({
      to,
      message: reminder_message,
      enque: true,
    });
    console.log(sms);
    if (sms.SMSMessageData.Message == "Sent to 0/1 Total Cost: 0") {
      return res.status(200).json({
        success: false,
        Message: "Invalid Phone Number",
      });
    }
    return res.status(200).json({
      success: true,
      Message: "Reminder sent",
      details: {
        to,
        message,
      },
      sms,
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Schedule reminder route
exports.schedule = async (req, res) => {
  let { transaction_id, message, scheduleDate, time } = req.body;

  if (!scheduleDate || !time || !transaction_id) {
    return res.send(400).json({
      success: false,
      Message: "Please provide the valid parameters",
      error: {
        errorCode: "400",
        Message: "Please provide the valid parameters",
      },
    });
  }
  try {
    let transaction;
    if (req.user.user_role === "super_admin") {
      transaction = await (await Transaction.findOne({ _id: transaction_id }))
        .populated({ path: "customer_ref_id store_ref_id" })
        .exe();
    } else {
      transaction = await Transaction.findOne({
        _id: transaction_id,
        store_admin_ref: req.user.store_admin_ref,
      })
        .populated({ path: "customer_ref_id store_ref_id" })
        .exe();
    }
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
        data: {
          statusCode: 404,
        },
      });
    }
    let to = transaction.customer_ref_id.phone_number;
    let amount = transaction.amount;
    let store_name = transaction.store_ref_id.store_name;
    if (!message) {
      reminder_message = `You have an unpaid debt of ${amount} Naira in ${store_name}`;
    } else {
      reminder_message = message;
    }

    if (!regex.test(to)) {
      if (to.charAt(0) == "0") {
        to = to.slice(1);
        to = "+234" + to;
      } else if (to.charAt(0) == "2") {
        to = "+" + to;
      } else {
        to = "+234" + to;
      }
    }

    let h = time.slice(0, 2);
    let m = time.slice(3);
    let d = scheduleDate.slice(0, 2);
    let mo = scheduleDate.slice(3, 5);

    const send = cron.schedule(`${m} ${h} ${d} ${mo} *`, () => {
      const sms = africastalking.SMS;
      sms
        .send({
          to,
          message: reminder_message,
        })
        .then((response) => {
          console.log(response);
          send.destroy();
        })
        .catch((err) => {
          console.log(err);
        });
    });
    res.status(200).json({
      success: true,
      Message: "Reminder Scheduled",
      details: {
        to,
        reminder_message,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
