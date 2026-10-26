import React from 'react';
import { IconAlertCircle, IconRefresh } from './Icons';
import { Button } from './Button';

export const ErrorState = ({
  title = "Failed to load telemetry",
  message = "Could not communicate with the TraceBack API server.",
  onRetry,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center border border-[#FCA5A5] bg-[#FEF2F2] rounded-md ${className}`}>
      <div className="w-9 h-9 rounded-full bg-white border border-[#FECACA] flex items-center justify-center mb-2.5 text-[#DC2626]">
        <IconAlertCircle className="w-4 h-4 text-[#DC2626]" />
      </div>
      <h3 className="text-xs font-semibold text-[#991B1B] mb-1">{title}</h3>
      <p className="text-xs text-[#B91C1C] max-w-sm mb-3.5">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} icon={IconRefresh}>
          Retry Connection
        </Button>
      )}
    </div>
  );
};
