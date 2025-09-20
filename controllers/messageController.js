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

  const messages = await Message.find({
    $or: [
      { receiverId: myId },
      { senderId: myId },
      
    ]
  })
  .populate('senderId', 'name')
  .populate('receiverId', 'name')
  .sort({ createdAt: -1 }); // Sort by most recent first

  if (!messages) {
    return next(new ErrorHandler("Chat Not Found", 404));
  }

  // Process messages into chat list format
  const chatMap = new Map();
  
  messages.forEach((msg) => {
    // Determine the chat partner
    const partner = msg.senderId._id.toString() === myId.toString() 
      ? msg.receiverId 
      : msg.senderId;
    
    const partnerId = partner._id.toString();
    
    // If this is the first message with this partner or this message is newer
    if (!chatMap.has(partnerId) || 
        new Date(msg.createdAt) > new Date(chatMap.get(partnerId).lastMessage.createdAt)) {
      chatMap.set(partnerId, {
        user: partner,
        lastMessage: msg,
        unreadCount: msg.receiverId._id.toString() === myId.toString() && !msg.read ? 1 : 0
      });
    } else {
      // Increment unread count if this message is unread
      const existingChat = chatMap.get(partnerId);
      if (msg.receiverId._id.toString() === myId.toString() && !msg.read) {
        existingChat.unreadCount += 1;
      }
    }
  });
  
  // Convert map to array
  const chatList = Array.from(chatMap.values());
  
  res.status(200).json(chatList);
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
