import express from "express";
import {forgot, getAllUsers, getUser, login, logout, NewPassword, quizResult, register, updateProfile, verifyEmail, verifyForgot } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";
const router = express.Router();

router.post("/register",register)
router.post("/verifyEmail", verifyEmail);
router.post("/login",login)
router.post("/forgot",forgot)
router.post("/verify",verifyForgot)
router.post("/newpassword",NewPassword)
router.get("/me",isAuthenticated, getUser);
router.put("/update",isAuthenticated, updateProfile);
router.get("/logout",isAuthenticated, logout);
router.post("/quizResult",isAuthenticated, quizResult);
router.get("/users", isAuthenticated, getAllUsers);

export default router;