import express from "express";
const router = express.Router();
import { isAuthenticated } from "../middleware/auth.js";
import { getAllMessages, getMessages, sendMessages } from "../controllers/messageController.js";


router.get("/allMessages",isAuthenticated,getAllMessages)
router.get("/:id",isAuthenticated,getMessages)
router.post("/send/:id",isAuthenticated,sendMessages)


export default router;


