import mongoose from "mongoose";

const searchTermSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const SearchTerm = mongoose.model("SearchTerm", searchTermSchema);
export default SearchTerm;
