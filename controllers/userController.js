import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import User from "../models/userModel.js";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();
import { sendToken } from "../utils/sendToken.js";
import Order from '../models/orderModel.js'
import mongoose from "mongoose";


// REGISTER
export const register = catchAsyncError(async (req, res, next) => {
  // const { name, email, password } = req.body;

  // if (!name || !email || !password) {
  //   return next(new ErrorHandler("All fields required", 400));
  // }

  // // Email format check
  // const emailRegex = /^\S+@\S+\.\S+$/;
  // if (!emailRegex.test(email)) {
  //   return next(new ErrorHandler("Invalid email format", 400));
  // }

  // const existingUser = await User.findOne({ email, verified: true });

  // if (existingUser) {
  //   return next(new ErrorHandler("Email is already used.", 400));
  // }

  // const newUser = new User({ name, email, password });

  // // generate and store token
  // const verificationToken = newUser.generateCode();
  // newUser.verificationToken = verificationToken;

  // await newUser.save();

  // // send verification email
  // await sendVerificationEmail(newUser.email, verificationToken);

  // res.status(201).json({
  //   success: true,
  //   message:
  //     "User registered successfully. Please check your email for verification.",
  // });
// inside register controller


const { name, email, password } = req.body;

if (!name || !email || !password) {
  return next(new ErrorHandler("All fields required", 400));
}

const emailRegex = /^\S+@\S+\.\S+$/;
if (!emailRegex.test(email)) {
  return next(new ErrorHandler("Invalid email format", 400));
}

// 1️⃣ Check if email exists at all
let existingUser = await User.findOne({ email });

// 2️⃣ If already verified, block
if (existingUser && existingUser.verified) {
  return next(new ErrorHandler("Email is already used.", 400));
}

// 3️⃣ If exists but not verified → just update token + password and resend
if (existingUser && !existingUser.verified) {
  existingUser.name = name;
  existingUser.password = password; // will be hashed by pre-save
  const verificationToken = existingUser.generateCode();
  await existingUser.save();

  await sendVerificationEmail(existingUser.email, verificationToken);

  return res.status(200).json({
    success: true,
    message: "Verification code resent to your email.",
  });
}

// 4️⃣ Otherwise, create new user
const newUser = new User({ name, email, password });
const verificationToken = newUser.generateCode();
await newUser.save();
await sendVerificationEmail(newUser.email, verificationToken);

res.status(201).json({
  success: true,
  message:
    "User registered successfully. Please check your email for verification.",
});

});

// SEND VERIFICATION EMAIL
const sendVerificationEmail = async (email, verificationToken) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

const mailOptions = {
  from: process.env.MAIL_FROM || `"HL" <${process.env.SMTP_USER}>`,
  to: email,
  subject: "✨ Verify your email address",
 html: `
     <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); padding:25px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:25px;">
      <h1 style="color:#4199c7; margin:0; font-size:32px; font-weight:700;">HL</h1>
      <p style="color:#555; font-size:16px; margin-top:6px; font-weight:500;">Secure Email Verification</p>
    </div>

    <!-- Greeting -->
    <p style="font-size:16px; color:#333; margin-bottom:10px;">Hello,</p>
    <p style="font-size:15px; color:#555; line-height:1.7; margin-top:0;">
      We received a request to verify your email address. Please use the following
      <strong style="color:#4199c7;">verification code</strong>:
    </p>

    <!-- Verification Code -->
    <div style="text-align:center; margin:35px 0;">
      <span style="display:inline-block; background:#4199c7; color:#ffffff; font-size:24px; font-weight:bold; letter-spacing:3px; padding:15px 35px; border-radius:8px;">
        ${verificationToken}
      </span>
    </div>

    <!-- Note -->
    <p style="font-size:14px; color:#777; line-height:1.6; margin-top:0;">
      If you didn’t request this, you can safely ignore this email.
    </p>

    <!-- Footer -->
    <hr style="margin:25px 0; border:none; border-top:1px solid #eee;">
    <p style="font-size:13px; color:#999; text-align:center; margin:0;">
      &copy; ${new Date().getFullYear()} HL. All rights reserved.
    </p>
  </div>
</div>

    `,
  text: `Welcome to HL! Please verify your email: ${verificationToken}`,
};


  await transporter.sendMail(mailOptions);
};

// VERIFY EMAIL 
export const verifyEmail = catchAsyncError(async (req, res, next) => {
 const {code} = req.body;
console.log(code);

  // Find user with given token
  const user = await User.findOne({ verificationToken: code });

  if (!user) {
    return next(new ErrorHandler("Invalid verification token", 400));
  }
   if (user.verificationToken !== code) {
    return next(new ErrorHandler("Invalid verification token", 400));
  }

  user.verified = true;
  user.verificationToken = undefined;

  await user.save();

   sendToken(user, 200, "successfully.", res);
});

// LOGIN
export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("All fields required", 400));
  }

  // Email format check
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorHandler("Invalid email format", 400));
  }

  // Only login verified users
  const user = await User.findOne({ email, verified: true }).select(
    "+password"
  );

  if (!user) {
    return next(
      new ErrorHandler("Invalid credentials or email not verified", 400)
    );
  }

  // check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid password ", 400));
  }

  sendToken(user, 200, "User logged in successfully.", res);
});

