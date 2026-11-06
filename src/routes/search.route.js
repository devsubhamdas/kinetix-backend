import { Router } from "express";
import { getVideosBySearchTerm } from "../controllers/video.controller.js";

const router = Router();

router.route("/videos").get(getVideosBySearchTerm);

export default router;
