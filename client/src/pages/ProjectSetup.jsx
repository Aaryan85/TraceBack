import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { getHealth, sendTestEvent } from '../services/api';
import {
  IconTerminal,
  IconCopy,
  IconCheck,
  IconShield,
  IconActivity,
  IconCheckCircle,
  IconAlertCircle,
  IconChevronRight
} from '../components/ui/Icons';

export const ProjectSetup = ({ onSelectIssue, activeProject = null }) => {
  const [copiedKey, setCopiedKey] = useState(null);
  const [health, setHealth] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'error', database: 'disconnected' }));
  }, []);

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const projectKey = activeProject?.apiKey || "tb_live_demo_key_9823748293";
  const endpoint = "http://localhost:3000/api/v1/events";

  const handleSendTest = async () => {
    try {
      setSendingTest(true);
      setTestResult(null);
      const res = await sendTestEvent(projectKey);
      setTestResult(res.data);
    } catch (err) {
      alert(`Test event failed: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const envSnippet = `# TraceBack Ingestion Configuration
TRACEBACK_ENDPOINT=${endpoint}
TRACEBACK_PROJECT_KEY=${projectKey}
TRACEBACK_ENVIRONMENT=production
TRACEBACK_RELEASE=v1.2.4`;

  const sdkInstallCode = `npm install @traceback/node`;

  const expressInitCode = `import express from 'express';
import { TraceBack } from '@traceback/node';

// 1. Initialize TraceBack SDK
TraceBack.init({
  endpoint: process.env.TRACEBACK_ENDPOINT,
  projectKey: process.env.TRACEBACK_PROJECT_KEY,
  environment: process.env.TRACEBACK_ENVIRONMENT || 'production',
  release: process.env.TRACEBACK_RELEASE || 'v1.0.0'
});

const app = express();

// 2. Request handler middleware (enriches request context)
app.use(TraceBack.requestHandler());

// Your application routes here...
app.get('/api/users', (req, res) => {
  // Application logic
});

// 3. Error handler middleware (must be registered AFTER all routes)
app.use(TraceBack.errorHandler());

app.listen(4000);`;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E5E5]">
        <div>
          <h1 className="text-base font-semibold text-[#111111] tracking-tight">Project Setup & SDK Integration</h1>
          <p className="text-xs text-[#666666]">Configure your application to stream unhandled exceptions directly to TraceBack</p>
        </div>

        {/* Live Backend Connection Status */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#E5E5E5] bg-[#F7F7F7] text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${health?.status === 'ok' ? 'bg-[#16A34A] animate-pulse' : 'bg-[#DC2626]'}`} />
            Backend: {health?.status === 'ok' ? 'Online' : 'Offline'}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#E5E5E5] bg-[#F7F7F7] text-xs font-mono">
            DB: {health?.database || 'checking'}
          </span>
        </div>
      </div>

      {/* Interactive Verification Card */}
      <div className="p-4 rounded-md border border-[#E5E5E5] bg-[#F7F7F7] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-semibold text-[#111111] flex items-center gap-1.5">
              <IconTerminal className="w-4 h-4 text-[#111111]" />
              Verify Ingestion Pipeline
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              Dispatch a simulated production exception to test authentication, fingerprinting, and persistence.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSendTest}
            disabled={sendingTest}
          >
            {sendingTest ? 'Sending Test...' : 'Send Test Error'}
          </Button>
        </div>

        {testResult && (
          <div className="p-3 bg-white border border-[#E5E5E5] rounded text-xs space-y-1.5 font-mono">
            <div className="flex items-center justify-between text-[#16A34A] font-semibold">
              <span className="flex items-center gap-1.5">
                <IconCheckCircle className="w-3.5 h-3.5" />
                Event successfully ingested & grouped!
              </span>
              <span className="text-[#888888] text-[10px]">
                {testResult.isNewIssue ? 'Created new issue' : 'Incremented existing issue'}
              </span>
            </div>
            <div className="text-[#666666] text-[11px]">
              Issue ID: <span className="text-[#111111]">{testResult.issueId}</span> | Occurrence Count: <span className="text-[#111111]">{testResult.count}</span>
            </div>
          </div>
        )}
      </div>

      {/* Project Credentials Card */}
      <Card header="Project Authentication Credentials">
        <div className="space-y-3">
          <div>
            <div className="text-[11px] font-medium text-[#666666] mb-1">Project Ingestion Key</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={projectKey}
                className="w-full bg-[#F7F7F7] border border-[#E5E5E5] rounded px-3 py-1.5 text-xs font-mono text-[#111111] select-all focus:outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(projectKey, 'key')}
                icon={copiedKey === 'key' ? IconCheck : IconCopy}
              >
                {copiedKey === 'key' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-medium text-[#666666] mb-1">Ingestion Endpoint</div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={endpoint}
                className="w-full bg-[#F7F7F7] border border-[#E5E5E5] rounded px-3 py-1.5 text-xs font-mono text-[#111111] select-all focus:outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyToClipboard(endpoint, 'endpoint')}
                icon={copiedKey === 'endpoint' ? IconCheck : IconCopy}
              >
                {copiedKey === 'endpoint' ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Step 1: Environment Variables */}
      <Card
        header="Step 1 — Configure Environment Variables"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(envSnippet, 'env')}
            icon={copiedKey === 'env' ? IconCheck : IconCopy}
          >
            {copiedKey === 'env' ? 'Copied' : 'Copy .env'}
          </Button>
        }
      >
        <p className="text-xs text-[#666666] mb-2.5">
          Add the following configuration to your application's <code className="bg-[#F7F7F7] px-1 py-0.5 rounded border border-[#E5E5E5] text-[#111111]">.env</code> file:
        </p>
        <pre className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded text-xs font-mono text-[#111111] overflow-x-auto leading-relaxed">
          {envSnippet}
        </pre>
      </Card>

      {/* Step 2: Install SDK */}
      <Card
        header="Step 2 — Install the TraceBack Node.js SDK"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(sdkInstallCode, 'install')}
            icon={copiedKey === 'install' ? IconCheck : IconCopy}
          >
            {copiedKey === 'install' ? 'Copied' : 'Copy'}
          </Button>
        }
      >
        <pre className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded text-xs font-mono text-[#111111]">
          {sdkInstallCode}
        </pre>
      </Card>

      {/* Step 3: Express Initialization Code */}
      <Card
        header="Step 3 — Express Instrumentation"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(expressInitCode, 'express')}
            icon={copiedKey === 'express' ? IconCheck : IconCopy}
          >
            {copiedKey === 'express' ? 'Copied' : 'Copy Code'}
          </Button>
        }
      >
        <p className="text-xs text-[#666666] mb-2.5">
          Initialize TraceBack before route handlers and register the error middleware at the bottom:
        </p>
        <pre className="p-3 bg-[#F7F7F7] border border-[#E5E5E5] rounded text-xs font-mono text-[#111111] overflow-x-auto leading-relaxed">
          {expressInitCode}
        </pre>
      </Card>
    </div>
  );
};
