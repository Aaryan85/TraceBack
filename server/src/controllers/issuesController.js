import mongoose from 'mongoose';
import { Issue, ErrorEvent, Project } from '../models/index.js';
import { config } from '../config/index.js';

/**
 * Resolves the query filter and project scope for dashboard requests.
 * Enforces ownership if user is authenticated; maintains backward compatibility
 * with static key if unauthenticated.
 */
export async function resolveProjectScope(req) {
  const requestedId = req.query.projectId || req.headers['x-project-id'];

  // 1. If a specific project was requested, strictly enforce ownership
  if (requestedId) {
    if (!mongoose.Types.ObjectId.isValid(requestedId)) {
      return { error: 'BadRequest', message: 'Invalid projectId format.', status: 400 };
    }

    if (!req.user) {
      return { error: 'Forbidden', message: 'Authentication required to access project issues.', status: 403 };
    }

    const project = await Project.findOne({ _id: requestedId, owner: req.user._id }).lean();
    if (!project) {
      return { error: 'Forbidden', message: 'Project not found or access denied.', status: 403 };
    }

    return {
      project,
      filter: {
        $or: [{ projectId: project._id }, { projectKey: project.apiKey }]
      }
    };
  }

  // 2. If authenticated without explicit projectId, scope to caller's latest active project
  if (req.user) {
    const project = await Project.findOne({ owner: req.user._id, status: 'active' })
      .sort({ createdAt: -1 })
      .lean();
    if (!project) {
      return { empty: true, project: null, filter: null };
    }

    return {
      project,
      filter: {
        $or: [{ projectId: project._id }, { projectKey: project.apiKey }]
      }
    };
  }

  // 3. Fallback for standalone API testing or legacy keys (when no projectId was requested)
  const projectKey = req.projectKey || req.query.projectKey || config.projectKey;
  return {
    project: null,
    filter: { projectKey }
  };
}

/**
 * GET /api/issues
 * List issues with search, filtering, and pagination scoped to project.
 */
export async function getIssues(req, res) {
  try {
    const scope = await resolveProjectScope(req);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error, message: scope.message });
    }

    if (scope.empty) {
      return res.json({
        issues: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 1 }
      });
    }

    const {
      status = 'unresolved',
      environment,
      search,
      sort = 'lastSeen',
      page = 1,
      limit = 25
    } = req.query;

    const query = { ...scope.filter };

    // Filter by status (unless 'all')
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by environment
    if (environment && environment !== 'all') {
      query.environment = environment;
    }

    // Search by type or message
    if (search && search.trim()) {
      const sanitizedSearch = search.trim();
      query.$and = [
        {
          $or: [
            { type: { $regex: sanitizedSearch, $options: 'i' } },
            { message: { $regex: sanitizedSearch, $options: 'i' } }
          ]
        }
      ];
    }

    const sortOptions = {};
    if (sort === 'count') {
      sortOptions.count = -1;
    } else if (sort === 'firstSeen') {
      sortOptions.firstSeen = -1;
    } else {
      sortOptions.lastSeen = -1;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;

    const [issues, total] = await Promise.all([
      Issue.find(query).sort(sortOptions).skip(skip).limit(limitNum).lean(),
      Issue.countDocuments(query)
    ]);

    return res.json({
      issues,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('[TraceBack] Failed to list issues:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to retrieve issues from database.'
    });
  }
}

/**
 * GET /api/issues/:id
 * Retrieve a single issue and its latest occurrence context with access check.
 */
