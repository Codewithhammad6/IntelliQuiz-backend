import cron from "node-cron";
import User from "../models/userModel.js";

export const removeUnverifiedAccounts = () => {
  cron.schedule("*/2 * * * *", async () => {
    const thirtyMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    await User.deleteMany({
      verified: false,
      createdAt: { $lt: thirtyMinutesAgo },
    });
  });
};
