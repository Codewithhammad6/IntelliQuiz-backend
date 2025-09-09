import Message from '../models/messageModel.js'
import { catchAsyncError } from "../middleware/catchAsyncError.js";
import ErrorHandler from "../middleware/error.js";



export const sendMessages =catchAsyncError(async (req,res)=>{
  
    const {text} = req.body
    const {id:receiverId}=req.params;
    const senderId = req.user._id

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
    })
    await newMessage.save()
    
res.status(201).json(newMessage)

  })



  
export const getAllMessages = catchAsyncError(async (req, res, next) => {
  const myId = req.user._id;

  const message = await Message.find({
    $or: [
      { receiverId: myId},
    ]
  })
  .populate('senderId', 'name')
  .populate('receiverId', 'name')
  .sort({ createdAt: 1 });

  if (!message) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }

  res.status(200).json(message);
});


  
export const getMessages = catchAsyncError(async (req, res, next) => {
  const { id: userToChatId } = req.params;
  const myId = req.user._id;

  const message = await Message.find({
    $or: [
      { senderId: userToChatId, receiverId: myId },
      { senderId: myId, receiverId: userToChatId }
    ]
  })
  .populate('senderId', 'name')
  .populate('receiverId', 'name')
  .sort({ createdAt: 1 });

  if (!message) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }

  res.status(200).json(message);
});









