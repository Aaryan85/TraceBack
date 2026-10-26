import React from 'react';

export const Skeleton = ({
  className = '',
  width,
  height
}) => {
  return (
    <div
      style={{ width, height }}
      className={`bg-[#EAEAEA] animate-pulse rounded ${className}`}
    />
  );
};

export const TableSkeleton = ({ rows = 5 }) => {
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2.5 border-b border-[#F2F2F2]">
          <div className="space-y-1.5 flex-1 pr-8">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
};
