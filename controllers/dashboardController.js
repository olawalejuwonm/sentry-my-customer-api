const userModel = require("../models/user");
const storeAdminModel = require("../models/store_admin");
const storeAssistantModel = require("../models/storeAssistant");
const Stores = require("../models/store");
const customerModel = require("../models/customer");
const transactionModel = require("../models/transaction");

exports.storeAdminDashboard = async (req, res, next) => {
  const identifier = req.user.phone_number;
  const role = req.user.user_role;

  if (role != "store_admin") {
    if (role == "store_assistant") {
      var u = 1;
    } else {
      return next();
    }
  }

  const storeAdmin = await storeAdminModel.findOne({
    $or: [
      {
        identifier: req.user.phone_number,
        "local.user_role": req.user.user_role
      },
      {
        "assistants.phone_number": req.user.phone_number,
        "assistants.user_role": req.user.user_role
      }
    ]
  });
  if (!storeAdmin) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      error: {
        statusCode: 404,
        message: "User not found"
      }
    });
  }

  try {
    const data = {};
    const stores = await Stores.find({ store_admin_ref: storeAdmin._id });
    const assistants = await storeAssistantModel.find({
      store_admin_ref: storeAdmin._id
    });

    //get number of stores
    data.storeCount = stores.length;
    //get number of assisstants
    data.assistantCount = assistants.length;
    //initialize customer count, new customers and transactions
    data.customerCount = 0;
    data.newCustomers = [];
    data.transactions = [];
    data.recentTransactions = [];
    data.recentDebts = [];

    stores.forEach(async store => {
      //increment customer count by number of customers in each store
      const customers = await customerModel.find({ store_ref_id: store._id });
      data.customerCount = data.customerCount + customers.length;

      let date = new Date();
      //filter customers array to get all new customers
      const newCustomers = customers.filter(element => {
        return element.createdAt.toDateString() == date.toDateString();
      });
      if (newCustomers.length > 0) {
        //push in new customer details into new customers array
        newCustomers.forEach(element =>
          data.newCustomers.push({
            name: element.name,
            phone_number: element.phone_number,
            email: element.email
          })
        );
      }

      customers.forEach(async customer => {
        const transactions = await transactionModel.find({
          customer_ref_id: customer._id
        });
        //push in transaction details for each customer
        if (transactions.length != 0) {
          let obj = {};
          obj.storeName = store.store_name;
          obj.customerName = customer.name;
          //sort transactions by date
          obj.transactions = transactions.sort(compareTransactions);
          data.transactions.push(obj);

          transactions.forEach(transaction => {
            //push in details of each transaction
            let obj = {};
            obj.storeName = store.store_name;
            obj.customerName = customer.name;
            obj.transaction = transaction;
            data.recentTransactions.push(obj);

            if (
              transaction.type.toLowerCase() == "debt" &&
              transaction.status == false
            ) {
              //push in details of each debt
              let obj = {};
              obj.storeName = store.store_name;
              obj.customerName = customer.name;
              obj.debt = transaction;
              data.recentDebts.push(obj);
            }
          });
        }
      });
    });

    // sort transactions and debts by date in descending order
    data.transactions.sort(compareCustomers);
    data.recentTransactions.sort(compareRecentTransactions);
    data.recentDebts.sort(compareRecentDebts);

    return res.status(200).json({
      success: true,
      message: "Store Admin dashboard data",
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error
      }
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
        message: "User not found"
      }
    });
  }

  //   check if user is a super admin
  if (User.local.user_role !== "super_admin") {
    return res.status(401).json({
      success: false,
      message: "Unauthorised, resource can only accessed by Super Admin",
      error: {
        statusCode: 401,
        message: "Unauthorised, resource can only accessed by Super Admin"
      }
    });
  }
  try {
    let users = await storeAdminModel.find({});

    let data = {};
    data.storeAdminCount = users.length;
    data.storesCount = 0;
    data.assistantsCount = 0;
    data.customerCount = 0;
    data.totalDebt = 0;
    data.transactionCount = 0;
    data.totalTransactionAmount = 0;
    data.transactions = [];

    data.usersCount = 0;

    users.forEach(user => {
      let stores = user.stores;
      data.storesCount += stores.length;
      data.assistantsCount += user.assistants.length;
      stores.forEach(store => {
        let customers = store.customers;

        data.customerCount += customers.length;

        customers.forEach(customer => {
          let transactions = customer.transactions;
          data.transactionCount = transactions.length;

          transactions.forEach(transaction => {
            let obj = {};
            obj.storeName = store.store_name;
            obj.customerName = customer.name;
            obj.transaction = transaction;
            data.totalTransactionAmount += transaction.total_amount;

            data.transactions.push(obj);

            let debts = transaction.debts;
            debts.forEach(debt => {
              data.totalDebt += debt.amount;
            });
          });
        });
      });
    });

    // the total number of users should be = storeAdmin + customers + storeAssistants
    data.usersCount =
      data.storeAdminCount + data.customerCount + data.assistantsCount;

    // sort transactions
    data.transactions.sort(compareRecentTransactions);

    res.status(200).json({
      success: true,
      message: "Dashboard data",
      data
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message
      }
    });
  }
};

