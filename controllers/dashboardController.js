const Debts = require("../models/debt_reminders");
const storeAdminModel = require("../models/store_admin");
const storeAssistantModel = require("../models/storeAssistant");
const Stores = require("../models/store");
const customerModel = require("../models/customer");
const transactionModel = require("../models/transaction");
const transaction = require("../models/transaction");

const util = {
  //utility functions
  compareTransactions: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.createdAt.getTime() > b.createdAt.getTime()) return -1;
    if (b.createdAt.getTime() < a.createdAt.getTime()) return 1;

    return 0;
  },

  compareCustomers: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (
      a.transactions[0].createdAt.getTime() >
      b.transactions[0].createdAt.getTime()
    )
      return -1;
    if (
      b.transactions[0].createdAt.getTime() <
      a.transactions[0].createdAt.getTime()
    )
      return 1;

    return 0;
  },

  compareRecentTransactions: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.transaction.createdAt.getTime() > b.transaction.createdAt.getTime())
      return -1;
    if (b.transaction.createdAt.getTime() < a.transaction.createdAt.getTime())
      return 1;

    return 0;
  },

  compareRecentDebts: (a, b) => {
    //compares two time stamps and places the earlier timestamp before the other
    if (a.debt.createdAt.getTime() > b.debt.createdAt.getTime()) return -1;
    if (b.debt.createdAt.getTime() < a.debt.createdAt.getTime()) return 1;

    return 0;
  },
};

exports.storeAdminDashboard = async (req, res, next) => {
  const role = req.user.user_role;

  if (role != "store_admin") {
    // if (role == "store_assistant") {
    //   var u = 1;
    // } else {
    //   return next();
    // }
    res.status(401).send({
      success: false,
      message: "User not authorized to access store admin dashboard",
      error: {
        statusCode: 401,
        message: "User not authorized to access store admin dashboard",
      },
    });
  }

  try {
    const data = {};
    const stores = await Stores.find({ store_admin_ref: req.user._id });

    //get number of stores
    data.storeCount = stores.length;
    //get number of assisstants
    data.assistantCount = await storeAssistantModel.countDocuments({
      store_admin_ref: req.user._id,
    });
    //initialize customer count, new customers and transactions
    data.customerCount = await stores.reduce(
      async (acc, cur) =>
        (await acc) +
        (await customerModel.countDocuments({ store_ref_id: cur._id })),
      0
    );
    data.newCustomers = (
      await stores.reduce(
        async (acc, cur) => [
          ...(await acc),
          ...(await customerModel.find({ store_ref_id: cur._id })),
        ],
        []
      )
    )
      .sort(util.compareCustomers)
      .slice(0, 15);
    data.transactions = (
      await transactionModel
        .find({
          store_admin_ref: req.user._id,
        })
        .populate({ path: "store_ref_id" })
        .exec()
    ).reduce((acc, cur) => {
      return [
        ...acc,
        {
          transaction: {
            ...cur.toObject(),
            store_ref_id: (cur.store_ref_id && cur.store_ref_id._id) || "",
          },
          storeName:
            (cur.store_ref_id && cur.store_ref_id.store_name) ||
            "Unknown store",
        },
      ];
    }, []);
    data.recentTransactions = data.transactions
      .sort(util.compareRecentTransactions)
      .slice(0, 15);
    data.recentDebts = (
      await transactionModel.find({
        store_admin_ref: req.user._id,
        type: "debt",
      })
    )
      .reduce((acc, cur) => {
        if (!cur) return acc;
        return [
          ...acc,
          {
            debt: {
              ...cur.toObject(),
              store_ref_id: (cur.store_ref_id && cur.store_ref_id._id) || "",
            },
            storeName:
              (cur.store_ref_id && cur.store_ref_id.store_name) ||
              "Unknown store",
          },
        ];
      }, [])
      .sort(util.compareRecentDebts)
      .slice(0, 15);
    data.debtCount = (
      await transactionModel.find({
        store_admin_ref: req.user._id,
        type: "debt",
      })
    ).reduce((acc, cur) => {
      if (!cur) return acc;
      return [
        ...acc,
        {
          debt: cur.toObject(),
          storeName:
            (cur.store_ref_id && cur.store_ref_id.store_name) ||
            "Unknown store",
        },
      ];
    }, []);
    data.debtAmount = parseInt(
      data.debtCount.reduce(
        (acc, cur) => acc + parseFloat(cur.debt.amount) || 0,
        0
      )
    );
    data.revenueCount = data.debtCount.reduce((acc, cur) => {
      if (!cur.debt.status) return acc;
      return acc + 1;
    }, 0);
    data.revenueAmount = parseInt(
      data.debtCount.reduce((acc, cur) => {
        if (!cur.debt.status) return acc;
        return acc + parseFloat(cur.debt.amount) || 0;
      }, 0)
    );
    data.receivablesCount = data.transactions.reduce((acc, cur) => {
      if (cur.transaction.type !== "receivables") return acc;
      return acc + 1;
    }, 0);
    data.receivablesAmount = parseInt(
      data.transactions.reduce((acc, cur) => {
        if (cur.transaction.type !== "receivables") return acc;
        return acc + parseFloat(cur.transaction.amount) || 0;
      }, 0)
    );
    data.amountForCurrentMonth = parseInt(
      data.debtCount.reduce((acc, cur) => {
        if (!cur.debt.status) return acc;
        let date = new Date();
        let transactionDate = new Date(cur.debt.createdAt);
        if (
          date.getMonth() == transactionDate.getMonth() &&
          date.getFullYear() == transactionDate.getFullYear()
        ) {
          return acc + parseFloat(cur.debt.amount) || 0;
        }
        return acc;
      }, 0)
    );
    data.amountForPreviousMonth = data.debtCount.reduce((acc, cur) => {
      if (!cur.debt.status) return acc;
      let date = new Date();
      let transactionDate = new Date(cur.debt.createdAt);
      if (
        date.getMonth() - 1 == transactionDate.getMonth() &&
        date.getFullYear() == transactionDate.getFullYear()
      ) {
        return acc + parseFloat(cur.debt.amount) || 0;
      }
      return acc;
    }, 0);
    data.debtCount = data.debtCount.length;

    res.status(200).json({
      success: true,
      message: "Store Admin dashboard data",
      data: data,
    });

    // sort transactions and debts by date in descending order
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error,
      },
    });
  }
};

