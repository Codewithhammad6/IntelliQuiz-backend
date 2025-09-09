import { catchAsyncError } from '../middleware/catchAsyncError.js';
import ErrorHandler from '../middleware/error.js';
import User from '../models/userModel.js';
import Order from '../models/orderModel.js'
import dotenv from "dotenv";
dotenv.config();



export const orders = catchAsyncError(async (req, res, next) => {
  const userId = req.user;
  const { cartItems, totalPrice, shippingAddress, paymentMethod,status } = req.body;

  const user = await User.findById(userId._id);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }
  const products = cartItems.map((item) => ({
    name: item?.title,
    quantity: item?.quantity,
    price: item?.price,
    image: item?.image,
  }));

  const order = new Order({
    user: userId._id,
    products,
    totalPrice,
    shippingAddress,
    paymentMethod,
    status
  });


  await order.save();

  // Push order id inside user.orders
  user.orders.push(order._id);
  await user.save();


  res.status(200).json({
    success: true,
    message: "Order created successfully!",
    order,
  });
});



export const getOrders = catchAsyncError(async (req, res, next) => {
  const userId = req.user;

  const orders = await Order.find({ user: userId._id }).populate("user");
  
  if (!orders || orders.length === 0) {
    return next(new ErrorHandler("No orders found", 404));
  }

  res.status(200).json({
    success: true,
    orders,
  });
});





//Get AllOrders
export const AllOrders = catchAsyncError(async (req, res, next) => {
  
  const orders = await Order.find({
    user: { $ne: req.user._id }
  }).populate("user");
  if (!orders || orders.length === 0) {
    return next(new ErrorHandler("No orders found", 404));
  }

  res.status(200).json({
    success: true,
    orders,
  });
});







//Delete Order 
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    await order.deleteOne();

    res.status(200).json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update Order Status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
