const UserModel = require("../models/store_admin");
const { body } = require("express-validator/check");
const Debt = require("../models/debt_reminders");
const Response = require("../util/response_manager");
const HttpStatus = require("../util/http_status");
const mongoose = require("mongoose");
const Transaction = require("../models/transaction");
const { all } = require("../routes/customer");
const cron = require("node-cron");
const transaction = require("../models/transaction");
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
      debts = await Debt.find({});
    } else {
      debts = await Debt.find({
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
};

//Gets the debt of a particular store
exports.getStoreDebt = async (req, res) => {
  try {
    let debts;
    if (req.user.user_role === "super_admin") {
      debts = await Debt.find({ store_ref_id: req.params.storeId });
    } else {
      debts = await Debt.find({
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
      { identifier: req.user.phone_number, user_role: req.user.user_role },
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
      debt = await Debt.find({ _id: req.params.transactionId });
    } else {
      debt = await Debt.find({
        _id: req.params.transactionId,
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
exports.markAsPaid = (req, res) => {
  let identifier = req.user.phone_number;

  UserModel.findOne({
    $or: [
      { identifier: req.user.phone_number, user_role: req.user.user_role },
      {
        "assistants.phone_number": req.user.phone_number,
        "assistants.user_role": req.user.user_role,
      },
    ],
  })
    .then((user) => {
      let stores = user.stores;
      stores.forEach((store) => {
        let customers = store.customers;
        customers.forEach((customer) => {
          let transactions = customer.transactions;
          transactions.forEach((transaction) => {
            if (transaction._id == req.params.transactionId) {
              transaction["status"] = true;
            }
          });
        });
      });
      user
        .save()
        .then((result) => {
          return res.status(201).json({
            sucess: true,
            message: "Operation Successful",
            data: {
              result,
            },
          });
        })
        .catch((err) => {
          res.status(500).json({
            sucess: false,
            message: "Unable to change status",
            error: {
              statusCode: 500,
              message: err.message,
            },
          });
        });
    })
    .catch((err) => {
      res.status(500).json({
        sucess: false,
        message: "Some server error occurred",
        error: {
          statusCode: 500,
          message: err.message,
        },
      });
    });
};

// exports.deleteById = async (req, res) => {
//   let identifier = req.user.phone_number;
//   let id = req.params.debtId;
//   UserModel.findOne({ identifier })
//     .then((user) => {
//       let stores = user.stores;
//       stores.forEach((store) => {
//         let customers = store.customers;
//         if (customers.length > 0) {
//           customers.forEach((customer) => {
//             let transactions = customer.transactions;
//             transactions.forEach((transaction, index) => {
//               let debts = transaction.debts;
//               debts.forEach((debt, index) => {
//                 if (debt._id == id) {
//                   debts.splice(index, 1);
//                 }
//               });
//             });
//           });
//         }
//       });

//       user
//         .save()
//         .then((result) => {
//           res.status(201).json({
//             success: true,
//             message: "Debt deleted successfully",
//             data: {
//               statusCode: 201,
//               Message: "Debt deleted successfully",
//             },
//           });
//         })
//         .catch((err) => {
//           res.status(404).json({
//             sucess: false,
//             message: "Couldn't remove debt",
//             error: {
//               statusCode: 404,
//               message: err.message,
//             },
//           });
//         });
//     })
//     .catch((err) => {
//       res.status(404).json({
//         sucess: false,
//         message: "Couldn't find user or some server error occurred",
//         error: {
//           statusCode: 404,
//           message: err.message,
//         },
//       });
//     });
// };

// exports.assistantView = (req, res) => {
//   console.log("starting");
//   const identifier = req.user.phone_number;
//   let data = [];

//   UserModel.findOne({ identifier })
//     .then((user) => {
//       let assistants = user.assistants;
//       //loop to search for all debt linked to a particular assistant
//       assistants.forEach((assistant) => {
//         let assistantName;
//         let assistantDebt = [];
//         let stores = user.stores;
//         stores.forEach((store) => {
//           if (assistant.store_id == store._id) {
//             assistantName = assistant.name;
//             let customers = store.customers;
//             customers.forEach((customer) => {
//               let transactions = customer.transactions;
//               transactions.forEach((transaction) => {
//                 if (
//                   transaction.assistant_inCharge == assistant._id &&
//                   transaction.type.toLowerCase() == "debt"
//                 ) {
//                   assistantDebt.push(transaction);
//                   console.log(transaction);
//                 }
//               });
//             });
//           }
//         });
//         //object to hold the found details
//         let obj = {};
//         obj["assistantName"] = assistantName;
//         obj["assistant_id"] = assistant._id;

//         obj["debt"] = assistantDebt;

//         //adding the found data to the data array to be displayed
//         data.push(obj);
//       });
//       res.status(200).json({
//         result: data,
//       });
//     })
//     .catch((err) => {
//       res.send(err);
//     });
// };

//Regex for validating phone number
let regex = /^\+(?:[0-9] ?){6,14}[0-9]$/;

// Send reminder route
exports.send = (req, res) => {
  const { transaction_id, message } = req.body;

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
  let identifier = req.user.phone_number;
  let to, store_name, amount, reminder_message;

  UserModel.findOne({
    $or: [
      { identifier: req.user.phone_number, user_role: req.user.user_role },
      {
        "assistants.phone_number": req.user.phone_number,
        "assistants.user_role": req.user.user_role,
      },
    ],
  })
    .then((user) => {
      let found = false;
      user.stores.forEach((store) => {
        store.customers.forEach((customer) => {
          customer.transactions.forEach((transaction) => {
            if (transaction._id == transaction_id) {
              found = true;
              to = customer.phone_number;
              amount = transaction.total_amount;
              store_name = store.store_name;
            }
          });
        });
      });

      if (found == false) {
        return res.status(400).json({
          success: false,
          message: `Customer with transaction id ${transaction_id} not found`,
        });
      }

      if (message == undefined) {
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

      const sms = africastalking.SMS;
      sms
        .send({
          to,
          message: reminder_message,
          enque: true,
        })
        .then((response) => {
          console.log(response);
          if (response.SMSMessageData.Message == "Sent to 0/1 Total Cost: 0") {
            res.status(200).json({
              success: false,
              Message: "Invalid Phone Number",
            });
          } else {
            res.status(200).json({
              success: true,
              Message: "Reminder sent",
              details: {
                to,
                reminder_message,
              },
              response,
            });
          }
        })
        .catch((err) => {
          console.log(err);
          res.send(err);
        });
    })
    .catch((err) => {
      res.status(500).json({
        sucess: false,
        message: "Something Went wrong",
        error: {
          statusCode: 500,
          message: err.message,
        },
      });
    });
};

// Schedule reminder route
exports.schedule = (req, res) => {
  const { transaction_id, message, scheduleDate, time } = req.body;

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
  let identifier = req.user.phone_number;
  let to, store_name, amount, reminder_message;

  UserModel.findOne({
    $or: [
      { identifier: req.user.phone_number, user_role: req.user.user_role },
      {
        "assistants.phone_number": req.user.phone_number,
        "assistants.user_role": req.user.user_role,
      },
    ],
  })
    .then((user) => {
      user.stores.forEach((store) => {
        store.customers.forEach((customer) => {
          customer.transactions.forEach((transaction) => {
            if (transaction._id == transaction_id) {
              to = customer.phone_number;
              amount = transaction.total_amount;
              store_name = store.store_name;
            }
          });
        });
      });

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
    })
    .catch((err) => {
      res.status(500).json({
        sucess: false,
        message: "Something went wrong",
        error: {
          statusCode: 500,
          message: err.message,
        },
      });
    });
};