exports.superAdminDashboard = async (req, res) => {
  const id = req.user.phone_number;

  const User = await storeAdminModel.findOne({ identifier: id });

  //   check if user exists
  if (!User) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      error: {
        statusCode: 404,
        message: "User not found",
      },
    });
  }

  //   check if user is a super admin
  if (User.local.user_role !== "super_admin") {
    return res.status(401).json({
      success: false,
      message: "Unauthorised, resource can only accessed by Super Admin",
      error: {
        statusCode: 401,
        message: "Unauthorised, resource can only accessed by Super Admin",
      },
    });
  }
  try {
    let users = await storeAdminModel.find({});
    let stores = await Stores.find({});
    let assistants = await storeAssistantModel.find({});
    let customers = await customerModel.find({});
    let transactions = await transactionModel.find({});

    let data = {};
    data.storeAdminCount = users.length;
    data.storesCount = stores.length;
    data.assistantsCount = assistants.length;
    data.customerCount = customers.length;
    data.totalDebt = 0;
    data.transactionCount = transactions.length;
    data.totalTransactionAmount = 0;
    // data.transactions = [];

    data.usersCount = 0;

    transactions.forEach((transaction) => {
      data.totalTransactionAmount += parseInt(transaction.total_amount);
      if (
        transaction.type.toLowerCase() == "debt" &&
        transaction.status == false
      ) {
        data.totalDebt += parseInt(transaction.total_amount);
      }
    });

    // the total number of users should be = storeAdmin + customers + storeAssistants
    data.usersCount =
      data.storeAdminCount + data.customerCount + data.assistantsCount;

    // sort transactions
    // data.transactions.sort(compareRecentTransactions);

    res.status(200).json({
      success: true,
      message: "Dashboard data",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message,
      },
    });
  }
};

