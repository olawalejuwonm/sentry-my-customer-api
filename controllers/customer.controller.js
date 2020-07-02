const UserModel = require("../models/store_admin");
const CustomerModel = require("../models/customer");
const { body } = require('express-validator/check');

exports.validate = (method) => {
    switch (method) {
        case 'body': {
            return [
                body('name').isLength({ min: 3 }),
            ]
        }
    }
}

exports.create = async (req, res) => {
  const { id, name, phone_number, store_id } = req.body;
  
  UserModel.findById(id, (error, user) => {
    if (error) {
      return res.status(404).json({
        status: false,
        message: error.message,
        error: {
          code: 404,
          message: error.message
        }
      }); 
    }

    let store;
    try {
      store = user.stores.id(store_id);
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: error.message,
        error: {
          code: 400,
          message: error.message
        }
      }); 
    }

    if (store === null) {
      return res.status(404).json({
        status: false,
        message: "store not found",
        error: {
          code: 404,
          message: "store not found"
        }
      }); 
    }

    const newCustomer = new CustomerModel({
      name,
      phone_number
    });

    store.customers.push(newCustomer);

    newUser = user.save()
      .then((user) => {
        return res.status(201).json({
          status: true,
          message: "Customer Added",
          data: {
            customers: store.customers
          }
        }); 
      })
      .catch((error) => {
        return res.status(404).json({
          status: false,
          message: error.message,
          error: {
            code: 404,
            message: error.message
          }
        }); 
      });
  })
};

exports.getById = (req, res) => {
  try {
    Customer.findById(req.params.customerId, (error, customer) => {
      if (error) {
        res.status(404).send({
          status: false,
          message: error.message,
          error: {
            code: 404,
            message: error.message
          }
        });
      } else {
        res.status(200).json({
          status: true,
          message: "Customer was found",
          data: {
            customer
          }
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
      error: {
        code: 500,
        message: error.message
      }
    });
  }
};

exports.updateById = (req, res) => {
  Customer.updateOne({ _id: req.params.customerId }, { $set: {
    name: req.body.name,
    phone_number: req.body.phone,
  }})
    .exec()
    .then((result) => {
      res.status(200).json({
        status: true,
        message: "Customer was updated",
        data: {
          customer: {
            id: req.params.customerId,
            name: req.body.name,
            phone: req.body.phone,
          }
        }
      });
    })
    .catch((error) => {
      res.status(500).json({
        status: false,
        message: error.message,
        error: {
          code: 500,
          message: error.message
        }
      });
    });
};

exports.deleteById = (req, res) => {
  try {
    Customer.findByIdAndDelete(req.params.customerId, (error, customer) => {
      if (error) {
        res.status(404).json({
          status: false,
          //message: error.message,
        });
      } else if (!customer) {
        res.status(404).json({
          status: false,
          message: "Customer not found",
          error: {
            code: 404,
            message: "Customer not found"
          }
        });
      } else {
        res.status(200).json({
          status: true,
          message: "Customer was deleted",
          data: {
            customer: {
              id: customer._id,
              name: customer.name,
              phone: customer.phone_number,
            }
          },
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
      error: {
        code: 500,
        message: error.message
      }
    });
  }
};

exports.getAll = (req, res) => {
  const { id, store_id } = req.body;

  UserModel.findById(id, (error, user) => {
    if (error) {
      return res.status(404).json({
        status: false,
        message: error.message,
        error: {
          code: 404,
          message: error.message
        }
      }); 
    }

    let store;
    try {
      store = user.stores.id(store_id)
      
    } catch (error) {
      return res.status(400).json({
        status: false,
        message: error.message,
        error: {
          code: 400,
          message: error.message
        }
      }); 
    }


    if (store === null) {
      return res.status(404).json({
        status: false,
        message: "store not found",
        error: {
          code: 404,
          message: "store not found"
        }
      }); 
    }

    return res.status(200).json({
      status: true,
      message: "All customers",
      data: {
        customers: store.customers
      }
    }); 
    
  });
};

