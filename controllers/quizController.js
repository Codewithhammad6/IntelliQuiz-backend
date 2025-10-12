import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";
import Quiz from "../models/quizModal.js";
import dotenv from "dotenv";
dotenv.config();
import User from "../models/userModel.js";



// Create a new quiz
export const createQuiz = catchAsyncError(async (req, res, next) => {
  const {
    quizCode,
    quizName,
    totalMarks,
    passingMarks,
    timePerQuestion,
    marksPerQuestion,
    className,
    subject,
    questions
  } = req.body;

  const quiz = await Quiz.create({
    userId: req.user._id,
    quizCode,
    quizName,
    totalMarks,
    passingMarks,
    timePerQuestion,
    marksPerQuestion,
    className,
    subject,
    questions
  });

  res.status(201).json({
    success: true,
    quiz
  });
});


// Get all quizzes
export const getAllQuizzes = catchAsyncError(async (req, res, next) => {
  const quizzes = await Quiz.find();
  res.status(200).json({
    success: true,
    quizzes
  });
});


// Get a single quiz by ID
export const getQuizById = catchAsyncError(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    return next(new ErrorHandler("Quiz not found", 404));
  }
  res.status(200).json({
    success: true,
    quiz
  });
});

// Update a quiz by ID
export const updateQuizById = catchAsyncError(async (req, res, next) => {   
  let quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    return next(new ErrorHandler("Quiz not found", 404));
  }

  quiz = await Quiz.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    quiz
  });
});


// Delete a quiz by ID
export const deleteQuizById = catchAsyncError(async (req, res, next) => {
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    return next(new ErrorHandler("Quiz not found", 404));
  }

  await Quiz.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Quiz deleted successfully"
  });
});
