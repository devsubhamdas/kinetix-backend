import { Router } from "express";
import { getVideosByRecommendation } from "../controllers/video.controller.js";

const router = Router();

router.route("/videos").get(getVideosByRecommendation);

export default router;