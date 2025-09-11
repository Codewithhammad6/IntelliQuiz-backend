import { catchAsyncError } from '../middleware/catchAsyncError.js';
import ErrorHandler from '../middleware/error.js';
import Product from "../models/productModel.js";
import { v4 as uuidv4 } from "uuid";
import { cloudinary } from '../config/cloudinary.js';
import User from '../models/userModel.js';

const extractPublicIdFromUrl = (url) => {
  if (!url) return null;
  
  const matches = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|gif)/);
  return matches ? matches[1] : null;
};



export const uploadImage = catchAsyncError(async (req, res, next) => {
  if (!req.file) {
    return next(new ErrorHandler("No image file provided", 400));
  }

  res.status(200).json({
    success: true,
    message: 'Image uploaded successfully',
    imageUrl: req.file.path,
    publicId: req.file.filename 
  });
});

// Delete image from Cloudinary
export const deleteImage = catchAsyncError(async (req, res, next) => {
  const { publicId } = req.params;
  
  if (!publicId) {
    return next(new ErrorHandler("Public ID is required", 400));
  }

  try {
    const result = await cloudinary.v2.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      return next(new ErrorHandler("Failed to delete image", 500));
    }
  } catch (error) {
    return next(new ErrorHandler("Error deleting image: " + error.message, 500));
  }
});

export const addProduct = catchAsyncError(async (req, res, next) => {
 const userId = req.user;
  const {
    title,
    offer,
    oldPrice,
    price,
    carouselImages,
    color,
    size,
    trendingDeal,
    todayDeal,
    rating,
    category
  } = req.body;

    const user = await User.findById(userId._id);
    if (!user) {
      return next(new ErrorHandler("User not found", 404));
    }

  if (!title || !price || !category) {
    return next(new ErrorHandler("Title, price, and category are required fields", 400));
  }

  if (!carouselImages || carouselImages.length === 0) {
    return next(new ErrorHandler("At least one product image is required", 400));
  }

  const imagePublicIds = carouselImages.map(url => extractPublicIdFromUrl(url));

  const product = new Product({
     user: userId._id,
    id: uuidv4(),
    title,
    offer: offer || "",
    oldPrice: oldPrice || 0,
    price: parseFloat(price),
    image: carouselImages[0],
    carouselImages,
    color: color || "",
    size: size || "",
    trendingDeal: trendingDeal || "no",
    todayDeal: todayDeal || "no",
    rating:rating,
    category,
    imagePublicIds
  });

  await product.save();

  user.products.push(product._id);
  await user.save();


  res.status(201).json({
    success: true,
    message: "Product added successfully",
    product,
  });
});




// Delete product with Cloudinary image 
export const deleteProduct = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  
  // Delete associated images from Cloudinary
  if (product.imagePublicIds && product.imagePublicIds.length > 0) {
    try {
      await Promise.all(
        product.imagePublicIds.map(publicId => 
          cloudinary.v2.uploader.destroy(publicId)
        )
      );
      console.log('All product images deleted from Cloudinary');
    } catch (error) {
      console.error('Error deleting images from Cloudinary:', error);
    }
  }
  
  await Product.findByIdAndDelete(req.params.id);
  
  res.status(200).json({
    success: true,
    message: "Product and all associated images deleted successfully"
  });
});



// Update product with Cloudinary image management
export const updateProduct = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  
  if (req.body.carouselImages && Array.isArray(req.body.carouselImages)) {
    const newImagePublicIds = req.body.carouselImages.map(url => extractPublicIdFromUrl(url));
    const oldImagePublicIds = product.imagePublicIds || [];
    
    const removedImages = oldImagePublicIds.filter(publicId => 
      !newImagePublicIds.includes(publicId)
    );
    
    if (removedImages.length > 0) {
      try {
        await Promise.all(
          removedImages.map(publicId => 
            cloudinary.v2.uploader.destroy(publicId)
          )
        );
        console.log('Removed images deleted from Cloudinary');
      } catch (error) {
        console.error('Error deleting removed images from Cloudinary:', error);
      }
    }
    
    req.body.imagePublicIds = newImagePublicIds;
  }
  
  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    product: updatedProduct
  });
});

// Get all products
export const getProducts = catchAsyncError(async (req, res, next) => {
  const products = await Product.find().sort({ createdAt: -1 }).populate("user");
  
  res.status(200).json({
    success: true,
    products
  });
});

// Get allUser products
export const getUserProducts = catchAsyncError(async (req, res, next) => {
 const userId = req.user;
  const products = await Product.find({ user: userId._id }).populate("user");
  
  res.status(200).json({
    success: true,
    products
  });
});



// Get single product
export const getProduct = catchAsyncError(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  
  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  
  res.status(200).json({
    success: true,
    product
  });
});