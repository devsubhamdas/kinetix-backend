import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, updateComment, deleteComment, getAllCommentsByRefId } from "../controllers/comment.controller.js";

const router = Router();

// add comment
router.route("/add/:refType/:refId").post(verifyJWT, addComment);

// update comment
router.route("/update/:id").put(verifyJWT, updateComment);

// delete comment
router.route("/delete/:id").delete(verifyJWT, deleteComment);

// delete comment
router.route("/get-all/:refId").get(getAllCommentsByRefId);

export default router;