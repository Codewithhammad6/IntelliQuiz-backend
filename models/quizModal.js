import mongoose from "mongoose";

const quizSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quizCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  quizName: {
    type: String,
    required: true,
    trim: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  passingMarks: {
    type: Number,
    required: true
  },
  timePerQuestion: {
    type: Number,
    required: true
  },
  marksPerQuestion: {
    type: Number,
    required: true
  },
  className: {
    type: String,
    required: true,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  questions: [{
    question: {
      type: String,
      required: true
    },
    options: [{
      type: String,
      required: true
    }],
    correctAnswer: {
      type: Number,
      required: true
    },
    createdAt: {
    type: Date,
    default: Date.now,
  },
  }]
});

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
