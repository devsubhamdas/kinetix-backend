import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getSubscribedChannels,
  subscribeChannel,
  unsubscribeChannel,
} from "../controllers/subscription.controller.js";
import { getVideosBySubscribedChannels } from "../controllers/video.controller.js";

const router = Router();

router.route("/add/:channelName").post(verifyJWT, subscribeChannel);
router.route("/delete/:channelName").delete(verifyJWT, unsubscribeChannel);
router.route("/channels").get(verifyJWT, getSubscribedChannels);
router.route("/videos").get(verifyJWT, getVideosBySubscribedChannels);

export default router;
