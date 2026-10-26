import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema(
  {
    projectKey: {
      type: String,
      required: [true, 'projectKey is required'],
      index: true,
      trim: true
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true
    },
    fingerprint: {
      type: String,
      required: [true, 'fingerprint is required'],
      index: true,
      trim: true
    },
    type: {
      type: String,
      required: [true, 'exception type is required'],
      index: true,
      trim: true
    },
    message: {
      type: String,
      required: [true, 'normalized message is required'],
      trim: true
    },
    sampleStackTrace: {
      type: String,
      default: null
    },
    count: {
      type: Number,
      default: 1,
      min: [1, 'occurrence count cannot be less than 1']
    },
    status: {
      type: String,
      enum: {
        values: ['unresolved', 'resolved', 'ignored'],
        message: 'status must be unresolved, resolved, or ignored'
      },
      default: 'unresolved',
      index: true
    },
    firstSeen: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastSeen: {
      type: Date,
      default: Date.now,
      index: true
    },
    release: {
      type: String,
      default: 'v1.0.0',
      trim: true
    },
    environment: {
      type: String,
      default: 'development',
      index: true,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Compound index to guarantee uniqueness per project and fingerprint
issueSchema.index({ projectKey: 1, fingerprint: 1 }, { unique: true });

// Common query optimization indexes
issueSchema.index({ projectKey: 1, status: 1, lastSeen: -1 });
issueSchema.index({ projectId: 1, status: 1, lastSeen: -1 });
issueSchema.index({ environment: 1, status: 1 });

export const Issue = mongoose.model('Issue', issueSchema);
export default Issue;
