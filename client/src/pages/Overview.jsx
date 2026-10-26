import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { TableSkeleton, Skeleton } from '../components/ui/Skeleton';
import { Button } from '../components/ui/Button';
import { FrequencyChart } from '../components/issues/FrequencyChart';
import { getOverviewAnalytics, sendTestEvent } from '../services/api';
import { timeAgo } from '../utils/formatters';
import {
  IconActivity,
  IconTerminal,
  IconCheckCircle,
  IconAlertCircle,
  IconRefresh,
  IconChevronRight
} from '../components/ui/Icons';

export const Overview = ({ onNavigateToIssues, onNavigateToSetup, onSelectIssue, activeProject = null, onCreateProject }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getOverviewAnalytics(activeProject?._id);
      setData(res);
    } catch (err) {
      console.error('[Overview] Failed to load telemetry:', err);
      setError(err.message || 'Could not communicate with the TraceBack API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // Poll every 8 seconds for real-time incoming events
    const interval = setInterval(() => {
      loadAnalytics();
    }, 8000);
    return () => clearInterval(interval);
  }, [activeProject?._id]);

  const handleTriggerTest = async () => {
    try {
      setSendingTest(true);
      await sendTestEvent(activeProject?.apiKey);
      await loadAnalytics();
    } catch (err) {
      alert(`Test error failed: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
          <div>
            <Skeleton className="h-5 w-40 mb-1" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><Skeleton className="h-16 w-full" /></Card>
          <Card><Skeleton className="h-16 w-full" /></Card>
          <Card><Skeleton className="h-16 w-full" /></Card>
        </div>
        <Card><TableSkeleton rows={4} /></Card>
      </div>
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        title="Failed to load telemetry"
        message={error}
        onRetry={loadAnalytics}
      />
    );
  }

  const { summary = {}, frequency = [], recentIssues = [] } = data || {};
  const hasErrors = (summary.totalIssues || 0) > 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-base font-semibold text-[#111111] tracking-tight">System Overview</h1>
          <p className="text-xs text-[#666666]">Real-time telemetry and error frequency from monitored services</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleTriggerTest}
            disabled={sendingTest}
            icon={IconTerminal}
          >
            {sendingTest ? 'Sending...' : 'Trigger Test Error'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAnalytics}
            icon={IconRefresh}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row (Real metrics derived from backend) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center justify-between text-xs text-[#666666] mb-1">
            <span>Unresolved Issues</span>
            <span className={`w-2 h-2 rounded-full ${summary.unresolvedIssues > 0 ? 'bg-[#DC2626]' : 'bg-[#16A34A]'}`} />
          </div>
          <div className="text-2xl font-semibold text-[#111111] tracking-tight font-mono">
            {summary.unresolvedIssues || 0}
          </div>
          <div className="mt-2 text-[11px] text-[#888888]">
            {summary.resolvedIssues || 0} resolved of {summary.totalIssues || 0} total
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-[#666666] mb-1">
            <span>Events (Last 24h)</span>
            <IconActivity className="w-3.5 h-3.5 text-[#888888]" />
          </div>
          <div className="text-2xl font-semibold text-[#111111] tracking-tight font-mono">
            {summary.events24h || 0}
          </div>
          <div className="mt-2 text-[11px] text-[#888888]">
            {summary.events24h === 0 ? 'No error spikes detected' : 'Aggregated inbound events'}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between text-xs text-[#666666] mb-1">
            <span>Active Release</span>
            <span className="font-mono text-[10px] text-[#888888]">target</span>
          </div>
          <div className="text-sm font-semibold text-[#111111] tracking-tight font-mono mt-1">
            {recentIssues[0]?.release || 'v1.0.0-demo'}
          </div>
          <div className="mt-2 text-[11px] text-[#888888]">
            Environment: <span className="font-mono text-[#111111]">{recentIssues[0]?.environment || 'production'}</span>
          </div>
        </Card>
      </div>

      {/* 24-Hour Error Frequency Chart Card */}
      <Card header="Error Frequency (Last 24 Hours)">
        <FrequencyChart data={frequency} total24h={summary.events24h || 0} />
      </Card>

      {/* Recent Unresolved Issues */}
      <Card
        header="Recent Unresolved Issues"
        action={
          hasErrors ? (
            <button
              onClick={onNavigateToIssues}
              className="text-xs text-[#666666] hover:text-[#111111] inline-flex items-center gap-1 font-medium transition-colors"
            >
              View all issues <IconChevronRight className="w-3 h-3" />
            </button>
          ) : null
        }
      >
        {!hasErrors ? (
          <EmptyState
            icon={IconCheckCircle}
            title="No errors recorded yet"
            description="TraceBack is actively listening for error telemetry. You can test ingestion immediately using the button below or trigger an error from the demo app."
            actionLabel={sendingTest ? "Sending Test Error..." : "Trigger Test Error"}
            onAction={handleTriggerTest}
          />
        ) : recentIssues.length === 0 ? (
          <EmptyState
            icon={IconCheckCircle}
            title="All issues resolved"
            description="There are currently no active unresolved issues in this environment."
            actionLabel="View Resolved Issues"
            onAction={onNavigateToIssues}
          />
        ) : (
          <div className="divide-y divide-[#E5E5E5] -mx-4 -my-4">
            {recentIssues.map((issue) => (
              <div
                key={issue._id}
                onClick={() => onSelectIssue && onSelectIssue(issue)}
                className="px-4 py-3 hover:bg-[#F7F7F7] cursor-pointer transition-colors flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#DC2626] shrink-0" />
                    <span className="text-xs font-semibold text-[#111111] font-mono truncate">
                      {issue.type}
                    </span>
                    <Badge variant="tag">{issue.environment || 'production'}</Badge>
                  </div>
                  <p className="text-xs text-[#666666] font-mono truncate pl-4">
                    {issue.message}
                  </p>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-xs">
                  <div className="text-center font-mono">
                    <span className="text-[#111111] font-semibold">{issue.count}</span>
                    <span className="text-[#888888] text-[10px] block">events</span>
                  </div>
                  <div className="text-right text-[11px] text-[#888888] font-mono min-w-[70px]">
                    {timeAgo(issue.lastSeen)}
                  </div>
                  <IconChevronRight className="w-3.5 h-3.5 text-[#888888]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
