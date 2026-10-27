import React, { useState } from 'react';
import {
  IconActivity,
  IconAlertCircle,
  IconTerminal,
  IconShield,
  IconLayers,
  IconCopy,
  IconCheck,
  IconExternalLink,
  IconChevronRight,
  IconCheckCircle
} from '../components/ui/Icons';

export const LandingPage = ({
  onNavigateToDashboard,
  onNavigateToSetup,
  onNavigateToLogin,
  onNavigateToSignup,
  user = null
}) => {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeTab, setActiveTab] = useState('sdk'); // 'sdk' | 'env'
  const [showcaseTab, setShowcaseTab] = useState('issues'); // 'issues' | 'detail'
  const [archTab, setArchTab] = useState('diagram'); // 'diagram' | 'redaction' | 'fingerprint' | 'failsafe'
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const copyCode = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const sampleSdkSnippet = `// 1. Install via npm: npm install traceback-node
import express from 'express';
import { TraceBack } from 'traceback-node';

// 2. Initialize TraceBack (Just 4 lines of integration code)
TraceBack.init({
  endpoint: process.env.TRACEBACK_ENDPOINT || 'https://traceback-server.onrender.com/api/v1/events',
  projectKey: process.env.TRACEBACK_PROJECT_KEY,
  environment: process.env.NODE_ENV || 'production',
  service: 'api-service'
});

const app = express();

// 3. Request context enrichment (MUST be registered before routes)
app.use(TraceBack.requestHandler());

// Your normal application routes
app.get('/api/orders', (req, res) => {
  res.json({ ok: true });
});

// 4. Automatic error handler middleware (MUST be registered after routes)
app.use(TraceBack.errorHandler());

app.listen(3000);`;

  const sampleEnvSnippet = `# TraceBack Ingestion Configuration (Cloud or Local)
TRACEBACK_ENDPOINT=https://traceback-server.onrender.com/api/v1/events
TRACEBACK_PROJECT_KEY=tb_live_demo_key_9823748293
TRACEBACK_ENVIRONMENT=production
TRACEBACK_RELEASE=v1.0.0`;

  return (
    <div className="min-h-screen bg-white text-[#111111] flex flex-col font-sans selection:bg-[#E5E5E5] selection:text-[#111111]">
      {/* 1. Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-7 h-7 rounded bg-[#111111] flex items-center justify-center text-white font-mono font-bold text-sm shrink-0">
              T
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-[#111111]">TraceBack</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#F7F7F7] border border-[#E5E5E5] text-[#666666]">
                Developer Edition
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-[#666666]">
            <a href="#features" className="hover:text-[#111111] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#111111] transition-colors">How it works</a>
            <a href="#architecture" className="hover:text-[#111111] transition-colors">Architecture Flow</a>
            <a href="#quickstart" className="hover:text-[#111111] transition-colors">SDK Quickstart</a>
            <a href="#preview" className="hover:text-[#111111] transition-colors">Product Preview</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {user ? (
              <button
                onClick={() => onNavigateToDashboard('overview')}
                className="px-3 sm:px-3.5 py-1.5 text-xs font-medium bg-[#111111] text-white rounded hover:bg-neutral-800 transition-colors flex items-center gap-1"
              >
                <span>Workspace</span>
                <IconChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  onClick={onNavigateToLogin}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-medium text-[#111111] hover:text-black hover:bg-[#F7F7F7] rounded border border-transparent transition-colors"
                >
                  Log in
                </button>
                <button
                  onClick={onNavigateToSignup}
                  className="px-3 sm:px-3.5 py-1.5 text-xs font-medium bg-[#111111] text-white rounded hover:bg-neutral-800 transition-colors"
                >
                  <span className="hidden sm:inline">Get started for free</span>
                  <span className="sm:hidden">Sign up</span>
                </button>
              </>
            )}

            {/* Mobile Navigation Toggle Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-1.5 rounded text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] transition-colors ml-1"
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileNavOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-[#E5E5E5] bg-white px-6 py-4 space-y-3 text-xs font-medium text-[#666666] shadow-sm">
            <a
              href="#features"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1 hover:text-[#111111] transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1 hover:text-[#111111] transition-colors"
            >
              How it works
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1 hover:text-[#111111] transition-colors"
            >
              Architecture Flow
            </a>
            <a
              href="#quickstart"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1 hover:text-[#111111] transition-colors"
            >
              SDK Quickstart
            </a>
            <a
              href="#preview"
              onClick={() => setMobileNavOpen(false)}
              className="block py-1 hover:text-[#111111] transition-colors"
            >
              Product Preview
            </a>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="pt-20 pb-16 px-6 border-b border-[#E5E5E5] bg-white">
        <div className="max-w-3xl mx-auto text-center">
          {/* Subtle System Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5E5E5] bg-[#F7F7F7] text-xs text-[#666666] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
            <span>Open-source application error monitoring platform</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[#111111] leading-[1.15] mb-5">
            Find the bug. Understand the cause. Fix it faster.
          </h1>

          <p className="text-base sm:text-lg text-[#666666] max-w-2xl mx-auto leading-relaxed mb-8">
            TraceBack helps developers capture, group, and investigate application errors in one simple workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => user ? onNavigateToDashboard('overview') : onNavigateToLogin()}
              className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium bg-[#111111] text-white rounded hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
            >
              <span>{user ? 'Open Dashboard' : 'Open Live Workspace'}</span>
              <IconChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onNavigateToSetup ? onNavigateToSetup() : onNavigateToDashboard('setup')}
              className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-medium bg-white text-[#111111] border border-[#E5E5E5] rounded hover:bg-[#F7F7F7] transition-colors"
            >
              Integration Quickstart
            </button>
          </div>

          {/* Core Architecture Highlights */}
          <div className="mt-12 pt-8 border-t border-[#E5E5E5] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div>
              <div className="text-xs font-mono text-[#888888]">RUNTIME</div>
              <div className="text-xs font-semibold text-[#111111] mt-0.5">Node.js & Express</div>
            </div>
            <div>
              <div className="text-xs font-mono text-[#888888]">GROUPING</div>
              <div className="text-xs font-semibold text-[#111111] mt-0.5">SHA-256 Fingerprints</div>
            </div>
            <div>
              <div className="text-xs font-mono text-[#888888]">DATA PRIVACY</div>
              <div className="text-xs font-semibold text-[#111111] mt-0.5">In-Flight Redaction</div>
            </div>
            <div>
              <div className="text-xs font-mono text-[#888888]">DEPLOYMENT</div>
              <div className="text-xs font-semibold text-[#111111] mt-0.5">Self-Hosted or Cloud</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Product Showcase (Interactive Illustrative Preview) */}
      <section id="preview" className="py-16 px-6 bg-[#F7F7F7] border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <span className="text-xs font-mono text-[#888888] uppercase tracking-wider">Product Showcase</span>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111] mt-1">
                Developer-centric error investigation
              </h2>
            </div>

            {/* Toggle view between Issue Listing and Stack Trace detail */}
            <div className="inline-flex p-0.5 rounded border border-[#E5E5E5] bg-white text-xs">
              <button
                onClick={() => setShowcaseTab('issues')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  showcaseTab === 'issues' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Issue List View
              </button>
              <button
                onClick={() => setShowcaseTab('detail')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  showcaseTab === 'detail' ? 'bg-[#111111] text-white' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Stack Trace Inspector
              </button>
            </div>
          </div>

          {/* Browser Window Wrapper */}
          <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden">
            {/* Window Frame Header */}
            <div className="h-9 px-4 border-b border-[#E5E5E5] bg-[#F7F7F7] flex items-center justify-between text-xs text-[#888888]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5]" />
              </div>
              <span className="font-mono text-[11px] text-[#666666]">
                {showcaseTab === 'issues' ? 'app.traceback.local/issues' : 'app.traceback.local/issues/67bb2d48?event=evt_902'}
              </span>
              <span className="text-[10px] font-mono text-[#888888]">LIVE PREVIEW</span>
            </div>

            {/* Interactive Preview Body */}
            {showcaseTab === 'issues' ? (
              <div className="p-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] mb-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#111111]">Project: demo-service</span>
                    <span className="text-[#888888]">·</span>
                    <span className="px-2 py-0.5 rounded bg-[#F7F7F7] border border-[#E5E5E5] font-mono text-[11px] text-[#666666]">
                      env: production
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[#666666] font-mono text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                    3 unresolved issues
                  </div>
                </div>

                <div className="divide-y divide-[#E5E5E5] text-xs">
                  {/* Row 1 */}
                  <div className="py-3 flex items-start justify-between gap-4 hover:bg-[#FAFAFA] px-2 rounded -mx-2 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#DC2626]">TypeError</span>
                        <span className="text-[#888888] font-mono text-[11px]">GET /error/type-error</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2] text-[10px] font-mono">
                          unresolved
                        </span>
                      </div>
                      <p className="text-[#666666] truncate font-mono text-[11px]">
                        Cannot read properties of null (reading 'role')
                      </p>
                      <div className="text-[10px] text-[#888888]">
                        First seen 10 minutes ago · Last seen 2 minutes ago
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-xs text-[#111111] px-2 py-0.5 bg-[#F7F7F7] border border-[#E5E5E5] rounded">
                        14 events
                      </span>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="py-3 flex items-start justify-between gap-4 hover:bg-[#FAFAFA] px-2 rounded -mx-2 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#D97706]">DatabaseTimeoutError</span>
                        <span className="text-[#888888] font-mono text-[11px]">GET /error/db-sim</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2] text-[10px] font-mono">
                          unresolved
                        </span>
                      </div>
                      <p className="text-[#666666] truncate font-mono text-[11px]">
                        Query timed out after 5000ms: SELECT * FROM orders WHERE status = "pending"
                      </p>
                      <div className="text-[10px] text-[#888888]">
                        First seen 1 hour ago · Last seen 8 minutes ago
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-xs text-[#111111] px-2 py-0.5 bg-[#F7F7F7] border border-[#E5E5E5] rounded">
                        6 events
                      </span>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="py-3 flex items-start justify-between gap-4 hover:bg-[#FAFAFA] px-2 rounded -mx-2 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#2563EB]">ValidationError</span>
                        <span className="text-[#888888] font-mono text-[11px]">POST /api/auth/register</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7] text-[10px] font-mono">
                          resolved
                        </span>
                      </div>
                      <p className="text-[#666666] truncate font-mono text-[11px]">
                        Invalid registration payload: email is required and password is too short
                      </p>
                      <div className="text-[10px] text-[#888888]">
                        Resolved by developer 14 minutes ago
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono font-semibold text-xs text-[#111111] px-2 py-0.5 bg-[#F7F7F7] border border-[#E5E5E5] rounded">
                        2 events
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <div className="space-y-4">
                  {/* Issue Meta */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5] text-xs">
                    <div>
                      <span className="font-mono font-bold text-sm text-[#111111]">TypeError: Cannot read properties of null</span>
                      <div className="text-[#888888] font-mono text-[11px] mt-0.5">
                        Fingerprint: 3e8b4e7a2b918cd0c1... · Release: v1.2.4
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-[#111111] text-white rounded text-[11px] font-medium">
                      Status: Unresolved
                    </span>
                  </div>

                  {/* Stack Trace Box */}
                  <div>
                    <div className="text-[11px] font-mono text-[#888888] mb-1.5 uppercase tracking-wide">
                      Filtered Application Stack Trace
                    </div>
                    <pre className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded text-xs font-mono text-[#111111] overflow-x-auto leading-relaxed">
                      <code>{`TypeError: Cannot read properties of null (reading 'role')
    at getUserSession (/app/demo-app/src/app.js:60:22)
    at handleRequest (/app/demo-app/src/app.js:56:5)
    --> Node runtime internals automatically omitted by TraceBack parser`}</code>
                    </pre>
                  </div>

                  {/* In-Flight Redacted Context */}
                  <div>
                    <div className="text-[11px] font-mono text-[#888888] mb-1.5 uppercase tracking-wide">
                      Sanitized Runtime Context (PII Redacted)
                    </div>
                    <pre className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded text-xs font-mono text-[#666666] overflow-x-auto leading-relaxed">
                      <code>{`{
  "route": "GET /error/type-error",
  "requestId": "req_88192301",
  "user": {
    "id": "usr_9912",
    "password": "[REDACTED]",
    "authorization": "Bearer [REDACTED]"
  },
  "runtime": { "platform": "linux", "node": "v20.18.0", "service": "api-service" }
}`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom prompt inside showcase */}
            <div className="p-3 bg-[#FAFAFA] border-t border-[#E5E5E5] flex items-center justify-between text-xs">
              <span className="text-[#666666]">
                Explore actual live telemetry in your local environment.
              </span>
              <button
                onClick={() => onNavigateToDashboard('overview')}
                className="font-medium text-[#111111] hover:underline flex items-center gap-1"
              >
                <span>Switch to Interactive Dashboard</span>
                <IconChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-20 px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono text-[#888888] uppercase tracking-wider">Features</span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] mt-1.5 mb-3">
              Built for pragmatic engineering workflows
            </h2>
            <p className="text-sm text-[#666666] leading-relaxed">
              TraceBack avoids bloated enterprise monitoring overhead. It provides exact, actionable telemetry so you can diagnose production regressions immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-5 rounded-md border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors">
              <div className="w-8 h-8 rounded bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mb-3">
                <IconTerminal className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111111] mb-1.5">Error Capture via SDK</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Lightweight Node.js package with automatic Express request context and error handling middlewares. Non-blocking asynchronous event batching ensures monitored apps never stall.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-5 rounded-md border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors">
              <div className="w-8 h-8 rounded bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mb-3">
                <IconLayers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111111] mb-1.5">Automatic Issue Grouping</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Deterministic SHA-256 fingerprinting deduplicates recurring errors. Dynamic variables (UUIDs, timestamps, database IDs) are normalized so duplicate stack traces group reliably.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-5 rounded-md border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors">
              <div className="w-8 h-8 rounded bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mb-3">
                <IconAlertCircle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111111] mb-1.5">Stack Trace Inspection</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Stack traces are parsed into structured frames. Node runtime internals and third-party node_modules noise are filtered out, surfacing the precise application line that crashed.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-5 rounded-md border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors">
              <div className="w-8 h-8 rounded bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mb-3">
                <IconShield className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111111] mb-1.5">Occurrence History & Context</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Every individual event is persisted with runtime environment, release tag, HTTP route, request ID, and sanitized context. Passwords, authorization tokens, and API keys are redacted in-flight.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-5 rounded-md border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors">
              <div className="w-8 h-8 rounded bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mb-3">
                <IconCheckCircle className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111111] mb-1.5">Issue Filtering & Resolution</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Triage issues across states: Unresolved, Resolved, or Ignored. Filter issues by deployment environment (production vs development) and sort by frequency or recency.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-5 rounded-md border border-[#E5E5E5] bg-white hover:border-[#CCCCCC] transition-colors">
              <div className="w-8 h-8 rounded bg-[#F7F7F7] border border-[#E5E5E5] flex items-center justify-center text-[#111111] mb-3">
                <IconActivity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-[#111111] mb-1.5">Error-Frequency Analytics</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                24-hour error frequency distribution and aggregation endpoints visualize spikes in real-time, helping identify bad releases or sudden external service outages.
              </p>
            </div>
          </div>

          {/* Explicit Note on Future Roadmap */}
          <div className="mt-8 p-4 rounded-md bg-[#F7F7F7] border border-[#E5E5E5] text-xs text-[#666666] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-[#111111]">Planned Future Features:</span> Automated Slack & email alert channels, custom webhook integrations, and AI-assisted root cause analysis are actively being designed for subsequent versions.
            </div>
            <span className="font-mono text-[10px] text-[#888888] shrink-0">ROADMAP SCOPE</span>
          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="how-it-works" className="py-20 px-6 bg-[#F7F7F7] border-b border-[#E5E5E5]">
        <div className="max-w-5xl mx-auto">
          <div className="max-w-2xl mb-12">
            <span className="text-xs font-mono text-[#888888] uppercase tracking-wider">Workflow</span>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] mt-1.5 mb-3">
              How TraceBack works in 3 steps
            </h2>
            <p className="text-sm text-[#666666]">
              From code installation to real-time incident resolution in under two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 bg-white border border-[#E5E5E5] rounded-md relative">
              <div className="text-xs font-mono text-[#888888] mb-3">STEP 01</div>
              <h3 className="text-sm font-semibold text-[#111111] mb-2">Configure a Project</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Generate an ingestion endpoint and unique project key (`X-Project-Key`). Set your environment variables in your server or container.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 bg-white border border-[#E5E5E5] rounded-md relative">
              <div className="text-xs font-mono text-[#888888] mb-3">STEP 02</div>
              <h3 className="text-sm font-semibold text-[#111111] mb-2">Integrate the Node.js SDK</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                Add <code className="font-mono text-[#111111] bg-[#F0F0F0] px-1 py-0.5 rounded">traceback-node</code> to your backend via <code className="font-mono text-[#111111] bg-[#F0F0F0] px-1 py-0.5 rounded">npm install traceback-node</code>. Initialize <code className="font-mono text-[#111111] bg-[#F0F0F0] px-1 py-0.5 rounded">TraceBack.init()</code> and attach the lightweight Express middlewares.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 bg-white border border-[#E5E5E5] rounded-md relative">
              <div className="text-xs font-mono text-[#888888] mb-3">STEP 03</div>
              <h3 className="text-sm font-semibold text-[#111111] mb-2">Capture & Investigate</h3>
              <p className="text-xs text-[#666666] leading-relaxed">
                When an exception occurs, TraceBack redacts sensitive data, computes deterministic fingerprints, and streams the incident to your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5.5 Architecture Flow Diagram Section */}
      <section id="architecture" className="py-20 px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-mono text-[#888888] uppercase tracking-wider">System Architecture</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] mt-1.5 mb-2">
                End-to-End Architecture Flow
              </h2>
              <p className="text-sm text-[#666666] max-w-2xl">
                How exceptions journey from your host runtime through the ingestion pipeline to persistent storage and developer triage.
              </p>
            </div>

            {/* Interactive View Selector */}
            <div className="flex overflow-x-auto max-w-full pb-1 p-0.5 rounded border border-[#E5E5E5] bg-[#F7F7F7] text-xs shrink-0">
              <button
                onClick={() => setArchTab('diagram')}
                className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  archTab === 'diagram' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                System Diagram
              </button>
              <button
                onClick={() => setArchTab('redaction')}
                className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  archTab === 'redaction' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                In-Flight Redaction
              </button>
              <button
                onClick={() => setArchTab('fingerprint')}
                className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  archTab === 'fingerprint' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                SHA-256 Fingerprinting
              </button>
              <button
                onClick={() => setArchTab('failsafe')}
                className={`px-3 py-1 font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  archTab === 'failsafe' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                Fail-Safe Isolation
              </button>
            </div>
          </div>

          {/* Tab 1: System Diagram */}
          {archTab === 'diagram' && (
            <div className="space-y-6">
              {/* 4 Connected Architectural Tiers */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                {/* Tier 1: Host Application & SDK */}
                <div className="p-5 rounded-md border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between hover:border-[#CCCCCC] transition-colors relative">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E5E5E5] text-[#111111] font-semibold">
                        TIER 01: HOST RUNTIME
                      </span>
                      <span className="w-2 h-2 rounded-full bg-[#16A34A]" title="Fail-Safe Non-Blocking" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#111111] mb-1">traceback-node SDK</h3>
                    <p className="text-[11px] font-mono text-[#888888] mb-3">Host Express / Node.js Server</p>

                    <div className="space-y-2 text-xs text-[#555555]">
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">1. Context Enrichment</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Captures route, method, request ID and user environment.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">2. Error Interception</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Middlewares hook into unhandled throws and stack traces.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">3. In-Flight Redaction</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Passphrases & auth headers scrubbed in-memory.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] font-mono text-[#666666]">
                    <span>Transport</span>
                    <span className="text-[#111111] font-semibold">Async HTTP POST →</span>
                  </div>
                </div>

                {/* Tier 2: Ingestion & Normalization */}
                <div className="p-5 rounded-md border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between hover:border-[#CCCCCC] transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E5E5E5] text-[#111111] font-semibold">
                        TIER 02: INGESTION API
                      </span>
                      <span className="text-[10px] font-mono text-[#666666]">Port :3000</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#111111] mb-1">TraceBack Core Server</h3>
                    <p className="text-[11px] font-mono text-[#888888] mb-3">POST /api/v1/events</p>

                    <div className="space-y-2 text-xs text-[#555555]">
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">1. Rate Limiter</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">150 req/min sliding window protects against crash storms.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">2. Project Auth</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Validates <code className="text-[10px]">X-Project-Key</code> in constant time.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">3. Frame Sanitizer</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Filters internal Node runtime & external dependencies.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] font-mono text-[#666666]">
                    <span>Fingerprint</span>
                    <span className="text-[#111111] font-semibold">SHA-256 Hash →</span>
                  </div>
                </div>

                {/* Tier 3: Persistence Layer */}
                <div className="p-5 rounded-md border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between hover:border-[#CCCCCC] transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E5E5E5] text-[#111111] font-semibold">
                        TIER 03: PERSISTENCE
                      </span>
                      <span className="text-[10px] font-mono text-[#666666]">MongoDB</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#111111] mb-1">Two-Tier Storage</h3>
                    <p className="text-[11px] font-mono text-[#888888] mb-3">Compensating Rollback Engine</p>

                    <div className="space-y-2 text-xs text-[#555555]">
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">1. Issue Aggregate</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Upserts unique <code className="text-[10px]">(projectKey, fingerprint)</code> and increments counter.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">2. ErrorEvent Log</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Persists full occurrence audit trail with sanitized telemetry.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">3. Rollback Guard</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Auto-reverts count if event insertion fails.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] font-mono text-[#666666]">
                    <span>Data Sync</span>
                    <span className="text-[#111111] font-semibold">REST Query API →</span>
                  </div>
                </div>

                {/* Tier 4: Developer Web Workspace */}
                <div className="p-5 rounded-md border border-[#E5E5E5] bg-[#FAFAFA] flex flex-col justify-between hover:border-[#CCCCCC] transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E5E5E5] text-[#111111] font-semibold">
                        TIER 04: OBSERVABILITY
                      </span>
                      <span className="text-[10px] font-mono text-[#666666]">React 18 SPA</span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#111111] mb-1">TraceBack Dashboard</h3>
                    <p className="text-[11px] font-mono text-[#888888] mb-3">Developer Triage & Analytics</p>

                    <div className="space-y-2 text-xs text-[#555555]">
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">1. Triage Workflow</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Manage states: Unresolved, Resolved, or Ignored with real-time updates.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">2. Stack Frame Inspector</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">Pinpoints the exact application line that crashed.</p>
                      </div>
                      <div className="p-2 rounded bg-white border border-[#EBEBEB]">
                        <span className="font-semibold text-[#111111]">3. Occurrence Spike Chart</span>
                        <p className="text-[11px] text-[#666666] mt-0.5">24-hour error frequency distribution and spike alerts.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E5E5E5] flex items-center justify-between text-[11px] font-mono text-[#666666]">
                    <span>Outcome</span>
                    <span className="text-[#16A34A] font-semibold">Incident Resolved ✓</span>
                  </div>
                </div>
              </div>

              {/* End-to-End Execution Timeline Banner */}
              <div className="p-4 rounded-md border border-[#E5E5E5] bg-[#F7F7F7] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                  <span className="font-semibold text-[#111111]">Pipeline Guarantee:</span>
                  <span className="text-[#666666]">Sub-millisecond host overhead · In-flight PII redaction · SHA-256 deduplication</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[#666666]">
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E5E5E5]">Crash Occurs</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E5E5E5]">In-Flight Scrub (0.1ms)</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E5E5E5]">Async Ingestion</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E5E5E5]">SHA-256 Dedupe</span>
                  <span>→</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-[#E5E5E5] text-[#111111] font-semibold">Live in Dashboard</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: In-Flight Redaction */}
          {archTab === 'redaction' && (
            <div className="border border-[#E5E5E5] rounded-md bg-[#FAFAFA] p-6 space-y-6">
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-[#111111] mb-1">
                  Zero PII Leakage: In-Memory Client Scrubbing
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  Before error telemetry is serialized or transmitted over the wire, the SDK recursively sanitizes the request payload. Passwords, auth tokens, secrets, and credit cards are scrubbed directly in the client runtime memory so sensitive customer data never enters network transit or storage.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Left: Raw */}
                <div className="border border-[#E5E5E5] rounded bg-white overflow-hidden">
                  <div className="h-8 px-3 bg-[#FEF2F2] border-b border-[#FEE2E2] flex items-center justify-between text-[#991B1B]">
                    <span className="font-semibold">Raw Application Context (Host Memory)</span>
                    <span className="text-[10px]">Unsanitized</span>
                  </div>
                  <pre className="p-4 text-[#111111] overflow-x-auto leading-relaxed">
                    <code>{`{
  "route": "POST /api/v1/auth/login",
  "headers": {
    "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5c...",
    "x-api-key": "secret_live_998129384"
  },
  "body": {
    "email": "developer@company.com",
    "password": "SuperSecretPassword123!",
    "creditCard": "4532-8910-1122-3344"
  }
}`}</code>
                  </pre>
                </div>

                {/* Right: Redacted */}
                <div className="border border-[#E5E5E5] rounded bg-white overflow-hidden">
                  <div className="h-8 px-3 bg-[#F0FDF4] border-b border-[#DCFCE7] flex items-center justify-between text-[#166534]">
                    <span className="font-semibold">Sanitized In-Flight Payload (Transmitted)</span>
                    <span className="text-[10px]">Protected ✓</span>
                  </div>
                  <pre className="p-4 text-[#111111] overflow-x-auto leading-relaxed">
                    <code>{`{
  "route": "POST /api/v1/auth/login",
  "headers": {
    "authorization": "Bearer [REDACTED]",
    "x-api-key": "[REDACTED]"
  },
  "body": {
    "email": "developer@company.com",
    "password": "[REDACTED]",
    "creditCard": "[REDACTED]"
  }
}`}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: SHA-256 Fingerprinting */}
          {archTab === 'fingerprint' && (
            <div className="border border-[#E5E5E5] rounded-md bg-[#FAFAFA] p-6 space-y-6">
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-[#111111] mb-1">
                  Deterministic Error Grouping Algorithm
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  If 10,000 users hit the same bug with different dynamic query parameters, database IDs, or memory addresses, TraceBack normalizes variable data and computes a deterministic SHA-256 fingerprint. This guarantees that recurring errors collapse into a single actionable incident instead of flooding the team.
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="p-3.5 bg-white border border-[#E5E5E5] rounded">
                  <div className="text-[10px] text-[#888888] mb-1">STAGE 1 · DYNAMIC VARIABLE NORMALIZATION</div>
                  <div className="text-[#DC2626] line-through">
                    Cannot read property 'total' of null at /api/orders/507f191e810c19729de860ea (attempt 4)
                  </div>
                  <div className="text-[#16A34A] mt-1 font-semibold">
                    Cannot read property 'total' of null at /api/orders/:id (attempt :n)
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-[#E5E5E5] rounded">
                  <div className="text-[10px] text-[#888888] mb-1">STAGE 2 · STACK FRAME FILTERING</div>
                  <p className="text-[#666666]">
                    Internal Node.js runtime calls (`node:internal/modules/cjs/loader.js`) and third-party vendor wrappers are automatically omitted. The fingerprinting engine anchors specifically to your project's top active application frame.
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-[#E5E5E5] rounded">
                  <div className="text-[10px] text-[#888888] mb-1">STAGE 3 · CRYPTOGRAPHIC SHA-256 HASH</div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                    <span className="text-[#111111] font-bold">
                      SHA256("TypeError" + "normalized_message" + "orderService.js:42")
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#F7F7F7] border border-[#E5E5E5] text-[11px] text-[#111111] font-semibold">
                      = 3e8b4e7a2b918cd0c1...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Fail-Safe Isolation */}
          {archTab === 'failsafe' && (
            <div className="border border-[#E5E5E5] rounded-md bg-[#FAFAFA] p-6 space-y-6">
              <div className="max-w-2xl">
                <h3 className="text-sm font-semibold text-[#111111] mb-1">
                  Bulletproof Isolation: Your App Never Crashes
                </h3>
                <p className="text-xs text-[#666666] leading-relaxed">
                  An observability tool should never compromise application reliability. TraceBack enforces three strict resilience mechanisms in the client SDK:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-[#E5E5E5] rounded">
                  <span className="text-xs font-mono font-bold text-[#111111] mb-2 block">1. Non-Blocking Async</span>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Event payloads are dispatched on the next Node.js event-loop tick using non-blocking transport. Your HTTP response latency is 100% unaffected.
                  </p>
                </div>

                <div className="p-4 bg-white border border-[#E5E5E5] rounded">
                  <span className="text-xs font-mono font-bold text-[#111111] mb-2 block">2. Self-Contained Catch</span>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    Internal SDK logic executes inside fail-safe boundary blocks. Even during severe edge cases or memory pressure, the SDK will never throw or bubble up.
                  </p>
                </div>

                <div className="p-4 bg-white border border-[#E5E5E5] rounded">
                  <span className="text-xs font-mono font-bold text-[#111111] mb-2 block">3. Downstream Resiliency</span>
                  <p className="text-xs text-[#666666] leading-relaxed">
                    If TraceBack servers are restarting, rate-limited, or unreachable, transmissions fail silently with zero unhandled rejections or socket leakages.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 6. Quick-Start Section */}
      <section id="quickstart" className="py-20 px-6 bg-white border-b border-[#E5E5E5]">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-mono text-[#888888] uppercase tracking-wider">Developer Quickstart</span>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#111111] mt-1.5 mb-2">
                Just 4 lines of integration code
              </h2>
              <p className="text-sm text-[#666666]">
                Seamless instrumentation for Express, Fastify, or plain Node.js microservices.
              </p>
            </div>

            {/* Snippet Selector */}
            <div className="inline-flex p-0.5 rounded border border-[#E5E5E5] bg-[#F7F7F7] text-xs">
              <button
                onClick={() => setActiveTab('sdk')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  activeTab === 'sdk' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                app.js
              </button>
              <button
                onClick={() => setActiveTab('env')}
                className={`px-3 py-1 font-medium rounded transition-colors ${
                  activeTab === 'env' ? 'bg-white text-[#111111] shadow-sm' : 'text-[#666666] hover:text-[#111111]'
                }`}
              >
                .env
              </button>
            </div>
          </div>

          {/* Code Container */}
          <div className="border border-[#E5E5E5] rounded-md overflow-hidden bg-[#F7F7F7]">
            <div className="h-10 px-4 bg-white border-b border-[#E5E5E5] flex items-center justify-between">
              <span className="font-mono text-xs text-[#666666]">
                {activeTab === 'sdk' ? 'Express Application Setup' : 'Environment Configuration'}
              </span>
              <button
                onClick={() => copyCode(activeTab === 'sdk' ? sampleSdkSnippet : sampleEnvSnippet)}
                className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#111111] transition-colors"
              >
                {copiedSnippet ? (
                  <>
                    <IconCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span className="text-[#16A34A] font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <IconCopy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-5 text-xs font-mono text-[#111111] overflow-x-auto leading-relaxed">
              <code>{activeTab === 'sdk' ? sampleSdkSnippet : sampleEnvSnippet}</code>
            </pre>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[#666666]">
            <span>Published npm package: <code className="font-mono px-1 py-0.5 bg-[#F7F7F7] border border-[#E5E5E5] rounded">npm install traceback-node</code></span>
            <button
              onClick={() => onNavigateToDashboard('setup')}
              className="font-medium text-[#111111] hover:underline"
            >
              View complete integration docs →
            </button>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="mt-auto py-12 px-6 bg-white border-t border-[#E5E5E5]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#111111] flex items-center justify-center text-white font-mono font-bold text-xs">
                T
              </div>
              <span className="font-semibold text-xs tracking-tight text-[#111111]">TraceBack</span>
            </div>
            <p className="text-xs text-[#666666] max-w-sm">
              Application error-monitoring and observability platform for modern Node.js web applications.
            </p>
            <div className="text-xs text-[#555555] font-medium pt-1">
              Made with ❤️ by <span className="text-[#111111] font-semibold">Aaryan Yadav</span>
            </div>
            
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#666666]">
            <button
              onClick={() => onNavigateToDashboard('overview')}
              className="hover:text-[#111111] transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => onNavigateToDashboard('issues')}
              className="hover:text-[#111111] transition-colors"
            >
              Issue Tracker
            </button>
            <button
              onClick={() => onNavigateToDashboard('setup')}
              className="hover:text-[#111111] transition-colors"
            >
              SDK Documentation
            </button>
            <a
              href="#architecture"
              className="hover:text-[#111111] transition-colors"
            >
              Architecture Flow
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
