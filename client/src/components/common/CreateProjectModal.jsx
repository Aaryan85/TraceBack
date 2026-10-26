import React, { useState } from 'react';
import { createProject } from '../../services/api';
import { IconAlertCircle } from '../ui/Icons';

export const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const project = await createProject({ name, description });
      setName('');
      setDescription('');
      onProjectCreated(project);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white border border-[#E5E5E5] rounded-lg max-w-md w-full p-6 shadow-xl text-[#111111]">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] mb-4">
          <h2 className="text-sm font-semibold text-[#111111]">Create New Project</h2>
          <button
            onClick={onClose}
            className="text-xs text-[#888888] hover:text-[#111111]"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-[#FEF2F2] border border-[#FEE2E2] flex items-center gap-2 text-xs text-[#991B1B]">
            <IconAlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production API Gateway"
              required
              disabled={loading}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded text-[#111111] focus:outline-none focus:border-[#111111] disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the service monitored"
              rows={3}
              disabled={loading}
              className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded text-[#111111] focus:outline-none focus:border-[#111111] disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs text-[#666666] hover:text-[#111111] rounded hover:bg-[#F7F7F7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-[#111111] text-white text-xs font-medium rounded hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
