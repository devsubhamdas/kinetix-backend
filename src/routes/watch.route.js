import { Router } from "express";
import { getVideoById } from "../controllers/video.controller.js";
import { getPostById } from "../controllers/communityPost.controller.js";

const router = Router();

router.route("/:username/v_id/:id").get(getVideoById);
router.route("/:username/p_id/:id").get(getPostById);

export default router;