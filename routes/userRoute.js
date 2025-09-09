import express from "express";
import { addresses, deleteAddress, deleteUserWithOrders, forgot, getAddresses, getUser, login, logout, NewPassword, register, users, verifyEmail, verifyForgot } from "../controllers/userController.js";
import { isAuthenticated } from "../middleware/auth.js";
const router = express.Router();

router.post("/register",register)
router.post("/verifyEmail", verifyEmail);
router.post("/login",login)
router.post("/forgot",forgot)
router.post("/verify",verifyForgot)
router.post("/newpassword",NewPassword)
router.get("/me",isAuthenticated, getUser);
router.get("/logout",isAuthenticated, logout);
router.post("/addresses",isAuthenticated, addresses);
router.get("/getAddresses",isAuthenticated, getAddresses);
router.get("/getUsers",isAuthenticated, users);
router.delete("/users/:id", deleteUserWithOrders);
router.delete("/address/:id",isAuthenticated, deleteAddress);


export default router;