exports.storeAssistantDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data = {};
  const assistant = await storeAssistantModel.findOne({
    phone_number: phone_number,
  });
  const storeAdmin = await storeAdminModel.findOne({
    _id: assistant.store_admin_ref,
  });
  if (!storeAdmin) {
    return res.status(404).json({
      success: false,
      message: "Store Admin not found",
      error: {
        statusCode: 404,
        message: "Store Admin not found",
      },
    });
  }
  try {
    data.name = assistant.name;
    data.email = assistant.email;
    data.phone_number = assistant.phone_number;

    const store_id = assistant.store_id;
    if (!store_id) {
      return res.status(404).json({
        success: false,
        message: "Assistant does not belong to a store",
        error: {
          statusCode: "",
          message: "Assistant does not belong to a store",
        },
      });
    }
    const assistantStore = await Stores.find({ _id: store_id });
    const customers = await customerModel.find({ store_ref_id: store_id });
    data.storeName = assistantStore.store_name;
    data.storeAddress = assistantStore.shop_address;
    data.customerCount = 0;
    data.transactionCount = 0;
    data.recentTransactions = [];
    data.debtCount = 0;
    data.debtAmount = 0;
    data.revenueCount = 0;
    data.revenueAmount = 0;
    data.receivablesCount = 0;
    data.receivablesAmount = 0;
    customers.forEach(async (customer) => {
      data.customerCount += 1;
      const transactions = await transactionModel.find({
        customer_ref_id: customer._id,
      });
      transactions.forEach((transaction) => {
        if (transaction.assistant_inCharge == assistant._id) {
          data.transactionCount += 1;

          let obj = {};
          obj.customerName = customer.name;
          obj.storeName = assistantStore.store_name;
          obj.transaction = transaction;
          data.recentTransactions.push(obj);

          if (transaction.type.toLowerCase() == "debt") {
            data.debtCount += 1;
            try {
              data.debtAmount += parseFloat(transaction.amount);
            } catch (error) {
              data.debtAmount += 0;
            }
          }
          if (
            transaction.type.toLowerCase() == "debt" &&
            transaction.status == true
          ) {
            data.revenueCount += 1;
            try {
              data.revenueAmount += parseFloat(transaction.amount);
            } catch (error) {
              data.revenueAmount += 0;
            }
          }
          if (transaction.type.toLowerCase() == "paid") {
            data.revenueCount += 1;
            try {
              data.revenueAmount += parseFloat(transaction.amount);
            } catch (error) {
              data.revenueAmount += 0;
            }

            let date = new Date();
            let transactionDate = new Date(transaction.createdAt);
            //get revenue for current month
            if (date.getMonth() == transactionDate.getMonth() && 
              date.getFullYear() == transactionDate.getFullYear()
            ) 
            {
              try {
                data.amountForCurrentMonth += parseFloat(transaction.amount);
              } catch (error) {
                data.amountForCurrentMonth += 0;
              }
            }

            //get revenue for previous month
            if (date.getMonth()-1 == transactionDate.getMonth() && 
              date.getFullYear() == transactionDate.getFullYear()
            ) {
              try {
                data.amountForPreviousMonth += parseFloat(transaction.amount);
              } catch (error) {
                data.amountForPreviousMonth += 0;
              }
            }
          }
          if (transaction.type.toLowerCase() == "receivables") {
            data.receivablesCount += 1;
            try {
              data.receivablesAmount += parseFloat(transaction.amount);
            } catch (error) {
              data.receivablesAmount += 0;
            }
          }
        }
      });
    });
    //sort transactions by time
    data.recentTransactions.sort(compareRecentTransactions);

    return res.status(200).json({
      success: true,
      message: "Store Assistant dashboard data",
      data: data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
      error: {
        statusCode: 500,
        message: error.message,
      },
    });
  }
};

exports.customerDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data = {};
  try {
    const customer = await customerModel.findOne({
      phone_number: phone_number,
    });
    if (!customer) {
      res.status(404).send({
        success: false,
        message: "Customer does not exist",
        error: {
          statusCode: 400,
          message: "Customer does not exist",
        },
      });
    }

    const store = await Stores.findOne({ _id: customer.store_ref_id });

    if (!store) {
      res.status(404).send({
        success: false,
        message: "Customer does not belong to a store",
        error: {
          statusCode: 400,
          message: "Customer does not belong to a store",
        },
      });
    }

    const transactions = await transactionModel.find({
      customer_ref_id: customer._id,
    });
    //sort customer transactions and debts by date
    transactions.sort(compareTransactions);
    if (transactions.debts) {
      transactions.debts.sort(compareTransactions);
    }
    data.customer = customer;
    data.store = store;
    data.transactions = transactions;
    res.status(200).send({
      success: true,
      message: "Customer dashboard data",
      data: data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message,
      },
    });
  }
};

// //utility functions
// function compareTransactions(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (a.createdAt.getTime() > b.createdAt.getTime()) return -1;
//   if (b.createdAt.getTime() < a.createdAt.getTime()) return 1;

//   return 0;
// }

// function compareCustomers(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (
//     a.transactions[0].createdAt.getTime() >
//     b.transactions[0].createdAt.getTime()
//   )
//     return -1;
//   if (
//     b.transactions[0].createdAt.getTime() <
//     a.transactions[0].createdAt.getTime()
//   )
//     return 1;

//   return 0;
// }

// function compareRecentTransactions(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (a.transaction.createdAt.getTime() > b.transaction.createdAt.getTime())
//     return -1;
//   if (b.transaction.createdAt.getTime() < a.transaction.createdAt.getTime())
//     return 1;

//   return 0;
// }

// function compareRecentDebts(a, b) {
//   //compares two time stamps and places the earlier timestamp before the other
//   if (a.debt.createdAt.getTime() > b.debt.createdAt.getTime()) return -1;
//   if (b.debt.createdAt.getTime() < a.debt.createdAt.getTime()) return 1;

//   return 0;
// }
