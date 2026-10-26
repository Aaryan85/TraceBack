import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Skeleton } from '../components/ui/Skeleton';
import { getIssueById, getIssueEvents, updateIssueStatus } from '../services/api';
import { timeAgo, formatDateTime } from '../utils/formatters';
import {
  IconCheckCircle,
  IconCopy,
  IconCheck,
  IconTerminal,
  IconAlertCircle,
  IconChevronRight,
  IconRefresh
} from '../components/ui/Icons';

export const IssueDetail = ({ issue: initialIssue, onBackToIssues }) => {
  const [issueData, setIssueData] = useState(null);
  const [eventsData, setEventsData] = useState([]);
  const [activeTab, setActiveTab] = useState('stack'); // 'stack' | 'events'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState(null);

  const issueId = initialIssue?._id;

  const loadDetails = async () => {
    if (!issueId) return;
    try {
      setLoading(true);
      setError(null);
      const [issueRes, eventsRes] = await Promise.all([
        getIssueById(issueId),
        getIssueEvents(issueId, { limit: 20 })
      ]);
      setIssueData(issueRes);
      setEventsData(eventsRes.events || []);
    } catch (err) {
      console.error('[IssueDetail] Failed to load details:', err);
      setError(err.message || 'Failed to load issue details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [issueId]);

  if (!initialIssue) {
    return (
      <EmptyState
        icon={IconAlertCircle}
        title="No Issue Selected"
        description="Select an issue from the issues list to inspect stack frames and occurrence telemetry."
        actionLabel="Back to Issues"
        onAction={onBackToIssues}
      />
    );
  }

  const currentIssue = issueData?.issue || initialIssue;
  const isResolved = currentIssue.status === 'resolved';

  const handleToggleStatus = async () => {
    const newStatus = isResolved ? 'unresolved' : 'resolved';
    try {
      setUpdatingStatus(true);
      const res = await updateIssueStatus(currentIssue._id, newStatus);
      setIssueData(prev => ({
        ...prev,
        issue: res.issue
      }));
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCopyStackTrace = () => {
    const stack = currentIssue.sampleStackTrace;
    if (stack) {
      navigator.clipboard.writeText(stack);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Detail Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={isResolved ? 'resolved' : 'unresolved'} dot>
              {currentIssue.status}
            </Badge>
            <span className="font-mono text-xs text-[#888888]">
              {currentIssue.fingerprint?.slice(0, 12)}
            </span>
            <Badge variant="tag">{currentIssue.environment || 'production'}</Badge>
            <span className="text-[11px] font-mono text-[#888888]">
              last seen {timeAgo(currentIssue.lastSeen)}
            </span>
          </div>

          <h1 className="text-lg font-semibold text-[#111111] font-mono tracking-tight truncate">
            {currentIssue.type}
          </h1>
          <p className="text-xs text-[#666666] font-mono max-w-3xl break-words leading-relaxed">
            {currentIssue.message}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={isResolved ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleToggleStatus}
            disabled={updatingStatus}
            icon={IconCheckCircle}
          >
            {updatingStatus ? 'Updating...' : isResolved ? 'Reopen Issue' : 'Mark as Resolved'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDetails}
            icon={IconRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metadata Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[10px] font-semibold text-[#888888] uppercase">Total Occurrences</div>
          <div className="text-base font-semibold text-[#111111] font-mono mt-0.5">
            {currentIssue.count}
          </div>
        </div>
        <div className="p-3 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[10px] font-semibold text-[#888888] uppercase">First Seen</div>
          <div className="text-xs font-mono text-[#111111] mt-1">
            {formatDateTime(currentIssue.firstSeen)}
          </div>
        </div>
        <div className="p-3 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[10px] font-semibold text-[#888888] uppercase">Last Seen</div>
          <div className="text-xs font-mono text-[#111111] mt-1">
            {formatDateTime(currentIssue.lastSeen)}
          </div>
        </div>
        <div className="p-3 bg-white border border-[#E5E5E5] rounded">
          <div className="text-[10px] font-semibold text-[#888888] uppercase">Release</div>
          <div className="text-xs font-mono text-[#111111] mt-1">
            {currentIssue.release || 'v1.0.0'}
          </div>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className="flex items-center gap-6 border-b border-[#E5E5E5] text-xs">
        <button
          onClick={() => setActiveTab('stack')}
          className={`py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'stack'
              ? 'border-[#111111] text-[#111111]'
              : 'border-transparent text-[#666666] hover:text-[#111111]'
          }`}
        >
          Stack Trace
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'events'
              ? 'border-[#111111] text-[#111111]'
              : 'border-transparent text-[#666666] hover:text-[#111111]'
          }`}
        >
          Event History ({eventsData.length})
        </button>
      </div>

      {/* Tab 1: Stack Trace Card */}
      {activeTab === 'stack' && (
        <Card
          header="Sample Stack Trace"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyStackTrace}
              icon={copied ? IconCheck : IconCopy}
            >
              {copied ? 'Copied' : 'Copy Trace'}
            </Button>
          }
        >
          <div className="bg-[#F7F7F7] border border-[#E5E5E5] rounded p-4 font-mono text-xs overflow-x-auto text-[#111111] leading-relaxed">
            <pre>{currentIssue.sampleStackTrace || 'No stack trace captured for this issue.'}</pre>
          </div>
        </Card>
      )}

      {/* Tab 2: Event Occurrence History */}
      {activeTab === 'events' && (
        <Card header="Recent Event Occurrences">
          {eventsData.length === 0 ? (
            <p className="text-xs text-[#888888] py-4 text-center">
              No historical events recorded.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E5E5] -mx-4 -my-4">
              {eventsData.map((event) => {
                const isExpanded = expandedEventId === event._id;
                return (
                  <div key={event._id} className="p-4 hover:bg-[#FAFAFA] transition-colors">
                    <div
                      onClick={() => setExpandedEventId(isExpanded ? null : event._id)}
                      className="flex items-center justify-between cursor-pointer select-none text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[#111111] font-semibold">
                          {event.route || 'Background Task'}
                        </span>
                        <Badge variant="tag">{event.service || 'api-server'}</Badge>
                        {event.requestId && (
                          <span className="font-mono text-[11px] text-[#888888]">
                            req: {event.requestId}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[#888888] font-mono text-[11px]">
                        <span>{formatDateTime(event.timestamp)}</span>
                        <IconChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* Expandable Context & Telemetry Payload */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-[#E5E5E5] space-y-3 font-mono text-xs">
                        {event.context && Object.keys(event.context).length > 0 && (
                          <div>
                            <div className="text-[10px] font-semibold text-[#888888] uppercase mb-1">
                              Sanitized Request Context
                            </div>
                            <pre className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded overflow-x-auto text-[#111111] text-[11px]">
                              {JSON.stringify(event.context, null, 2)}
                            </pre>
                          </div>
                        )}
                        {event.stackTrace && (
                          <div>
                            <div className="text-[10px] font-semibold text-[#888888] uppercase mb-1">
                              Instance Stack Trace
                            </div>
                            <pre className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded overflow-x-auto text-[#111111] text-[11px]">
                              {event.stackTrace}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
