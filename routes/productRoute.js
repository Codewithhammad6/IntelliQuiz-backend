import express from "express";
import multer from "multer";
import { storage } from "../config/cloudinary.js";
import { 
  addProduct, 
  deleteProduct, 
  getProduct, 
  getProducts, 
  updateProduct,
  uploadImage,
  deleteImage, 
  getUserProducts
} from "../controllers/productController.js";
import { isAuthenticated } from "../middleware/auth.js";

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 
  }
});

const router = express.Router();

router.post("/upload-image", upload.single('image'), uploadImage);
router.delete("/delete-image/:publicId", deleteImage);
router.post("/add",isAuthenticated, addProduct);   
router.get("/all",isAuthenticated, getProducts); 
router.get("/allUser",isAuthenticated, getUserProducts); 
router.get("/:id", getProduct);      
router.put("/:id", updateProduct);   
router.delete("/:id", deleteProduct); 

export default router;