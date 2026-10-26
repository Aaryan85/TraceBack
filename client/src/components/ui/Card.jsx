import React from 'react';

export const Card = ({
  children,
  className = '',
  header,
  footer,
  action
}) => {
  return (
    <div className={`bg-white border border-[#E5E5E5] rounded-md ${className}`}>
      {(header || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E5E5]">
          {header && <div className="text-xs font-semibold text-[#111111] uppercase tracking-wider">{header}</div>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
      {footer && (
        <div className="px-4 py-2.5 bg-[#F7F7F7] border-t border-[#E5E5E5] text-xs text-[#666666] rounded-b-md">
          {footer}
        </div>
      )}
    </div>
  );
};
