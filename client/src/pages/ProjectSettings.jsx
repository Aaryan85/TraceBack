import React, { useState } from 'react';
import { updateProject, deleteProject, rotateProjectKey } from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  IconCopy,
  IconCheck,
  IconRefresh,
  IconShield,
  IconTerminal,
  IconAlertCircle,
  IconCheckCircle
} from '../components/ui/Icons';

export const ProjectSettings = ({ activeProject, onProjectUpdated, onProjectDeleted }) => {
  const [name, setName] = useState(activeProject?.name || '');
  const [description, setDescription] = useState(activeProject?.description || '');
  const [apiKey, setApiKey] = useState(activeProject?.apiKey || '');
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  if (!activeProject) {
    return (
      <div className="p-8 text-center bg-[#F7F7F7] border border-[#E5E5E5] rounded-md">
        <IconAlertCircle className="w-8 h-8 text-[#888888] mx-auto mb-2" />
        <h3 className="text-sm font-semibold text-[#111111]">No Project Selected</h3>
        <p className="text-xs text-[#666666] mt-1">Please select or create a project from the sidebar.</p>
      </div>
    );
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);
      const updated = await updateProject(activeProject._id, { name, description });
      setMessage('Project details saved successfully.');
      onProjectUpdated(updated);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update project.');
    } finally {
      setSaving(false);
    }
  };

  const handleRotateKey = async () => {
    if (!window.confirm('Are you sure you want to rotate this ingestion key? Existing applications using the old key will stop delivering events until updated.')) {
      return;
    }

    try {
      setRotating(true);
      setError(null);
      setMessage(null);
      const updated = await rotateProjectKey(activeProject._id);
      setApiKey(updated.apiKey);
      setMessage('Ingestion API key rotated successfully. Remember to update your application .env.');
      onProjectUpdated(updated);
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || 'Failed to rotate key.');
    } finally {
      setRotating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete '${activeProject.name}'? This will permanently delete all issues, stack traces, and historical telemetry for this project.`)) {
      return;
    }

    try {
      setDeleting(true);
      await deleteProject(activeProject._id);
      onProjectDeleted(activeProject._id);
    } catch (err) {
      setError(err.message || 'Failed to delete project.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title Header */}
      <div className="pb-4 border-b border-[#E5E5E5]">
        <h1 className="text-base font-semibold text-[#111111] tracking-tight">Project Settings</h1>
        <p className="text-xs text-[#666666]">Manage project metadata, secure ingestion keys, and workspace lifecycle</p>
      </div>

      {message && (
        <div className="p-3 rounded bg-[#F0FDF4] border border-[#DCFCE7] flex items-center gap-2 text-xs text-[#166534]">
          <IconCheckCircle className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded bg-[#FEF2F2] border border-[#FEE2E2] flex items-center gap-2 text-xs text-[#991B1B]">
          <IconAlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* General Settings */}
      <Card className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#888888] mb-4">
          General Details
        </h2>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full max-w-md px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#111111] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Primary Node.js API Gateway or billing microservice"
              className="w-full max-w-md px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded text-[#111111] focus:outline-none focus:border-[#111111]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-[#111111] text-white text-xs font-medium rounded hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Card>

      {/* Ingestion Key Management */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
              Project Ingestion Key
            </h2>
            <p className="text-xs text-[#666666] mt-1">
              Authenticate error telemetry dispatches from your application's SDK. Keep this secret.
            </p>
          </div>
          <button
            onClick={handleRotateKey}
            disabled={rotating}
            className="self-start sm:self-auto px-2.5 py-1 text-xs text-[#111111] border border-[#E5E5E5] rounded hover:bg-[#F7F7F7] flex items-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${rotating ? 'animate-spin' : ''}`} />
            <span>{rotating ? 'Rotating...' : 'Rotate Key'}</span>
          </button>
        </div>

        <div className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <code className="text-xs font-mono font-medium text-[#111111] truncate select-all">
            {apiKey}
          </code>
          <button
            onClick={() => copyToClipboard(apiKey)}
            className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded text-xs text-[#111111] hover:bg-[#F0F0F0] flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {copiedKey ? (
              <>
                <IconCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                <span className="text-[#16A34A] font-medium">Copied</span>
              </>
            ) : (
              <>
                <IconCopy className="w-3.5 h-3.5 text-[#666666]" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-3 text-[11px] text-[#888888] font-mono">
          Header: <code>X-Project-Key: {apiKey}</code>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-5 border-[#FEE2E2]">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#DC2626] mb-1">
          Danger Zone
        </h2>
        <p className="text-xs text-[#666666] mb-4">
          Permanently delete this project and all associated issues, stack traces, and historical occurrences.
        </p>

        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2 bg-[#DC2626] text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {deleting ? 'Deleting...' : 'Delete Project Permanently'}
        </button>
      </Card>
    </div>
  );
};
