import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  subscribeChannel,
  unsubscribeChannel,
} from "../controllers/subscription.controller.js";

const router = Router();

router.route("/add/:channelName").post(verifyJWT, subscribeChannel);
router.route("/delete/:channelName").delete(verifyJWT, unsubscribeChannel);

export default router;
