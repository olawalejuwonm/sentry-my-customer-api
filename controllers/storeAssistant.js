const bCrypt = require("bcryptjs");

const StoreAssistantModel = require('../models/storeAssistant');
const UserModel = require("../models/store_admin");


//  Create a new Store Assistant.
exports.createStoreAssistant = (req, res, next) => {
    const { name, phone_number, store_id } = req.body;
    const id = req.user.phone_number;

    //  Create an instance of the StoreAssistant.
    const newStoreAssistantData = new StoreAssistantModel({
        name: name,
        phone_number: phone_number,
        store_id: store_id
    });

    //  Validate the request Body.
    if (!name || !phone_number || !store_id) {
        return res.status(400).json({
            success: false,
            message: "name, phone_number and store_id cannot be empty.",
            data: {
                status: 400,
                message: "name, phone_number and store_id cannot be empty.",
            },
        });
    }

    //  Querry the StoreAdmin table to get the recored that matches the given Store Admin identifier.
    UserModel.findOne({identifier: id})
        .then((user) => {

            if(user) {
                //  If user exit, extract the users phone_number and assign it to the newStoreAssistantData instance.
                const adminIdentity = user.local.phone_number;
                newStoreAssistantData.admin_identity = adminIdentity;

                //  Querry the StoreAssistant table to get the recored that matches the given Store Assistant phone_number.
                StoreAssistantModel.findOne({phone_number})
                    .then((storeAssistant) => {
                        //  If the Store Assistant already exist, return this "if" block.
                        if(storeAssistant) {
                            return res.status(200).json({
                                success: false,
                                message: "Store assistant already exist.",
                                data: {
                                    status: 200,
                                    message: "Store assistant already exist.",
                                },
                            })
                        }
                        
                        //console.log(storeAssistant.password);
                        console.log(newStoreAssistantData.password);
                        
                        bCrypt.hash(newStoreAssistantData.password, 10)
                            .then((hashedPassword) => {
                                if(hashedPassword) {
                                    newStoreAssistantData.password = hashedPassword;

                                   //   If the Store Assistant already doesn't exist, go further to save it to the Store Assistant table.
                                   newStoreAssistantData.save()
                                   .then((newStoreAssistant) => {
                                       return res.status(201).json({
                                           success: true,
                                           message: "Store assistant created successfully.",
                                           data: {
                                               status: 201,
                                               message: "Store assistant created successfully.",
                                               assistant: newStoreAssistant,
                                           },
                                       });
                                   })
                                   .catch((error) => {
                                       return res.status(500).json({
                                           success: "false",
                                           message: "Internal Server Error.",
                                           error: {
                                               statusCode: 500,
                                               message: "Internal Server Error.",
                                           },
                                       });
                                   });
                                }
                            })
                            .catch((error) => {
                                console.log("hash error");
                            });
                    })
                    .catch((error) => {
                        res.status(500).json({
                            Error: "errorCaptured",
                        });
                    });
            }
        })
        .catch((error) => {
            res.status(500).json({
                Error: error,
            });
        });

};


//  Get All Store Assistants.
exports.getAllStoreAssistants = (req, res, next) => {
    const id = req.user.phone_number;

    //  Querry the StoreAdmin table to get the recored that matches the given Store Admin identifier.
    UserModel.findOne({identifier: id})
        .then((user) => {
            if(user) {

                const adminIdentity = user.local.phone_number;

                //  Querry the StoreAssistant table to get All the Assistants that matches the given dminIdentifier.
                StoreAssistantModel.find({ admin_identity: adminIdentity })
                    .then((storeAssistants) => {
                        if(storeAssistants.length > 0) {
                            return res.status(200).json({
                                success: true,
                                message: "Store sssistants retrieved successfully.",
                                data: {
                                    status: 200,
                                    message: "Store sssistants retrieved successfully.",
                                    assistants: storeAssistants,
                                },
                            });
                        }

                        return res.status(200).json({
                            success: false,
                            message: "Store assistants record is empty.",
                            data: {
                                status: 200,
                                message: "Store assistants record is empty.",
                            },
                        });  
                    })
                    .catch((error) => {
                        res.status(500).json({
                            Error: error,
                        });
                    });
            }
        })
        .catch((error) => {
            res.status(500).json({
                Error: error,
            });
        });
};