export const getUser = catchAsyncError(async (req, res, next) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user,
  });
});

export const logout = catchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .cookie("token", "", {
      expires: new Date(Date.now()),
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "Lax",
    })
    .json({
      success: true,
      message: "Logout Successfully",
    });
});





// Forgot
export const forgot = catchAsyncError(async (req, res, next) => {
  const {email} = req.body;

  if (!email) {
    return next(new ErrorHandler("Email required", 400));
  }

  // Email format check
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    return next(new ErrorHandler("Invalid email format", 400));
  }

  const user = await User.findOne({ email, verified: true });

  if (!user) {
    return next(new ErrorHandler("User not found.", 400));
  }


  // generate and store token
  const verificationToken = user.generateCode();
  user.verificationToken = verificationToken;


  // send verification email
  await sendVerificationEmailForget(user.email, verificationToken);

await user.save()

  res.status(201).json({
    success: true,
    message:
      "Please check your email for verification.",
  });

});



// SEND VERIFICATION EMAIL
const sendVerificationEmailForget = async (email, verificationToken) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });


  const mailOptions = {
    from: process.env.MAIL_FROM || `"HL" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify your email",
    html: `
  <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); padding:25px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:25px;">
      <h1 style="color:#4199c7; margin:0; font-size:32px; font-weight:700;">HL</h1>
      <p style="color:#555; font-size:16px; margin-top:6px; font-weight:500;">Secure Email Verification</p>
    </div>

    <!-- Greeting -->
    <p style="font-size:16px; color:#333; margin-bottom:10px;">Hello,</p>
    <p style="font-size:15px; color:#555; line-height:1.7; margin-top:0;">
      We received a request to verify your email address. Please use the following
      <strong style="color:#4199c7;">verification code</strong>:
    </p>

    <!-- Verification Code -->
    <div style="text-align:center; margin:35px 0;">
      <span style="display:inline-block; background:#4199c7; color:#ffffff; font-size:24px; font-weight:bold; letter-spacing:3px; padding:15px 35px; border-radius:8px;">
        ${verificationToken}
      </span>
    </div>

    <!-- Note -->
    <p style="font-size:14px; color:#777; line-height:1.6; margin-top:0;">
      If you didn’t request this, you can safely ignore this email.
    </p>

    <!-- Footer -->
    <hr style="margin:25px 0; border:none; border-top:1px solid #eee;">
    <p style="font-size:13px; color:#999; text-align:center; margin:0;">
      &copy; ${new Date().getFullYear()} HL. All rights reserved.
    </p>
  </div>
</div>

    `,
    text: `Your verification code is: ${verificationToken}`,
  };

  await transporter.sendMail(mailOptions);
};

// VERIFY EMAIL 
export const verifyForgot = catchAsyncError(async (req, res, next) => {
  const {code} = req.body;
console.log(code);

  // Find user with given token
  const user = await User.findOne({ verificationToken: code })

  if (!user) {
    return next(new ErrorHandler("Invalid verification token", 400));
  }
  if (user.verificationToken !== code) {
    return next(new ErrorHandler("Invalid verification token", 400));
  }
 
  res.status(200).json({ message: "Email verified successfully" });
});

// new password 
export const NewPassword = catchAsyncError(async (req, res, next) => {
  const {password,code} = req.body;
  // Find user with given token
const user = await User.findOne({ verificationToken: code })
  if (!user) {
    return next(new ErrorHandler("Invalid verification token", 400));
  }

  user.password = password;
  user.verificationToken = undefined;

  await user.save();

  res.status(200).json({ message: "Password Change successfully" });
  sendToken(user, 200, "successfully.", res);
});








export const addresses = catchAsyncError(async (req, res, next) => {
  const user = req.user;
  const { address } = req.body;

  // Find user
  const currentUser = await User.findById(user._id);
  if (!currentUser) {
    return next(new ErrorHandler("User not found", 404));
  }

  currentUser.addresses.push(address);

  await currentUser.save();

  res.status(200).json({
    success: true,
    message: "Address added successfully",
    addresses: currentUser.addresses,
  });
});

export const getAddresses = catchAsyncError(async (req, res, next) => {
  const user = req.user;

  // Find user
  const currentUser = await User.findById(user._id);
  if (!currentUser) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Addresses fetched successfully",
    addresses: currentUser.addresses,
  });
});

// Delete specific address
export const deleteAddress = catchAsyncError(async (req, res, next) => {
  const userId = req.user; 
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    userId,
    { $pull: { addresses: { _id: new mongoose.Types.ObjectId(id) } } },
    { new: true }
  ).select("addresses"); 

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "Address deleted successfully",
    addresses: user.addresses, 
  });
});


//Get all users

export const users = catchAsyncError(async (req, res, next) => {
  const users = await User.find({ _id: { $ne: req.user._id } }).populate("orders").populate("products").exec();;
  if (!users) {
    return next(new ErrorHandler("Users Not Found", 404));
  }

  res.status(200).json({
    success: true,
    users,
  });
});





// deleteUser With Orders
export const deleteUserWithOrders = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("User not found", 404));

  // delete all orders of this user
  await Order.deleteMany({ user: id });

  // delete the user
  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: "User and all orders deleted successfully",
  });
});


