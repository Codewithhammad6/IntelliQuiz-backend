import express from "express";
import cors from "cors";
import { connectDB } from "./database/dbConnection.js"; 
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.js";
import userRoute from "./routes/userRoute.js";
import quizRoute from "./routes/quizRoute.js";
import { removeUnverifiedAccounts } from "./automation/removeUnverifiedUser.js";
import path from "path";
import dotenv from "dotenv";

dotenv.config();
export const app = express();


const allowedOrigins = [
  "http://localhost:5000",
  "http://10.0.2.2:19000",
  "http://192.168.100.12:19000",
  "https://hl-mart-production.up.railway.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

removeUnverifiedAccounts()
connectDB();










app.use("/api/user",userRoute)
app.use("/api/quiz",quizRoute)

app.use(errorMiddleware)
