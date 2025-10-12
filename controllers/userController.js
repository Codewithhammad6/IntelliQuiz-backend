import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import User from "../models/userModel.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import { sendToken } from "../utils/sendToken.js";



// REGISTER
export const register = catchAsyncError(async (req, res, next) => {
 

const { name, rollNumber, role, email, password } = req.body;

if (!name || !role || !email || !password) {
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
  existingUser.rollNumber = rollNumber;
  existingUser.role = role;
  const verificationToken = existingUser.generateCode();
  await existingUser.save();

  await sendVerificationEmail(existingUser.email, verificationToken);

  return res.status(200).json({
    success: true,
    message: "Verification code resent to your email.",
  });
}

// 4️⃣ Otherwise, create new user
const newUser = new User({ name, rollNumber, role, email, password });
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
  from: process.env.MAIL_FROM || `"IntelliQuiz" <${process.env.SMTP_USER}>`,
  to: email,
  subject: "✨ Verify your email address",
 html: `
     <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); padding:25px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:25px;">
      <h1 style="color:#4199c7; margin:0; font-size:32px; font-weight:700;">IntelliQuiz</h1>
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
      &copy; ${new Date().getFullYear()} IntelliQuiz. All rights reserved.
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
    from: process.env.MAIL_FROM || `"IntelliQuiz" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Verify your email",
    html: `
  <div style="font-family: Arial, sans-serif; background-color:#f4f4f4; padding:30px;">
  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; box-shadow:0 4px 12px rgba(0,0,0,0.1); padding:25px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:25px;">
      <h1 style="color:#4199c7; margin:0; font-size:32px; font-weight:700;">IntelliQuiz</h1>
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
      &copy; ${new Date().getFullYear()} IntelliQuiz. All rights reserved.
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









// In your backend route
export const quizResult = catchAsyncError(async (req, res, next) => {
  const { quizName, obtainedMarks, totalMarks, status, quizCode, className, subject } = req.body;
  const userId = req.user._id;

  console.log('Received quiz result data:', {
    userId, quizName, obtainedMarks, totalMarks, status ,quizCode, className, subject
  });

  if (!userId || !quizName || obtainedMarks === undefined || !totalMarks || !status || !quizCode || !className || !subject) {
    return next(new ErrorHandler("All fields required: userId, quizName, obtainedMarks, totalMarks, status", 400));
  }

  try {
    // Find user by ID
    const user = await User.findById(userId);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

    // Check if user has already attempted this quiz
    const existingQuiz = user.quizzes.find(quiz => quiz.quizName === quizName && quiz.quizCode === quizCode && quiz.className === className && quiz.subject === subject);
    if (existingQuiz) {
      return next(new ErrorHandler("You have already attempted this quiz", 400));
    }

    // Create new quiz result
    const newQuizResult = {
      quizCode,
      className,
      subject,
      quizName,
      obtainedMarks,
      totalMarks,
      status,
      attemptedAt: new Date()
    };

    // Add to user's quizzes array
    user.quizzes.push(newQuizResult);
    await user.save();

    console.log('Quiz result saved for user:', userId);

    res.status(200).json({
      success: true,
      message: "Quiz result saved successfully",
      quizResult: newQuizResult
    });
  } catch (error) {
    console.error('Error saving quiz result:', error);
    return next(new ErrorHandler("Internal server error", 500));
  }
});


export const updateProfile = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { name, rollNumber } = req.body;

  // Find user by ID
  const user = await User.findById(userId);
  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Update user fields
  user.name = name || user.name;
  user.rollNumber = rollNumber || user.rollNumber;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user
  });
});
// 


export const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find().select("-password -verificationToken");
  res.status(200).json({ users });
});