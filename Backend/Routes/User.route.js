import express from "express"
import { editProfile, getProfile, getSuggestedUser, login, logOut, register, searchingUser, SupportOrUnSupport } from "../Controllers/user.controller.js";
import isAuthenticated from "../Middlewares/isAuthenticated.js"
import upload from "../Middlewares/multer.js";
const router=express.Router();


router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logOut);
router.route('/:id/profile').get(isAuthenticated,getProfile);
router.route('/profile/edit').post(isAuthenticated,upload.single('profilePicture'),editProfile);
router.route("/suggested").get(isAuthenticated,getSuggestedUser);
router.route("/SupportOrUnSupport").post(isAuthenticated,SupportOrUnSupport);
router.route("/Search").get(isAuthenticated,searchingUser);


export default router;