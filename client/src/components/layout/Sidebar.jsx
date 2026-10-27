import React, { useState, useRef, useEffect } from 'react';
import {
  IconActivity,
  IconAlertCircle,
  IconSettings,
  IconTerminal,
  IconLayers,
  IconExternalLink,
  IconChevronRight
} from '../ui/Icons';

export const Sidebar = ({
  currentSection,
  onNavigate,
  user,
  projects = [],
  activeProject,
  onSelectProject,
  onOpenCreateProject,
  onLogout,
  mobileOpen = false,
  onCloseMobile
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: IconActivity },
    { id: 'issues', label: 'Issues', icon: IconAlertCircle },
    { id: 'setup', label: 'SDK Integration', icon: IconTerminal },
    { id: 'settings', label: 'Project Settings', icon: IconSettings }
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#F7F7F7] border-r border-[#E5E5E5] flex flex-col justify-between select-none
        transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:h-screen md:shrink-0
        ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col min-h-0">
          {/* Brand Header */}
          <div className="h-12 px-4 flex items-center justify-between border-b border-[#E5E5E5] bg-white">
            <div
              onClick={() => {
                onNavigate('landing');
                onCloseMobile && onCloseMobile();
              }}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
              title="Return to Public Homepage"
            >
              <div className="w-6 h-6 rounded bg-[#111111] flex items-center justify-center text-white">
                <span className="font-mono text-xs font-bold leading-none">T</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold tracking-tight text-[#111111]">TraceBack</span>
                <span className="text-[10px] text-[#888888] font-mono leading-none">v1.0.0</span>
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 text-[#888888] hover:text-[#111111] rounded hover:bg-[#F0F0F0]"
              aria-label="Close menu"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* Dynamic Project Selector Dropdown */}
        <div className="px-3 pt-3 pb-2 relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5E5E5] hover:border-[#CCCCCC] flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={`w-1.5 h-1.5 rounded-full ${activeProject?.status === 'active' ? 'bg-[#16A34A]' : 'bg-[#D97706]'}`} />
              <span className="text-xs font-medium text-[#111111] truncate max-w-[120px]">
                {activeProject?.name || 'No Project'}
              </span>
            </div>
            <span className="text-[10px] text-[#888888] font-mono">▾</span>
          </button>

          {dropdownOpen && (
            <div className="absolute left-3 right-3 top-11 bg-white border border-[#E5E5E5] rounded shadow-lg z-50 py-1 max-h-56 overflow-y-auto">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[#888888] uppercase tracking-wider">
                Your Projects ({projects.length})
              </div>
              {projects.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-[#888888]">No projects found.</div>
              ) : (
                projects.map((proj) => {
                  const isSelected = activeProject?._id === proj._id;
                  return (
                    <button
                      key={proj._id}
                      onClick={() => {
                        onSelectProject(proj);
                        setDropdownOpen(false);
                      }}
                      className={`w-full px-2.5 py-1.5 text-xs text-left flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-[#F7F7F7] font-semibold text-[#111111]' : 'text-[#666666] hover:bg-[#FAFAFA] hover:text-[#111111]'
                      }`}
                    >
                      <span className="truncate max-w-[140px]">{proj.name}</span>
                      {isSelected && <span className="text-[10px] text-[#16A34A] font-mono">active</span>}
                    </button>
                  );
                })
              )}

              <div className="border-t border-[#E5E5E5] mt-1 pt-1">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenCreateProject();
                  }}
                  className="w-full px-2.5 py-1.5 text-xs text-left text-[#111111] font-medium hover:bg-[#F7F7F7] flex items-center gap-1.5 transition-colors"
                >
                  <span>+ Create New Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className="px-2 py-1 space-y-0.5 overflow-y-auto">
          <div className="px-2.5 py-1 text-[10px] font-semibold text-[#888888] uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile && onCloseMobile();
                }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors text-left ${
                  isActive
                    ? 'bg-white text-[#111111] border border-[#E5E5E5] shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                    : 'text-[#666666] hover:text-[#111111] hover:bg-[#F0F0F0]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#111111]' : 'text-[#888888]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 px-2.5 py-1 text-[10px] font-semibold text-[#888888] uppercase tracking-wider">
            Public Site
          </div>
          <button
            onClick={() => {
              onNavigate('landing');
              onCloseMobile && onCloseMobile();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded text-[#666666] hover:text-[#111111] hover:bg-[#F0F0F0] transition-colors text-left"
          >
            <IconExternalLink className="w-3.5 h-3.5 text-[#888888]" />
            <span>Public Homepage</span>
          </button>
        </nav>
      </div>

      {/* User Footer with Profile & Logout */}
      <div className="p-3 border-t border-[#E5E5E5] bg-white">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-[10px] font-semibold shrink-0 uppercase">
                  {user.name ? user.name[0] : 'U'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-[#111111] truncate">{user.name}</div>
                  <div className="text-[10px] text-[#888888] truncate">{user.email}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onCloseMobile && onCloseMobile();
              }}
              className="w-full py-1 px-2 border border-[#E5E5E5] rounded text-[11px] font-medium text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] transition-colors text-center"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-[11px] text-[#666666]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              Ingestion active
            </span>
            <span className="font-mono text-[10px] text-[#888888]">:3000</span>
          </div>
        )}
      </div>
    </aside>
  </>
  );
};
