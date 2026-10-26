import mongoose from 'mongoose';
import { Project, Issue, ErrorEvent } from '../models/index.js';
import { generateProjectKey } from '../services/passwordService.js';

/**
 * GET /api/projects
 * List all projects owned by authenticated user
 */
export async function getProjects(req, res) {
  try {
    const projects = await Project.find({ owner: req.user._id })
      .sort({ status: 1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      status: 'success',
      projects
    });
  } catch (err) {
    console.error('[TraceBack] Failed to list projects:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to retrieve projects.'
    });
  }
}

/**
 * POST /api/projects
 * Create a new project for authenticated user
 */
export async function createProject(req, res) {
  try {
    const { name, description } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Project name is required.'
      });
    }

    const apiKey = generateProjectKey();

    const project = await Project.create({
      name: name.trim(),
      description: (description || '').trim(),
      owner: req.user._id,
      apiKey,
      status: 'active'
    });

    return res.status(201).json({
      status: 'success',
      project
    });
  } catch (err) {
    console.error('[TraceBack] Failed to create project:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to create project.'
    });
  }
}

/**
 * GET /api/projects/:id
 * Retrieve a single project owned by authenticated user
 */
export async function getProjectById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid project ID format.'
      });
    }

    const project = await Project.findOne({
      _id: id,
      owner: req.user._id
    }).lean();

    if (!project) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Project not found or access denied.'
      });
    }

    // Attach basic count stats
    const [issueCount, eventCount] = await Promise.all([
      Issue.countDocuments({
        $or: [{ projectId: project._id }, { projectKey: project.apiKey }]
      }),
      ErrorEvent.countDocuments({
        $or: [{ projectId: project._id }, { projectKey: project.apiKey }]
      })
    ]);

    return res.status(200).json({
      status: 'success',
      project: {
        ...project,
        stats: {
          issueCount,
          eventCount
        }
      }
    });
  } catch (err) {
    console.error('[TraceBack] Failed to get project:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to retrieve project.'
    });
  }
}

/**
 * PATCH /api/projects/:id
 * Update project details (name, description, status)
 */
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid project ID format.'
      });
    }

    const updates = {};
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'BadRequest', message: 'Project name cannot be empty.' });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = String(description).trim();
    }

    if (status !== undefined) {
      if (!['active', 'archived'].includes(status)) {
        return res.status(400).json({ error: 'BadRequest', message: 'Status must be active or archived.' });
      }
      updates.status = status;
    }

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { $set: updates },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Project not found or access denied.'
      });
    }

    return res.status(200).json({
      status: 'success',
      project
    });
  } catch (err) {
    console.error('[TraceBack] Failed to update project:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to update project.'
    });
  }
}

/**
 * DELETE /api/projects/:id
 * Delete or archive project owned by authenticated user
 */
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid project ID format.'
      });
    }

    const project = await Project.findOneAndDelete({
      _id: id,
      owner: req.user._id
    });

    if (!project) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Project not found or access denied.'
      });
    }

    // Clean up associated issues and events
    await Promise.all([
      Issue.deleteMany({
        $or: [{ projectId: project._id }, { projectKey: project.apiKey }]
      }),
      ErrorEvent.deleteMany({
        $or: [{ projectId: project._id }, { projectKey: project.apiKey }]
      })
    ]);

    return res.status(200).json({
      status: 'success',
      message: `Project '${project.name}' and all associated telemetry deleted.`
    });
  } catch (err) {
    console.error('[TraceBack] Failed to delete project:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to delete project.'
    });
  }
}

/**
 * POST /api/projects/:id/rotate-key
 * Rotate project ingestion API key
 */
export async function rotateProjectKey(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid project ID format.'
      });
    }

    const newKey = generateProjectKey();

    const project = await Project.findOneAndUpdate(
      { _id: id, owner: req.user._id },
      { $set: { apiKey: newKey } },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Project not found or access denied.'
      });
    }

    return res.status(200).json({
      status: 'success',
      project
    });
  } catch (err) {
    console.error('[TraceBack] Failed to rotate project key:', err);
    return res.status(500).json({
      error: 'ServerError',
      message: 'Failed to rotate project key.'
    });
  }
}
