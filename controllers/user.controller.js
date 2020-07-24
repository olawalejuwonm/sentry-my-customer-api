const User = require("../models/store_admin");
const StoreAssistant = require("../models/storeAssistant");
const Store = require("../models/store");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator/check");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const responseManager = require("../util/response_manager");
const util = require("../util/sort_data");
const DataUri = require("datauri/parser");
const path = require("path");
const { uploader } = require("./cloudinaryController");
const { errorHandler } = require("./login_controler");

exports.validate = (method) => {
  switch (method) {
    case "body": {
      return [
        body("phone_number").isInt(),
        body("name").matches(/^[0-9a-zA-Z ]{2,}$/, "i"),
      ];
    }

    case "password":
      return [
        body("old_password").isString(),
        body("new_password")
          .isString()
          .isLength({ min: 6 })
          .withMessage("Password must be 6 characters long"),
      ];

    case "store_admin": {
      return [
        body("phone_number").isInt(),
        body("first_name").isString(),
        body("last_name").isString(),
        body("email").isEmail(),
      ];
    }
  }
};

// Get all Users.
exports.allStoreAssistant = async (req, res) => {
  try {
    let assistants;
    if (req.user.user_role === "super_admin") {
      assitants = await StoreAssistant.find({}).select("-password").exec();
    } else {
      assistants = await StoreAssistant.find({ store_admin_ref: req.user._id })
        .select("-password")
        .exec();
    }
    return res.status(200).json({
      success: "true",
      message: "Store assistants retrieved successfully.",
      data: {
        status: 200,
        message: "Store assistants retrieved successfully.",
        assistants,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Add new StoreAdmin
exports.newStoreAdmin = async (req, res) => {
  const { name, email, password, phone_number } = req.body;
  try {
    let user = await User.findOne({ identifier: phone_number });
    if (user) {
      return res.status(200).json({
        success: false,
        message: "User already exist.",
        data: {
          status: 200,
          message: "User already exist.",
        },
      });
    }
    user = await User.create({
      identifier: phone_number,
      local: {
        name,
        phone_number,
        email,
        password,
      },
    });
    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      data: {
        status: 201,
        message: "User created successfully.",
        user,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Add new StoreAssistant
exports.newStoreAssistant = async (req, res) => {
  const { name, email, password, phone_number, store_id } = req.body;
  try {
    let store;
    if (req.user.user_role === "super_admin") {
      store = await Store.findOne({ _id: store_id });
    } else {
      store = await Store.findOne({
        store_admin_ref: req.user._id,
        _id: store_id,
      });
    }
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Store does not exist.",
        data: {
          status: 404,
          message: "Store does not exist.",
        },
      });
    }
    let store_assistant = await StoreAssistant.findOne({
      store_admin_ref: req.user._id,
      phone_number,
    });
    if (store_assistant) {
      return res.status(409).json({
        success: false,
        message: "assistant already exists",
        error: {
          statusCode: 409,
        },
      });
    }
    store_assistant = await StoreAssistant.create({
      store_admin_ref: req.user._id,
      name,
      phone_number,
      store_id,
      email,
      password: await bcrypt.hash(password, 10),
    });
    await store.save();
    return res.status(201).json({
      success: true,
      message: "StoreAssistant created successfully.",
      data: {
        status: 201,
        message: "StoreAssistant created successfully.",
        store_assistant,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

// Get Single Store Assistant with assistant_id.
exports.getSingleStoreAssistant = async (req, res) => {
  try {
    const store_assistant = await StoreAssistant.findOne({
      _id: req.params.assistant_id,
    })
      .select("-password")
      .exec();
    if (!store_assistant) {
      return res.status(404).json({
        success: false,
        message: "cannot find assistant",
        error: {
          statusCode: 404,
        },
      });
    }
    return res.status(200).json({
      success: true,
      message: "Store Assistant retrieved successfully.",
      data: {
        status: 200,
        message: "Store Assistant retrieved successfully.",
        store_assistant,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

//  Update Single Store Assistant with assistant_id.
exports.updateSingleStoreAssistant = async (req, res) => {
  const { name, phone_number, email, store_id } = req.body;
  try {
    let store_assistant = await StoreAssistant.findOne({
      _id: req.params.assistant_id,
      store_admin_ref: req.user._id,
    });
    if (!store_assistant) {
      return res.status(404).json({
        success: false,
        message: "cannot find assistant",
        error: {
          statusCode: 404,
        },
      });
    }
    store_assistant.name = name || store_assistant.name;
    store_assistant.phone_number = phone_number || store_assistant.phone_number;
    store_assistant.email = email || store_assistant.email;
    store_assistant.store_id = store_id || store_assistant.store_id;
    store_assistant = await store_assistant.save();
    return res.status(201).json({
      success: true,
      message: "Store Assistant updated successfully.",
      data: {
        status: 201,
        message: "Store Assistant updated successfully.",
        store_assistant,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};

//  Delete Single Store Assistant with assistant_id.
exports.deleteSingleStoreAssistant = async (req, res) => {
  try {
    let store_assistant = await StoreAssistant.findOne({
      _id: req.params.assistant_id,
      store_admin_ref: req.user._id,
    });
    if (!store_assistant) {
      return res.status(404).json({
        success: false,
        message: "cannot find assistant",
        error: {
          statusCode: 404,
        },
      });
    }
    await store_assistant.remove();
    return res.status(200).json({
      success: "true",
      message: "Assistant deleted successfully.",
      error: {
        statusCode: 200,
        message: "Assistant deleted successfully.",
        data: store_assistant,
      },
    });
  } catch (error) {
    errorHandler(error, res);
  }
};
//#endregion

exports.updateStoreAdmin = (req, res) => {
  const identifier = req.user.phone_number;
  let { first_name, last_name, email } = req.body;
  User.findOne({ identifier })
    .then(async (user) => {
      user.local.first_name = first_name || user.local.first_name;
      user.local.last_name = last_name || user.local.last_name;
      user.local.email = email || user.local.email;

      user
        .save()
        .then((result) => {
          res.status(200).json({
            success: true,
            message: "Store admin updated successfully",
            data: {
              store_admin: result,
            },
          });
        })
        .catch((error) => {
          res.status(500).json({
            status: false,
            message: error.message,
            error: {
              code: 500,
              message: error.message,
            },
          });
        });
    })
    .catch((error) => {
      res.status(500).json({
        status: false,
        message: error.message,
        error: {
          code: 500,
          message: error.message,
        },
      });
    });
};

exports.updatePassword = (req, res) => {
  const errorResponse = (err) => {
    return res.status(500).json({
      success: false,
      message: "Error updating password",
      status: 500,
      error: {
        statusCode: 500,
        message: err.message,
      },
    });
  };

  try {
    const { old_password, new_password, confirm_password } = req.body;
    const identifier = req.user.phone_number;

    User.findOne({ identifier })
      .then((user) => {
        if (confirm_password !== new_password)
          return res.json({
            sucess: false,
            message: "confirm_password should match new_password",
            error: {
              statusCode: 400,
            },
          });

        bcrypt.compare(old_password, user.local.password, function (
          err,
          result
        ) {
          if (err) {
            return errorResponse(err);
          }
          if (!result)
            return errorResponse({ message: "Passwords don't match" });
          bcrypt.hash(new_password, 10, (err, hash) => {
            user.local.password = hash;

            user
              .save()
              .then((result) => {
                res.status(200).json({
                  success: true,
                  message: "Password reset successful",
                  data: {
                    statusCode: 200,
                    message: "Password reset successful",
                  },
                });
              })
              .catch((err) => errorResponse(err));
          });
        });
      })
      .catch((err) => errorResponse(err));
  } catch (error) {
    errorResponse(error);
  }
};

exports.forgot = async (req, res) => {
  await crypto.randomBytes(20, function (err, buf) {
    let token = buf.toString("hex");
    if (err) {
      next(err);
    }

    User.findOne({ identifier: req.body.phone_number }, function (err, user) {
      if (err) {
        return res.status(404).json({
          success: "false",
          message: "Error finding user in DB",
          data: {
            statusCode: 404,
            error: err.message,
          },
        });
      }
      if (!user) {
        return res.status(404).json({
          success: "false",
          message: "User Not Found. Make sure you inputted right phone number",
          data: {
            statusCode: 404,
            error: "User Dosen't Exist",
          },
        });
      }
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      user.save(
        (err) => {
          if (err) {
            return res.status(404).json({
              success: "false",
              message: "Error saving user",
              data: {
                statusCode: 404,
                error: err.message,
              },
            });
          }
          let smtpTransport = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "fundmycustomer@gmail.com",
              pass: "Omo@1234",
            },
          });
          let mailOptions = {
            to: user.local.email,
            from: "passwordreset@mycustomer.com",
            subject: "Mycustomer Password Reset",
            text:
              "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
              "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
              "http://" +
              req.headers.host +
              "/store_admin/forgot-password/" +
              token +
              "\n\n" +
              "If you did not request this, please ignore this email and your password will remain unchanged.\n",
          };
          smtpTransport.sendMail(mailOptions, function (err, info) {
            if (err) {
              return res.status(400).json({
                success: "false",
                message: "Error sending email.Possibly User has no email",
                data: {
                  statusCode: 400,
                  error: err.message,
                },
              });
            }
            return res.status(200).json({
              success: "true",
              message: "Email Sent" + info.response,
              data: {
                statusCode: 200,
                message:
                  "An e-mail has been sent to " +
                  user.local.email +
                  " with further instructions.",
              },
            });
            // if (err) {
            //   next(err)
            // }
            // res.redirect('/store_admin/forgot-password');
          });
        },
        (user) => {
          let smtpTransport = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: "openhand95@gmail.com",
              pass: "Juwon@1234",
            },
          });
          let mailOptions = {
            to: user.local.email,
            from: "passwordreset@mycustomer.com",
            subject: "Mycustomer Password Reset",
            text:
              "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
              "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
              "http://" +
              req.headers.host +
              "/reset/" +
              token +
              "\n\n" +
              "If you did not request this, please ignore this email and your password will remain unchanged.\n",
          };
          smtpTransport.sendMail(mailOptions, function (err, info) {
            if (err) {
              return res.status(400).json({
                success: "false",
                message: "Error sending email. Possibly User has no email",
                data: {
                  statusCode: 400,
                  error: err.message,
                },
              });
            }
            return res.status(200).json({
              success: "true",
              message: "Email Sent" + info.response,
              data: {
                statusCode: 200,
                message:
                  "An e-mail has been sent to " +
                  user.local.email +
                  " with further instructions.",
              },
            });
            // if (err) {
            //   next(err)
            // }
            // res.redirect('/store_admin/forgot-password');
          });
        }
      );
    });
  });
};

exports.tokenreset = async (req, res) => {
  if (req.body.password === undefined || req.body.password == "") {
    return res.status(400).json({
      success: "false",
      message: "Password Can't Be Empty",
      data: {
        statusCode: 400,
        error: "password is required",
      },
    });
  }
  const password = await bcrypt.hash(req.body.password, 10);
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (err) {
        return res.status(400).json({
          success: "false",
          message: "Error From DB",
          data: {
            statusCode: 400,
            error: err.message,
          },
        });
      }
      if (!user) {
        return res.status(400).json({
          success: "false",
          message: "Password Reset Token Is Invalid or has expired",
          data: {
            statusCode: 400,
            error: "Invalid Token",
          },
        });
      }
      user.local.password = password;
      user.resetPasswordToken = undefined; //turn reset password to something not needed
      user.resetPasswordExpires = undefined;

      user.save(function (err) {
        if (err) {
          return res.status(400).json({
            success: "false",
            message: "Couldn't save to DB",
            data: {
              statusCode: 400,
              error: err.message,
            },
          });
        }
        let smtpTransport = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "openhand95@gmail.com",
            pass: "Juwon@1234",
          },
        });
        let mailOptions = {
          to: user.local.email,
          from: "mycustomer@customer.com",
          subject: "Your MyCustomer Account password has been changed",
          text:
            "Hello,\n\n" +
            "This is a confirmation that the password for your account " +
            user.email +
            " has just been changed.\n",
        };
        smtpTransport.sendMail(mailOptions, function (err) {
          if (err) {
            return res.status(200).json({
              success: "false",
              message:
                "Password Changed Succesfully. But Error Sending Email Notification",
              data: {
                statusCode: 200,
                error: err.message,
              },
            });
          }
          return res.status(200).json({
            success: "true",
            message: "Email Notification Sent",
            data: {
              statusCode: 200,
              message: "Password Changed Succesfully",
            },
          });
        });
      });
    }
  );
};

exports.updatePicture = (req, res) => {
  // check if an image is uploaded
  if (!req.file) {
    return responseManager.failure(res, { message: "Upload a picture" }, 400);
  }

  // use dataUri to convert image from buffer to dataUri
  let dturi = new DataUri();

  let dataUri = dturi.format(
    path.extname(req.file.originalname),
    req.file.buffer
  );
  const file = dataUri.content;
  // upload the image using cloudinary
  uploader
    .upload(file)
    .then((result) => {
      // update the user image to this image
      User.updateOne(
        { identifier: req.user.phone_number },
        { $set: { image: result.url } }
      )
        .then((dbResult) => {
          // if the user is not found throw an error
          if (!dbResult.n) {
            return responseManager.failure(
              res,
              { message: "User not found" },
              404
            );
          }
          // successful response
          return responseManager.success(
            res,
            { message: `Image updated. New imgage url : ${result.url}` },
            200
          );
        })
        .catch((err) => {
          console.log(err);
          return responseManager.failure(res, {
            message: "Picture not set. Unexpected error occured",
          });
        });
    })
    .catch((err) => {
      console.log(err);
      return responseManager.failure(res, {
        message: "Picture not set. Unexpected error occured",
      });
    });
};

exports.deactivateUser = async (req, res) => {
  const id = req.user.phone_number;
  const storeAdminPhoneNumber = req.params.phone_number;

  const user = await User.findOne({ identifier: id });

  //   check if user exists
  if (!user) {
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
  if (user.local.user_role !== "super_admin") {
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
    let fuser = await User.findOne({ identifier: storeAdminPhoneNumber });
    if (!fuser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          statusCode: 404,
          message: "User not found",
        },
      });
    }
    fuser.local.is_active = false;
    await fuser.save();
    res.status(200).json({
      success: true,
      message: "User Deactivated",
      fuser,
    });
  } catch (err) {
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

exports.activateUser = async (req, res) => {
  const id = req.user.phone_number;
  const storeAdminPhoneNumber = req.params.phone_number;

  const user = await User.findOne({ identifier: id });

  //   check if user exists
  if (!user) {
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
  if (user.local.user_role !== "super_admin") {
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
    let fuser = await User.findOne({ identifier: storeAdminPhoneNumber });
    if (!fuser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        error: {
          statusCode: 404,
          message: "User not found",
        },
      });
    }
    fuser.local.is_active = true;
    await fuser.save();
    res.status(200).json({
      success: true,
      message: "User Activated",
      fuser,
    });
  } catch (err) {
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

// super admin access to view all store admins in the database

exports.getAllStoreAdmin = async (req, res, next) => {
  let id = req.user.phone_number;
  let user = await User.findOne({ identifier: id });
  // check if user exists
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      error: {
        statusCode: 404,
        message: "User not found",
      },
    });
  }

  // check if user is a super admin
  if (user.local.user_role !== "super_admin") {
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
    let storeAdmins = await User.find({});
    res
      .status(200)
      .json({ success: true, message: "All Store Admins", data: storeAdmins });
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
