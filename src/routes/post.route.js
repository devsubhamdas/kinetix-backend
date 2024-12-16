import { Router } from "express";
import { getPostById } from "../controllers/communityPost.controller.js";

const router = Router();
router.route("/:username/p_id/:id").get(getPostById);

export default router;