import { Issue } from '../models/Issue.js';
import { ErrorEvent } from '../models/ErrorEvent.js';
import { generateFingerprint } from '../services/fingerprintService.js';
import { validateAndSanitizeEvent } from '../services/sanitizerService.js';

/**
 * POST /api/v1/events
 * Ingest, sanitize, fingerprint, group recurring errors, and persist.
 */
export async function ingestEvent(req, res) {
  try {
    const projectKey = req.projectKey;

    // 1. Validate & sanitize payload
    const validation = validateAndSanitizeEvent(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'BadRequest',
        message: validation.error
      });
    }

    const eventData = validation.data;
    const now = new Date();

    // 2. Generate deterministic error fingerprint
    const fingerprint = generateFingerprint({
      type: eventData.type,
      message: eventData.message,
      stackTrace: eventData.stackTrace
    });

    const projectId = req.projectId || (req.project ? req.project._id : null);

    // 3. Atomically upsert the grouped Issue
    // Increments occurrence count for duplicate issues; creates on first occurrence
    const updateFields = {
      $setOnInsert: {
        projectKey,
        fingerprint,
        type: eventData.type,
        firstSeen: now,
        status: 'unresolved'
      },
      $set: {
        message: eventData.message,
        sampleStackTrace: eventData.stackTrace || null,
        lastSeen: now,
        environment: eventData.environment,
        release: eventData.release
      },
      $inc: { count: 1 }
    };

    if (projectId) {
      updateFields.$set.projectId = projectId;
    }

    const issue = await Issue.findOneAndUpdate(
      { projectKey, fingerprint },
      updateFields,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 4. Persist the individual ErrorEvent occurrence with compensating rollback
    let errorEvent;
    try {
      errorEvent = await ErrorEvent.create({
        issueId: issue._id,
        projectId,
        fingerprint,
        projectKey,
        timestamp: now,
        type: eventData.type,
        message: eventData.message,
        stackTrace: eventData.stackTrace,
        route: eventData.route,
        service: eventData.service,
        environment: eventData.environment,
        release: eventData.release,
        requestId: eventData.requestId,
        context: eventData.context
      });
    } catch (eventErr) {
      // Compensating action: decrement occurrence count on Issue so count remains accurate
      console.error('[TraceBack Ingestion] ErrorEvent insertion failed, rolling back issue count:', eventErr.message);
      if (issue.count === 1) {
        await Issue.deleteOne({ _id: issue._id });
      } else {
        await Issue.updateOne(
          { _id: issue._id },
          { $inc: { count: -1 } }
        );
      }
      throw eventErr;
    }

    return res.status(201).json({
      status: 'success',
      data: {
        eventId: errorEvent._id,
        issueId: issue._id,
        fingerprint,
        count: issue.count,
        isNewIssue: issue.count === 1
      }
    });
  } catch (err) {
    console.error('[TraceBack Ingestion Error]', err);
    return res.status(500).json({
      error: 'IngestionError',
      message: 'Failed to persist error event to database.'
    });
  }
}
