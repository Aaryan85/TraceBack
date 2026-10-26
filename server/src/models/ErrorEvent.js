import mongoose from 'mongoose';

const errorEventSchema = new mongoose.Schema(
  {
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
      required: [true, 'issueId reference is required'],
      index: true
    },
    fingerprint: {
      type: String,
      required: [true, 'fingerprint is required'],
      index: true,
      trim: true
    },
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
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    type: {
      type: String,
      required: [true, 'exception type is required'],
      trim: true
    },
    message: {
      type: String,
      required: [true, 'event message is required'],
      trim: true
    },
    stackTrace: {
      type: String,
      default: null
    },
    route: {
      type: String,
      default: null,
      trim: true
    },
    service: {
      type: String,
      default: 'api-server',
      trim: true
    },
    environment: {
      type: String,
      default: 'development',
      index: true,
      trim: true
    },
    release: {
      type: String,
      default: 'v1.0.0',
      trim: true
    },
    requestId: {
      type: String,
      default: null,
      trim: true
    },
    context: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Query optimization indexes for fast history pagination & frequency aggregation
errorEventSchema.index({ issueId: 1, timestamp: -1 });
errorEventSchema.index({ projectKey: 1, timestamp: -1 });
errorEventSchema.index({ projectId: 1, timestamp: -1 });
errorEventSchema.index({ timestamp: -1 });

export const ErrorEvent = mongoose.model('ErrorEvent', errorEventSchema);
export default ErrorEvent;
