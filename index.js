import express from "express";
import cors from "cors";
import { connectDB } from "./database/dbConnection.js"; 
import cookieParser from "cookie-parser";
import { errorMiddleware } from "./middleware/error.js";
import userRoute from "./routes/userRoute.js";
import orderRoute from "./routes/orderRoute.js";
import productRoute from "./routes/productRoute.js";
import messageRoute from "./routes/messageRoute.js";
import { removeUnverifiedAccounts } from "./automation/removeUnverifiedUser.js";
import crypto from "crypto";
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







// JazzCash config
const jazzCashConfig = {
  merchantId: process.env.JAZZCASH_MERCHANT_ID,
  password: process.env.JAZZCASH_PASSWORD,
  integritySalt: process.env.JAZZCASH_INTEGRITY_SALT,
  returnUrl: `${process.env.APP_BASE_URL}/api/payment/jazzcash/response`,
  currency: "PKR",
  language: "EN",
  version: "1.1",
  environment: "sandbox"
};
app.post("/api/payment/jazzcash/initiate", async (req, res) => {
  try {
    const { amount, orderId, customerEmail, customerMobile } = req.body;
    const pp_Amount = (amount * 100).toString(); 
    const pp_TxnRefNo = "T" + Date.now();
    const pp_TxnDateTime = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    const pp_TxnExpiryDateTime = new Date(Date.now() + 60 * 60 * 1000).toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);

    let params = {
      pp_Version: jazzCashConfig.version,
      pp_TxnType: "MWALLET",
      pp_Language: jazzCashConfig.language,
      pp_MerchantID: jazzCashConfig.merchantId,
      pp_Password: jazzCashConfig.password,
      pp_TxnRefNo,
      pp_Amount,
      pp_TxnCurrency: jazzCashConfig.currency,
      pp_ProductID: orderId,
      pp_ReturnURL: jazzCashConfig.returnUrl,
      pp_TxnDateTime,
      pp_TxnExpiryDateTime,
      pp_BillReference: "billRef",
      pp_Description: "Product Purchase",
      pp_CustomerEmail: customerEmail,
      pp_CustomerMobile: customerMobile
    };

    const sortedKeys = Object.keys(params).sort();
    const stringToHash = jazzCashConfig.integritySalt + "&" + sortedKeys.map(k => params[k]).join("&");
    params.pp_SecureHash = crypto.createHash("sha256").update(stringToHash).digest("hex").toUpperCase();

    res.json({
      success: true,
      paymentRequest: params,
      paymentUrl: jazzCashConfig.environment === "sandbox"
        ? "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform"
        : "https://jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform"
    });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ success: false, error: "Payment initiation failed" });
  }
});
app.post("/api/payment/jazzcash/response", (req, res) => {
  try {
    const response = req.body;

    // Step 1: Build string to hash from all response params
    const { pp_SecureHash, ...responseData } = response;
    const sortedKeys = Object.keys(responseData).sort();
    const stringToHash = jazzCashConfig.integritySalt + "&" + sortedKeys.map(k => responseData[k]).join("&");

    const calculatedHash = crypto
      .createHash("sha256")
      .update(stringToHash)
      .digest("hex")
      .toUpperCase();

    // Step 2: Verify hash
    if (calculatedHash !== pp_SecureHash) {
      console.log("Hash verification failed for order:", response.pp_ProductID);
      return res.status(400).json({ success: false, message: "Invalid secure hash" });
    }

    // Step 3: Verify response code
    if (response.pp_ResponseCode === "000") {
      console.log("Payment successful for order:", response.pp_ProductID);

      // Example: Update order in DB (pseudo code)
      // await Order.findOneAndUpdate(
      //   { orderId: response.pp_ProductID },
      //   { status: "Paid", txnRef: response.pp_TxnRefNo }
      // );

      return res.json({ success: true, message: "Payment successful", data: response });
    } else {
      console.log("Payment failed for order:", response.pp_ProductID);
      return res.json({ success: false, message: "Payment failed", data: response });
    }
  } catch (error) {
    console.error("Payment response handling error:", error);
    return res.status(500).json({ success: false, error: "Server error" });
  }
});







//stripe say payment
import Stripe from 'stripe'
const stripe = Stripe(process.env.STRIPE_SECRET_KEY); 

app.post('/api/create-payment-intent', async (req, res) => {
  const { amount, currency} = req.body; 
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true } 
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});









app.use("/api/user",userRoute)
app.use("/api/order",orderRoute)
app.use("/api/product",productRoute)
app.use("/api/messages",messageRoute)

app.use(errorMiddleware)
