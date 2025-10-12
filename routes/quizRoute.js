import express from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { createQuiz, deleteQuizById, getAllQuizzes, getQuizById, updateQuizById } from "../controllers/quizController.js";
const router = express.Router();

router.post("/quizzes", isAuthenticated, createQuiz);
router.get("/quizzes", isAuthenticated, getAllQuizzes);
router.get("/quizzes/:id", isAuthenticated, getQuizById);
router.put("/quizzes/:id", isAuthenticated, updateQuizById);
router.delete("/quizzes/:id", isAuthenticated, deleteQuizById);

export default router;