export async function getIssueById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid issue ID format.'
      });
    }

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Issue with ID ${id} not found.`
      });
    }

    // Check ownership if user is authenticated
    if (req.user) {
      const userProject = await Project.findOne({
        owner: req.user._id,
        $or: [{ _id: issue.projectId }, { apiKey: issue.projectKey }]
      });

      if (!userProject) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this issue.'
        });
      }
    }

    // Retrieve latest event instance for enriched context
    const latestEvent = await ErrorEvent.findOne({
      issueId: issue._id,
      $or: [{ projectId: issue.projectId }, { projectKey: issue.projectKey }]
    })
      .sort({ timestamp: -1 })
      .lean();

    return res.json({
      issue,
      latestEvent: latestEvent || null
    });
  } catch (err) {
    console.error('[TraceBack] Failed to get issue details:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to retrieve issue details.'
    });
  }
}

/**
 * GET /api/issues/:id/events
 * Paginated list of occurrences for a specific issue.
 */
export async function getIssueEvents(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid issue ID format.'
      });
    }

    const issue = await Issue.findById(id).lean();
    if (!issue) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Issue with ID ${id} not found.`
      });
    }

    if (req.user) {
      const userProject = await Project.findOne({
        owner: req.user._id,
        $or: [{ _id: issue.projectId }, { apiKey: issue.projectKey }]
      });

      if (!userProject) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this issue.'
        });
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      ErrorEvent.find({ issueId: id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ErrorEvent.countDocuments({ issueId: id })
    ]);

    return res.json({
      events,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    console.error('[TraceBack] Failed to get issue events:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to retrieve issue events.'
    });
  }
}

/**
 * PATCH /api/issues/:id/status
 * Update issue status (unresolved, resolved, ignored).
 */
export async function updateIssueStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid issue ID format.'
      });
    }

    const validStatuses = ['unresolved', 'resolved', 'ignored'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Issue with ID ${id} not found.`
      });
    }

    if (req.user) {
      const userProject = await Project.findOne({
        owner: req.user._id,
        $or: [{ _id: issue.projectId }, { apiKey: issue.projectKey }]
      });

      if (!userProject) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied to this issue.'
        });
      }
    }

    issue.status = status;
    await issue.save();

    return res.json({
      status: 'success',
      issue
    });
  } catch (err) {
    console.error('[TraceBack] Failed to update issue status:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to update issue status.'
    });
  }
}

/**
 * GET /api/analytics/error-frequency
 * Error frequency distribution and summary metrics scoped to project.
 */
export async function getErrorFrequency(req, res) {
  try {
    const scope = await resolveProjectScope(req);
    if (scope.error) {
      return res.status(scope.status).json({ error: scope.error, message: scope.message });
    }

    if (scope.empty) {
      return res.json({
        summary: { totalIssues: 0, unresolvedIssues: 0, resolvedIssues: 0, events24h: 0 },
        frequency: []
      });
    }

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const issueFilter = { ...scope.filter };
    const eventFilter = { ...scope.filter, timestamp: { $gte: twentyFourHoursAgo } };

    const [
      totalIssues,
      unresolvedIssues,
      resolvedIssues,
      events24h,
      hourlyAggregation
    ] = await Promise.all([
      Issue.countDocuments(issueFilter),
      Issue.countDocuments({ ...issueFilter, status: 'unresolved' }),
      Issue.countDocuments({ ...issueFilter, status: 'resolved' }),
      ErrorEvent.countDocuments(eventFilter),
      ErrorEvent.aggregate([
        { $match: eventFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Anchor to the start of the current UTC hour
    const currentUtcHour = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      0, 0, 0
    ));

    // Build complete 24-hour sequence with zeroes for empty hours
    const frequency = [];
    for (let i = 23; i >= 0; i--) {
      const bucketDate = new Date(currentUtcHour.getTime() - i * 60 * 60 * 1000);
      const hourKey = bucketDate.toISOString().slice(0, 13).replace('T', ' ') + ':00';
      const existing = hourlyAggregation.find(b => b._id === hourKey);
      frequency.push({
        time: bucketDate.toISOString(),
        hourKey,
        hour: bucketDate.getUTCHours() + ':00',
        count: existing ? existing.count : 0
      });
    }

    return res.json({
      summary: {
        totalIssues,
        unresolvedIssues,
        resolvedIssues,
        events24h
      },
      frequency
    });
  } catch (err) {
    console.error('[TraceBack] Failed to get error frequency:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to compute error frequency analytics.'
    });
  }
}
