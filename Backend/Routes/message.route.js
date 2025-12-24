import express from "express"
import isAuthenticated from "../Middlewares/isAuthenticated.js"
import upload from "../Middlewares/multer.js"
import { getMessage,sendMessage, suggestChatUser } from "../Controllers/message.controller.js"

const router=express.Router();

router.route('/send/:id').post(isAuthenticated,sendMessage);
router.route('/all/:id').get(isAuthenticated,getMessage);
router.route('/suggestChatUser/:id').get(isAuthenticated,suggestChatUser);

export default router;
