import React from 'react';
import { IconCheckCircle, IconAlertCircle } from './Icons';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = IconCheckCircle,
  title = "No issues detected",
  description = "Your monitored services are operating cleanly without unhandled exceptions.",
  actionLabel,
  onAction,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center border border-dashed border-[#E5E5E5] rounded-md bg-[#FAFAFA] ${className}`}>
      <div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center mb-3 text-[#666666]">
        <Icon className="w-5 h-5 text-[#888888]" />
      </div>
      <h3 className="text-sm font-semibold text-[#111111] mb-1">{title}</h3>
      <p className="text-xs text-[#666666] max-w-sm mb-4 leading-relaxed">{description}</p>
      {actionLabel && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
