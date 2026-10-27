import { Router } from "express";
import authRoutes from "../auth/auth.routes.js";
import userRoutes from "../users/user.routes.js";
import categoryRoutes from "../category/category.routes.js";
import listingRoutes from "../listing/listing.routes.js";
import listingImageRoutes from "../listing-image/listing-image.routes.js";
import searchHistoryRoutes from "../search-history/search-history.routes.js";
import paymentRoutes from "../payment/payment.routes.js";
import transactionRoutes from "../transaction/transaction.routes.js";
import refundRoutes from "../refund/refund.routes.js";
import reviewRoutes from "../review/review.routes.js";
import messageRoutes from "../message/message.routes.js";
import adminRoutes from "../admin/admin.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/category", categoryRoutes);
router.use("/listings", listingRoutes);
router.use("/listing-images", listingImageRoutes);
router.use("/search-history", searchHistoryRoutes);
router.use("/payment", paymentRoutes);
router.use("/transactions", transactionRoutes);
router.use("/refunds", refundRoutes);
router.use("/reviews", reviewRoutes);
router.use("/messages", messageRoutes);
router.use("/admin", adminRoutes);

export default router;
