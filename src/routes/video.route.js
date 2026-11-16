import { Router } from "express";
import {
  getVideoById,
  incrementVideoViewsCount,
} from "../controllers/video.controller.js";

const router = Router();
router.route("/:id").get(getVideoById);
router.route("/add-view/:id").patch(incrementVideoViewsCount);

export default router;
