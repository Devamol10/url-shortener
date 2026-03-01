import express from "express";
import {
  createShortUrl,
  getUrlStats,
  getMyUrls,
  deleteUrl,
} from "../controllers/urlController.js";
import {
  optionalProtect,
  protect,
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/shorten", optionalProtect, createShortUrl);
router.get("/my-urls", protect, getMyUrls);
router.get("/stats/:shortCode", optionalProtect, getUrlStats);
router.delete("/urls/:id", protect, deleteUrl);

export default router;
