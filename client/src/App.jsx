import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Overview } from './pages/Overview';
import { Issues } from './pages/Issues';
import { IssueDetail } from './pages/IssueDetail';
import { ProjectSetup } from './pages/ProjectSetup';
import { ProjectSettings } from './pages/ProjectSettings';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CreateProjectModal } from './components/common/CreateProjectModal';
import { getMe, logoutUser, getProjects } from './services/api';
import { IconAlertCircle } from './components/ui/Icons';

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);

  // Determine initial view from hash
  const getInitialSection = () => {
    const hash = window.location.hash.replace('#', '');
    if (['landing', 'login', 'signup', 'overview', 'issues', 'setup', 'settings'].includes(hash)) {
      return hash;
    }
    return 'landing';
  };

  const [currentSection, setCurrentSection] = useState(getInitialSection);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load active user and project list on startup
  useEffect(() => {
    let isMounted = true;
    async function initSession() {
      try {
        setAuthLoading(true);
        const me = await getMe();
        if (me && isMounted) {
          setUser(me);
          const userProjects = await getProjects();
          if (isMounted) {
            setProjects(userProjects);
            if (userProjects.length > 0) {
              setActiveProject(userProjects[0]);
            }
          }
        }
      } catch (err) {
        console.warn('[TraceBack] Session verification error:', err.message);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }

    initSession();
    return () => { isMounted = false; };
  }, []);

  // Listen to hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (['landing', 'login', 'signup', 'overview', 'issues', 'setup', 'settings'].includes(hash)) {
        setCurrentSection(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (section) => {
    // If not authenticated and trying to enter workspace, redirect to login
    const workspaceSections = ['overview', 'issues', 'issue-detail', 'setup', 'settings'];
    if (!user && workspaceSections.includes(section)) {
      setCurrentSection('login');
      window.location.hash = 'login';
      return;
    }

    setCurrentSection(section);
    setMobileMenuOpen(false);
    if (section !== 'issue-detail') {
      setSelectedIssue(null);
      window.location.hash = section;
    }
  };

  const handleSelectIssue = (issue) => {
    setSelectedIssue(issue);
    setCurrentSection('issue-detail');
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  // Auth Handlers
  const handleLoginSuccess = async (authenticatedUser) => {
    setUser(authenticatedUser);
    const userProjects = await getProjects();
    setProjects(userProjects);
    if (userProjects.length > 0) {
      setActiveProject(userProjects[0]);
    }
    handleNavigate('overview');
  };

  const handleSignupSuccess = (newUser, defaultProject) => {
    setUser(newUser);
    if (defaultProject) {
      setProjects([defaultProject]);
      setActiveProject(defaultProject);
    }
    handleNavigate('overview');
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn('[TraceBack] Logout error:', err.message);
    }
    setUser(null);
    setProjects([]);
    setActiveProject(null);
    handleNavigate('landing');
  };

  // Project Handlers
  const handleProjectCreated = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
    setActiveProject(newProject);
  };

  const handleProjectUpdated = (updatedProject) => {
    setProjects((prev) =>
      prev.map((p) => (p._id === updatedProject._id ? updatedProject : p))
    );
    if (activeProject?._id === updatedProject._id) {
      setActiveProject(updatedProject);
    }
  };

  const handleProjectDeleted = (deletedId) => {
    setProjects((prev) => prev.filter((p) => p._id !== deletedId));
    setActiveProject((prev) => {
      if (prev?._id === deletedId) {
        const remaining = projects.filter((p) => p._id !== deletedId);
        return remaining.length > 0 ? remaining[0] : null;
      }
      return prev;
    });
    handleNavigate('overview');
  };

  // 1. Initial Loading Spinner
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white text-[#111111]">
        <div className="w-7 h-7 rounded bg-[#111111] flex items-center justify-center text-white font-mono font-bold text-xs mb-3 animate-pulse">
          T
        </div>
        <span className="text-xs text-[#888888] font-mono">Restoring workspace session...</span>
      </div>
    );
  }

  // 2. Public Marketing Homepage
  if (currentSection === 'landing') {
    return (
      <LandingPage
        user={user}
        onNavigateToDashboard={(target = 'overview') => handleNavigate(target)}
        onNavigateToSetup={() => handleNavigate('setup')}
        onNavigateToLogin={() => handleNavigate('login')}
        onNavigateToSignup={() => handleNavigate('signup')}
      />
    );
  }

  // 3. Login Page
  if (currentSection === 'login') {
    if (user) {
      handleNavigate('overview');
      return null;
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onNavigateToSignup={() => handleNavigate('signup')}
        onNavigateToHome={() => handleNavigate('landing')}
      />
    );
  }

  // 4. Signup Page
  if (currentSection === 'signup') {
    if (user) {
      handleNavigate('overview');
      return null;
    }
    return (
      <Signup
        onSignupSuccess={handleSignupSuccess}
        onNavigateToLogin={() => handleNavigate('login')}
        onNavigateToHome={() => handleNavigate('landing')}
      />
    );
  }

  // 5. Protected Workspace Guard
  if (!user) {
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onNavigateToSignup={() => handleNavigate('signup')}
        onNavigateToHome={() => handleNavigate('landing')}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#111111] relative">
      {/* Sidebar with Project Switcher & User Profile */}
      <Sidebar
        currentSection={currentSection}
        onNavigate={handleNavigate}
        user={user}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(proj) => setActiveProject(proj)}
        onOpenCreateProject={() => setIsCreateProjectOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <Header
          currentSection={currentSection}
          selectedIssue={selectedIssue}
          onBackToIssues={() => handleNavigate('issues')}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onNavigate={handleNavigate}
          activeProject={activeProject}
          onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 bg-white">
          <div className="max-w-6xl mx-auto">
            {/* Empty State for User with No Projects */}
            {projects.length === 0 ? (
              <div className="p-12 text-center bg-[#F7F7F7] border border-[#E5E5E5] rounded-md max-w-lg mx-auto mt-10">
                <div className="w-10 h-10 rounded bg-[#111111] flex items-center justify-center text-white font-mono font-bold text-sm mx-auto mb-4">
                  T
                </div>
                <h2 className="text-base font-semibold text-[#111111] tracking-tight">
                  Welcome to TraceBack, {user.name}!
                </h2>
                <p className="text-xs text-[#666666] mt-2 mb-6 leading-relaxed">
                  You don't have any projects in your workspace yet. Create your first project to receive an ingestion API key and start monitoring errors.
                </p>
                <button
                  onClick={() => setIsCreateProjectOpen(true)}
                  className="px-4 py-2 bg-[#111111] text-white text-xs font-medium rounded hover:bg-neutral-800 transition-colors"
                >
                  + Create Your First Project
                </button>
              </div>
            ) : (
              <>
                {currentSection === 'overview' && (
                  <Overview
                    activeProject={activeProject}
                    onNavigateToIssues={() => handleNavigate('issues')}
                    onNavigateToSetup={() => handleNavigate('setup')}
                    onSelectIssue={handleSelectIssue}
                    onCreateProject={() => setIsCreateProjectOpen(true)}
                  />
                )}

                {currentSection === 'issues' && (
                  <Issues
                    activeProject={activeProject}
                    onSelectIssue={handleSelectIssue}
                    onNavigateToSetup={() => handleNavigate('setup')}
                  />
                )}

                {currentSection === 'issue-detail' && (
                  <IssueDetail
                    issue={selectedIssue}
                    onBackToIssues={() => handleNavigate('issues')}
                  />
                )}

                {currentSection === 'setup' && (
                  <ProjectSetup
                    activeProject={activeProject}
                    onSelectIssue={handleSelectIssue}
                  />
                )}

                {currentSection === 'settings' && (
                  <ProjectSettings
                    activeProject={activeProject}
                    onProjectUpdated={handleProjectUpdated}
                    onProjectDeleted={handleProjectDeleted}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={handleProjectCreated}
      />
    </div>
  );
}
