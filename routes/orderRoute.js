import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { AllOrders, deleteOrder, getOrders, orders, updateOrderStatus } from "../controllers/orderController.js";
const router = express.Router();

router.post("/orders",isAuthenticated,orders)
router.get("/getOrders",isAuthenticated,getOrders)
router.delete("/order/:id", isAuthenticated, deleteOrder);
router.put("/order/:id", isAuthenticated, updateOrderStatus);
router.get("/AllOrders", isAuthenticated, AllOrders);


export default router;