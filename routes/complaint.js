const express = require("express");
const router = express.Router();
const complaintsController = require("../controllers/complaints.controller");
const auth = require("../auth/auth");
const { check, validationResult } = require('express-validator/check');


// @route       GET /complaints
// @desc        User gets all complaints
// @access      Private
router.get("/complaints", auth, complaintsController.findAll);

// @route       GET /complaint/:complaintId
// @desc        User gets single complaint
// @access      Private
router.get("/complaint/:complaintId", auth, complaintsController.findOne);

// @route       PUT /complaint/update/:complaintId
// @desc        Super Admin updates status of complaint
// @access      Private
router.put("/complaint/update/:complaintId", auth, complaintsController.update);


// @route       POST /complaint/new
// @desc        User (store owner) creates complaints for super admin to view
// @access      Private
router.post(
    "/complaint/new", 
    [
        auth,
        [
            // check('name', 'Please add a name').not().isEmpty(),
            // check('email', 'Please add a valid email').isEmail(),
            check('subject', 'Please put in a subject').not().isEmpty(),
            check('message', 'Please add a message of more that 10 characters').isLength({ min: 10 })
        ]
    ],
    complaintsController.newComplaint
);

// @route       DELETE /complaint/delete/:complaintId
// @desc        User (store owner) creates complaints for super admin to view
// @access      Private
router.delete("/complaint/delete/:complaintId", auth, complaintsController.deleteOne);

module.exports = router;
