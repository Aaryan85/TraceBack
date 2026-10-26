import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-[#FEF2F2] border border-[#FCA5A5] rounded-md font-sans">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <h2 className="text-sm font-semibold text-[#991B1B]">TraceBack Client Runtime Error</h2>
          </div>
          <p className="text-xs font-mono text-[#B91C1C] mb-4 bg-white p-3 rounded border border-[#FECACA] overflow-x-auto">
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 text-xs font-medium rounded bg-[#111111] text-white hover:bg-neutral-800"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
