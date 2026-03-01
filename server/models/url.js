import mongoose from "mongoose";

const urlSchema = new mongoose.Schema(
  {
    originalUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    ipAddress: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// compound indexes for queries
urlSchema.index({ ipAddress: 1, createdAt: -1 });
urlSchema.index({ user: 1, createdAt: -1 });

// strip sensitive fields from JSON output
urlSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.ipAddress;
  return obj;
};

export default mongoose.model("Url", urlSchema);
