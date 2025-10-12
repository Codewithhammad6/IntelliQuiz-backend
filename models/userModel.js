import mongoose from "mongoose";
import bcrypt from 'bcrypt';
import jwt from "jsonwebtoken"

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
 email: {
    type: String,
    required: [true, 'Email is required'],
    validate: {
      validator: function(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Please provide a valid email address'
    }
  },
  rollNumber: {
    type: String,
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['student', 'teacher'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    select: false,
    minlength: [6, 'Password must be at least 6 characters'],
    maxlength: [32, 'Password cannot exceed 32 characters']
  },
   
  verified: {
    type: Boolean,
    default: false,
  },
  verificationToken: String,
 quizzes: [
    {
      quizName: {
        type: String,
        required: true,

      },
      obtainedMarks: {
        type: Number,
        required: true
      },
      totalMarks: {
        type: Number,
        required: true
      },
      attemptedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        required: true
      },
      quizCode:{
    type: String,
   },
      className:{
    type: String,
      },
      subject:{
    type: String,
      },
    },
  ],
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare entered vs hashed
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};



//  Generate a 5-digit verification code
userSchema.methods.generateCode = function () {
  const code = Math.floor(10000 + Math.random() * 90000).toString();
  this.verificationToken = code;
  return code;
};




userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};


const User = mongoose.model("User", userSchema);
export default User;
