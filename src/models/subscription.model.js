import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevents duplicate subscriptions; also serves "is user X subscribed to channel Y?"
// and "subscriber count / list of subscribers for channel Y" (channel is the prefix)
subscriptionSchema.index({ channel: 1, subscriber: 1 }, { unique: true });

// Serves "list of channels user X subscribed to"
subscriptionSchema.index({ subscriber: 1 });

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