exports.storeAssistantDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data = {};

  const storeAdmin = await storeAdminModel.findOne({
    "assistants.phone_number": phone_number
  });
  if (!storeAdmin) {
    return res.status(404).json({
      success: false,
      message: "Store Admin not found",
      error: {
        statusCode: 404,
        message: "Store Admin not found"
      }
    });
  }
  try {
    const assistant = storeAdmin.assistants.find(
      assistant => assistant.phone_number == phone_number
    );
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
          message: "Assistant does not belong to a store"
        }
      });
    }
    const assistantStore = storeAdmin.stores.find(
      store => store._id == store_id
    );
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
    assistantStore.customers.forEach(customer => {
      data.customerCount += 1;
      customer.transactions.forEach(transaction => {
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
      data: data
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
      error: {
        statusCode: 500,
        message: error.message
      }
    });
  }
};

exports.customerDashboard = async (req, res) => {
  const phone_number = req.user.phone_number;
  const data = [];
  try {
    const storeAdmin = await storeAdminModel.aggregate([
      { $unwind: "$stores" },
      { $unwind: "$stores.customers" },
      { $match: { "stores.customers.phone_number": phone_number } }
    ]);

    if (storeAdmin.length == 0) {
      res.status(404).send({
        success: false,
        message: "Customer store has no admin",
        error: {
          statusCode: 400,
          message: "Customer store has no admin"
        }
      });
    }

    const store = storeAdmin[0].stores;
    if (!store) {
      res.status(404).send({
        success: false,
        message: "Customer does not belong to a store",
        error: {
          statusCode: 400,
          message: "Customer does not belong to a store"
        }
      });
    }

    if (storeAdmin.length == 1) {
      const customer = store.customers;
      //sort customer transactions and debts by date
      customer.transactions.sort(compareTransactions);
      if (customer.transactions.debts) {
        customer.transactions.debts.sort(compareTransactions);
      }
      res.status(200).send({
        success: true,
        message: "Customer dashboard data",
        data: storeAdmin
      });
    }

    storeAdmin.forEach(admin => {
      const store = admin.stores;
      const customer = store.customers;
      //sort customer transactions and debts by date
      customer.transactions.sort(compareTransactions);
      if (customer.transactions.debts) {
        customer.transactions.debts.sort(compareTransactions);
      }
      data.push(admin);
    });

    res.status(200).send({
      success: true,
      message: "Customer dashboard data",
      data: storeAdmin
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Internal server error",
      error: {
        statusCode: 500,
        message: error.message
      }
    });
  }
};

//utility functions
function compareTransactions(a, b) {
  //compares two time stamps and places the earlier timestamp before the other
  if (a.createdAt.getTime() > b.createdAt.getTime()) return -1;
  if (b.createdAt.getTime() < a.createdAt.getTime()) return 1;

  return 0;
}

function compareCustomers(a, b) {
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
}

function compareRecentTransactions(a, b) {
  //compares two time stamps and places the earlier timestamp before the other
  if (a.transaction.createdAt.getTime() > b.transaction.createdAt.getTime())
    return -1;
  if (b.transaction.createdAt.getTime() < a.transaction.createdAt.getTime())
    return 1;

  return 0;
}

function compareRecentDebts(a, b) {
  //compares two time stamps and places the earlier timestamp before the other
  if (a.debt.createdAt.getTime() > b.debt.createdAt.getTime()) return -1;
  if (b.debt.createdAt.getTime() < a.debt.createdAt.getTime()) return 1;

  return 0;
}
