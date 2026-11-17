import { Router } from "express";
import { getVideosBySearchTerm } from "../controllers/video.controller.js";
import { getSearchSuggestions } from "../controllers/searchTerm.controller.js";

const router = Router();

router.route("/videos").get(getVideosBySearchTerm);
router.route("/term/suggestions").get(getSearchSuggestions);

export default router;
