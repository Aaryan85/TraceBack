import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getIssues, updateIssueStatus } from '../services/api';
import { timeAgo } from '../utils/formatters';
import {
  IconSearch,
  IconFilter,
  IconAlertCircle,
  IconCheckCircle,
  IconRefresh,
  IconChevronRight
} from '../components/ui/Icons';

export const Issues = ({ onSelectIssue, onNavigateToSetup, activeProject = null }) => {
  const [filterTab, setFilterTab] = useState('unresolved'); // 'unresolved' | 'resolved' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('lastSeen');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ issues: [], pagination: { total: 0, totalPages: 1 } });
  const [updatingId, setUpdatingId] = useState(null);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getIssues({
        projectId: activeProject?._id,
        status: filterTab,
        search: searchQuery,
        sort: sortField,
        page,
        limit: 15
      });
      setData(res);
    } catch (err) {
      console.error('[Issues] Failed to fetch issues:', err);
      setError(err.message || 'Could not load issues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
    const interval = setInterval(() => {
      loadIssues();
    }, 8000);
    return () => clearInterval(interval);
  }, [activeProject?._id, filterTab, sortField, page]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadIssues();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleToggleStatus = async (e, issue) => {
    e.stopPropagation();
    const newStatus = issue.status === 'resolved' ? 'unresolved' : 'resolved';
    try {
      setUpdatingId(issue._id);
      await updateIssueStatus(issue._id, newStatus);
      await loadIssues();
    } catch (err) {
      alert(`Failed to update issue: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const { issues = [], pagination = { total: 0, totalPages: 1 } } = data;

  return (
    <div className="space-y-4">
      {/* Page Title & Search / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-base font-semibold text-[#111111] tracking-tight">Issues</h1>
          <p className="text-xs text-[#666666]">Aggregated error groups and stack traces</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-none min-w-[180px]">
            <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
            <input
              type="text"
              placeholder="Search type or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-[#E5E5E5] rounded bg-white text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] w-full sm:w-64"
            />
          </div>

          {/* Sort Selector */}
          <select
            value={sortField}
            onChange={(e) => { setSortField(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 text-xs border border-[#E5E5E5] rounded bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
          >
            <option value="lastSeen">Sort: Last Seen</option>
            <option value="count">Sort: Event Count</option>
            <option value="firstSeen">Sort: First Seen</option>
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadIssues}
            icon={IconRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-[#E5E5E5] text-xs">
        <div className="flex items-center gap-6">
          <button
            onClick={() => { setFilterTab('unresolved'); setPage(1); }}
            className={`py-2 border-b-2 font-medium transition-colors ${
              filterTab === 'unresolved'
                ? 'border-[#111111] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            Unresolved
          </button>
          <button
            onClick={() => { setFilterTab('resolved'); setPage(1); }}
            className={`py-2 border-b-2 font-medium transition-colors ${
              filterTab === 'resolved'
                ? 'border-[#111111] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            Resolved
          </button>
          <button
            onClick={() => { setFilterTab('all'); setPage(1); }}
            className={`py-2 border-b-2 font-medium transition-colors ${
              filterTab === 'all'
                ? 'border-[#111111] text-[#111111]'
                : 'border-transparent text-[#666666] hover:text-[#111111]'
            }`}
          >
            All Issues
          </button>
        </div>

        <div className="flex items-center gap-2 pb-1.5 text-xs text-[#888888] font-mono">
          <span>{pagination.total} {pagination.total === 1 ? 'issue' : 'issues'} found</span>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <Card>
          <TableSkeleton rows={6} />
        </Card>
      ) : error ? (
        <ErrorState
          title="Failed to load issues"
          message={error}
          onRetry={loadIssues}
        />
      ) : issues.length === 0 ? (
        <Card>
          <EmptyState
            icon={IconCheckCircle}
            title={
              searchQuery
                ? `No issues matching "${searchQuery}"`
                : filterTab === 'resolved'
                ? "No resolved issues"
                : "No issues captured yet"
            }
            description={
              filterTab === 'resolved'
                ? "Resolved issues will appear here for historical reference."
                : "Your services are clean. Trigger an error from the demo app or project setup to test ingestion."
            }
            actionLabel={searchQuery ? "Clear Search" : "View Setup Guide"}
            onAction={searchQuery ? () => setSearchQuery('') : onNavigateToSetup}
          />
        </Card>
      ) : (
        <div className="border border-[#E5E5E5] rounded-md overflow-x-auto bg-white shadow-none">
          <div className="min-w-[600px]">
            {/* Table Headers */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-[#F7F7F7] border-b border-[#E5E5E5] text-[11px] font-medium text-[#666666] uppercase tracking-wider">
              <div className="col-span-7">Issue & Message</div>
              <div className="col-span-2 text-center">Events</div>
              <div className="col-span-3 text-right">Last Seen</div>
            </div>

          {/* Table Body */}
          <div className="divide-y divide-[#E5E5E5]">
            {issues.map((issue) => {
              const isResolved = issue.status === 'resolved';

              return (
                <div
                  key={issue._id}
                  onClick={() => onSelectIssue(issue)}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-[#F7F7F7] cursor-pointer items-center transition-colors group"
                >
                  {/* Issue Type & Message */}
                  <div className="col-span-7 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isResolved ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                        }`}
                      />
                      <span className="text-xs font-semibold text-[#111111] font-mono truncate">
                        {issue.type}
                      </span>
                      <Badge variant="tag">{issue.environment || 'production'}</Badge>
                      {isResolved && (
                        <Badge variant="resolved" className="text-[10px] py-0">
                          resolved
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-[#666666] font-mono truncate pl-4">
                      {issue.message}
                    </p>
                  </div>

                  {/* Occurrence Count */}
                  <div className="col-span-2 text-center font-mono">
                    <span className="text-xs font-semibold text-[#111111] px-2 py-0.5 rounded bg-[#F7F7F7] border border-[#E5E5E5]">
                      {issue.count}
                    </span>
                  </div>

                  {/* Last Seen & Quick Resolve */}
                  <div className="col-span-3 flex items-center justify-end gap-3 text-right">
                    <span className="text-xs text-[#888888] font-mono">
                      {timeAgo(issue.lastSeen)}
                    </span>

                    {/* Quick Resolve Button */}
                    <button
                      onClick={(e) => handleToggleStatus(e, issue)}
                      disabled={updatingId === issue._id}
                      className="opacity-0 group-hover:opacity-100 px-2 py-1 text-[11px] font-medium rounded border border-[#E5E5E5] bg-white hover:bg-[#F2F2F2] text-[#111111] transition-all"
                    >
                      {updatingId === issue._id ? '...' : isResolved ? 'Reopen' : 'Resolve'}
                    </button>

                    <IconChevronRight className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5E5] bg-[#F7F7F7] text-xs">
              <span className="text-[#666666] font-mono">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};
