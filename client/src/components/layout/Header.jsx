import React from 'react';
import { IconChevronRight, IconRefresh } from '../ui/Icons';
import { Button } from '../ui/Button';

export const Header = ({
  currentSection,
  selectedIssue = null,
  onBackToIssues,
  onRefresh,
  isRefreshing = false,
  onNavigate,
  activeProject = null
}) => {
  const getSectionTitle = () => {
    switch (currentSection) {
      case 'overview': return 'Overview';
      case 'issues': return 'Issues';
      case 'issue-detail': return 'Issue Detail';
      case 'setup': return 'SDK Integration';
      case 'settings': return 'Project Settings';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="h-12 bg-white border-b border-[#E5E5E5] px-6 flex items-center justify-between shrink-0 select-none">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-xs text-[#666666]">
        <button
          onClick={() => onNavigate && onNavigate('landing')}
          className="text-[#888888] hover:text-[#111111] transition-colors font-medium"
          title="Return to Public Homepage"
        >
          TraceBack
        </button>
        <IconChevronRight className="w-3 h-3 text-[#CCCCCC]" />

        {activeProject && (
          <>
            <span className="text-[#666666] font-medium max-w-[140px] truncate">
              {activeProject.name}
            </span>
            <IconChevronRight className="w-3 h-3 text-[#CCCCCC]" />
          </>
        )}
        
        {selectedIssue && currentSection === 'issue-detail' ? (
          <>
            <button
              onClick={onBackToIssues}
              className="hover:text-[#111111] transition-colors"
            >
              Issues
            </button>
            <IconChevronRight className="w-3 h-3 text-[#CCCCCC]" />
            <span className="font-mono text-[#111111] font-medium max-w-[200px] truncate">
              {selectedIssue.type || 'Issue'}
            </span>
          </>
        ) : (
          <span className="text-[#111111] font-medium">{getSectionTitle()}</span>
        )}
      </div>

      {/* Header Controls & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F7F7F7] border border-[#E5E5E5] text-[11px] font-mono text-[#666666]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            environment: production
          </span>
        </div>

        {onRefresh && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            icon={IconRefresh}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
      </div>
    </header>
  );
};
