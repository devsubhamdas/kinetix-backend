import mongoose, { Schema } from "mongoose";
import User from "./user.model";

const subscriptionSchema = new Schema({
  channel: {
    type: Schema.Types.ObjectId,
    ref: User,
    require: true,
  },
  subscriber: {
    type: Schema.Types.ObjectId,
    ref: User,
    require: true,
  }
}, {timestams: true});

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;