//  Get Single Store Assistants.
exports.getSingleStoreAssistant = (req, res, next) => {
    const assistantID = req.params.assistant_id;
    const id = req.user.phone_number;

    //  Querry the StoreAdmin table to get the recored that matches the given Store Admin identifier.
    UserModel.findOne({identifier: id})
        .then((user) => {
            if(user) {

                const adminIdentity = user.local.phone_number;

                //  Querry the StoreAssistant table to get All the Assistants that matches the given dminIdentifier.
                StoreAssistantModel.findOne({ admin_identity: adminIdentity, _id: assistantID })
                    .then((storeAssistant) => {
                        if(storeAssistant) {
                            return res.status(200).json({
                                success: true,
                                message: "Store sssistant retrieved successfully.",
                                data: {
                                    status: 200,
                                    message: "Store sssistant retrieved successfully.",
                                    assistant: storeAssistant,
                                },
                            });
                        }

                        return res.status(200).json({
                            success: false,
                            message: "Store assistant does not exist.",
                            data: {
                                status: 200,
                                message: "Store assistant does not exist.",
                            },
                        });  
                    })
                    .catch((error) => {
                        res.status(500).json({
                            Error: error,
                        });
                    });
            }
        })
        .catch((error) => {
            res.status(500).json({
                Error: error,
            });
        });
};


//  Update Single Store Assistants.
exports.updateSingleStoreAssistant = (req, res, next) => {
    const assistantID = req.params.assistant_id;
    const id = req.user.phone_number;
    const reqBody = req.body;
    //  Querry the StoreAdmin table to get the recored that matches the given Store Admin identifier.
    UserModel.findOne({identifier: id})
        .then((user) => {
            if(user) {
                const adminIdentity = user.local.phone_number;
                //  Querry the StoreAssistant table to get All the Assistants that matches the given dminIdentifier.
                StoreAssistantModel.findOneAndUpdate(
                    { admin_identity: adminIdentity, _id: assistantID },
                    { $set: reqBody }
                )
                    .then((storeAssistant) => {
                        return res.status(200).json({
                            success: true,
                            message: "Store assistant updated successfully.",
                            data: {
                                status: 200,
                                message: "Store assistant updated successfully.",
                            },
                        });
                    })
                    .catch((error) => {
                        res.status(500).json({
                            Error: error,
                        });
                    });
            }
        })
        .catch((error) => {
            res.status(500).json({
                Error: error,
            });
        });
}



//  Delete Single Store Assistants.
exports.deleteSingleStoreAssistant = (req, res, next) => {
    const assistantID = req.params.assistant_id;
    const id = req.user.phone_number;

    //  Querry the StoreAdmin table to get the recored that matches the given Store Admin identifier.
    UserModel.findOne({identifier: id})
        .then((user) => {
            if(user) {

                const adminIdentity = user.local.phone_number;

                //  Querry the StoreAssistant table to get All the Assistants that matches the given dminIdentifier.
                StoreAssistantModel.findOneAndRemove({ admin_identity: adminIdentity, _id: assistantID })
                    .then((storeAssistant) => {
                        if(storeAssistant) {
                            return res.status(200).json({
                                success: true,
                                message: "Store sssistant deleted successfully.",
                                data: {
                                    status: 200,
                                    message: "Store sssistant deleted successfully.",
                                    assistant: storeAssistant,
                                },
                            });
                        }

                        return res.status(200).json({
                            success: false,
                            message: "Store assistant does not exist.",
                            data: {
                                status: 200,
                                message: "Store assistant does not exist.",
                            },
                        });
                    })
                    .catch((error) => {
                        res.status(500).json({
                            Error: error,
                        });
                    });
            }
        })
        .catch((error) => {
            res.status(500).json({
                Error: error,
            });
        });
}
