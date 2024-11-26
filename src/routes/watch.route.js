import { Router } from "express";
import { getVideoById } from "../controllers/video.controller.js";

const router = Router();

router.route("/:username/v_id/:id").get(getVideoById);

export default router;