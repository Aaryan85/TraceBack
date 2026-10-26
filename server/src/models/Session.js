import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 } // Automatic TTL expiration by MongoDB
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const Session = mongoose.model('Session', sessionSchema);
export default Session;
