import React from 'react';

export const Button = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  icon: Icon = null,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors duration-150 rounded select-none focus:outline-none focus:ring-1 focus:ring-[#111111]";
  
  const sizeStyles = {
    sm: "px-2.5 py-1 text-xs gap-1.5",
    md: "px-3.5 py-1.5 text-xs gap-2",
    lg: "px-4 py-2 text-sm gap-2"
  };

  const variantStyles = {
    primary: "bg-[#111111] text-white hover:bg-neutral-800 border border-transparent disabled:opacity-50 disabled:hover:bg-[#111111]",
    secondary: "bg-white text-[#111111] border border-[#E5E5E5] hover:bg-[#F2F2F2] disabled:opacity-50 disabled:hover:bg-white",
    ghost: "bg-transparent text-[#666666] hover:text-[#111111] hover:bg-[#F2F2F2] border border-transparent disabled:opacity-50",
    danger: "bg-white text-[#DC2626] border border-[#FCA5A5] hover:bg-red-50 disabled:opacity-50"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
};
