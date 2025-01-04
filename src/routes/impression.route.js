import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addDislike, addLike, deleteDislike, deleteLike } from "../controllers/impression.controller.js";

const router = Router();

router.route("/add/like/:refType/:refId").post(verifyJWT, addLike);
router.route("/delete/like/:refType/:refId").delete(verifyJWT, deleteLike);

router.route("/add/dislike/:refType/:refId").post(verifyJWT, addDislike);
router.route("/delete/dislike/:refType/:refId").delete(verifyJWT, deleteDislike);

export default router;