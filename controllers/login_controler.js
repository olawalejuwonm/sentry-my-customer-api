const jwt = require("jsonwebtoken");
const bCrypt = require("bcryptjs");
const { body } = require("express-validator/check");

const UserModel = require("../models/store_admin");
const AssistantModel = require("../models/storeAssistant");
const CustomerModel = require("../models/customer");

exports.validate = (method) => {
  switch (method) {
    case "login": {
      return [body("phone_number").isInt(), body("password")];
    }
  }
};

module.exports.errorHandler = (error, res) => {
  let message = "Internal Server Error.";
  let status = 500;
  if (error.name && error.name.toLowerCase().includes("validationerror")) {
    message = "request missing required fields";
    status = 422;
  }
  if (error.name && error.name.toLowerCase().includes("casterror")) {
    message = "invalid id";
    status = 400;
  }
  console.log("The Error", error, "The response", res)
  return res.status(status).json({
    success: false,
    message,
    error: {
      statusCode: status,
      message: error.message,
      description: {
        stack: error.stack,
        ...error,
      },
    },
  });
};

//  TODO: Change expiry back to 1h
module.exports.signToken = (data) =>
  jwt.sign(data, process.env.JWT_KEY, {
    expiresIn: "24h",
  });
const loginAssistant = async ({ identifier, password }, res) => {
  let assistant = await AssistantModel.findOne({ phone_number: identifier });
  if (assistant && (await bCrypt.compare(password, assistant.password))) {
    const apiToken = module.exports.signToken({
      phone_number: assistant.phone_number,
      password: password,
      user_role: assistant.user_role,
      _id: assistant._id,
    });
    assistant.api_token = apiToken;
    assistant = await assistant.save();
    return res.status(200).json({
      success: true,
      message: "You're logged in successfully.",
      data: {
        statusCode: 200,
        message: "Store Assistant logged in successfully.",
        user: {
          ...assistant.toObject(),
          api_token: apiToken,
        },
      },
    });
  }
  return res.status(401).json({
    success: false,
    message: "invalid credentials",
    error: {
      statusCode: 401,
    },
  });
};
//  Login User
module.exports.loginUser = async (req, res) => {
  const { password, phone_number: identifier } = req.body;
  try {
    let user = await UserModel.findOne({ identifier });
    if (user && (await bCrypt.compare(password, user.local.password))) {
      const apiToken = module.exports.signToken({
        phone_number: user.identifier,
        password: user.local.password,
        user_role: user.local.user_role,
        _id: user._id,
      });
      user.api_token = apiToken;
      user = await user.save();
      res.status(200).json({
        success: true,
        message: "You're logged in successfully.",
        data: {
          statusCode: 200,
          user,
        },
      });
    }
    return res.status(401).json({
      success: false,
      message: "invalid credentials",
      error: {
        statusCode: 401,
      },
    });
  } catch (error) {
    module.exports.errorHandler(error, res);
  }
};

//  Login Assistant
module.exports.loginAssistant = async (req, res) => {
  const { password, phone_number: identifier } = req.body;
  try {
    await loginAssistant({ identifier, password }, res);
  } catch (error) {
    module.exports.errorHandler(error, res);
  }
};

//  Login Customer
module.exports.loginCustomer = async (req, res, next) => {
  const { name, phone_number } = req.body;

  //  Get instance of the
  const user = CustomerModel({
    name,
    phone_number,
  });

  //  Check if the users phone persists in the DB
  await CustomerModel.findOne({ phone_number: user.phone_number })
    .then((userExist) => {
      if (userExist) {
        //  Go ahead to generate a login api_token for subsequent authentication..
        const apiToken = module.exports.signToken({
          phone_number: userExist.phone_number,
          name: userExist.name,
          _id: userExist._id,
        });

        res.status(200).json({
          message: "You're logged in successfully.",
          api_token: apiToken,
          success: true,
          user: {
            _id: userExist._id,
            phone_number: userExist.phone_number,
            name: userExist.name,
          },
        });
      } else {
        res.json({
          message: "Invalid phone number.",
          success: false,
        });
      }
    })
    .catch((error) => {
      module.exports.errorHandler(error, res);
    });
};

module.exports.login;
