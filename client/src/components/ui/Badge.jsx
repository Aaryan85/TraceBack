import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  dot = false,
  className = ''
}) => {
  const variantStyles = {
    neutral: "bg-[#F7F7F7] text-[#666666] border-[#E5E5E5]",
    unresolved: "bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]",
    resolved: "bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]",
    warning: "bg-[#FFFBEB] text-[#92400E] border-[#FEF3C7]",
    tag: "bg-[#FFFFFF] text-[#666666] border-[#E5E5E5] font-mono text-[11px]"
  };

  const dotColors = {
    neutral: "bg-[#888888]",
    unresolved: "bg-[#DC2626]",
    resolved: "bg-[#16A34A]",
    warning: "bg-[#D97706]",
    tag: "bg-[#888888]"
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border ${variantStyles[variant] || variantStyles.neutral} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant] || 'bg-neutral-400'}`} />
      )}
      {children}
    </span>
  );
};
