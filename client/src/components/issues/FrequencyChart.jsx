import React, { useState, useRef } from 'react';

/**
 * Catmull-Rom spline converter to cubic Bezier curve commands.
 * Creates an ultra-smooth natural curve passing through all data coordinates.
 */
function getCurvedPath(points, bottomY) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Catmull-Rom to Cubic Bezier control points calculation
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    // Guard against spline overshoot dipping below the baseline
    if (bottomY !== undefined) {
      cp1y = Math.min(bottomY, cp1y);
      cp2y = Math.min(bottomY, cp2y);
    }

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

/**
 * Format timestamp into readable localized time, date, and relative indicator.
 * Properly handles UTC ISO strings and displays local browser time.
 */
function formatTimestamp(timeStr, index, totalPoints) {
  if (!timeStr) return '';
  try {
    let isoStr = timeStr;
    // Guarantee UTC timezone parsing if server sent format without timezone
    if (!isoStr.includes('Z') && !isoStr.includes('+')) {
      isoStr = isoStr.replace(' ', 'T') + ':00.000Z';
    }
    const parsed = new Date(isoStr);
    if (!isNaN(parsed.getTime())) {
      const timePart = parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      const now = new Date();
      const isToday = parsed.toDateString() === now.toDateString();
      const datePart = isToday ? 'Today' : parsed.toLocaleDateString([], { month: 'short', day: 'numeric' });

      if (typeof index === 'number' && typeof totalPoints === 'number') {
        if (index === totalPoints - 1) {
          return `${datePart}, ${timePart} (Now)`;
        }
        const hoursAgo = totalPoints - 1 - index;
        if (hoursAgo === 1) {
          return `${datePart}, ${timePart} (1 hr ago)`;
        }
        return `${datePart}, ${timePart} (${hoursAgo} hrs ago)`;
      }

      return `${datePart}, ${timePart}`;
    }
  } catch {
    // fallback
  }
  return timeStr;
}

/**
 * Curvy 24-Hour Error Frequency Chart
 * Rendered with smooth cubic curves, indigo gradient fill, and interactive inspection
 */
export const FrequencyChart = ({ data = [], total24h = 0 }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const svgRef = useRef(null);

  // SVG coordinate system
  const width = 800;
  const height = 150;
  const paddingTop = 20;
  const paddingBottom = 22;
  const paddingLeft = 20;
  const paddingRight = 20;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;
  const bottomY = height - paddingBottom;

  const maxCount = Math.max(1, ...data.map((d) => d.count || 0));

  // Compute (x, y) coordinates for all 24 buckets
  const points = data.map((bucket, index) => {
    const x = paddingLeft + (index / Math.max(1, data.length - 1)) * innerWidth;
    const count = bucket.count || 0;
    // Map count into inner vertical range
    const y = bottomY - (count / maxCount) * innerHeight;
    return {
      x,
      y,
      count,
      time: bucket.time,
      hour: bucket.hour,
      index
    };
  });

  const linePath = getCurvedPath(points, bottomY);
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`
    : '';

  // Find nearest data bucket on mouse move
  const handleMouseMove = (e) => {
    if (!svgRef.current || points.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    // Find closest bucket by X
    let closest = points[0];
    let minDist = Math.abs(points[0].x - mouseX);

    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - mouseX);
      if (dist < minDist) {
        minDist = dist;
        closest = points[i];
      }
    }

    setHoveredPoint(closest);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  // Generate timeline axis tick marks aligned to exact point coordinates
  const axisTicks = points.length >= 24 ? [
    { label: '24h ago', x: points[0].x, align: 'left' },
    { label: '18h ago', x: points[6].x, align: 'center' },
    { label: '12h ago', x: points[12].x, align: 'center' },
    { label: '6h ago', x: points[18].x, align: 'center' },
    { label: 'Now', x: points[23].x, align: 'right', isNow: true }
  ] : [
    { label: 'Start', x: paddingLeft, align: 'left' },
    { label: 'Now', x: width - paddingRight, align: 'right', isNow: true }
  ];

  return (
    <div className="space-y-3">
      {/* Header telemetry summary */}
      <div className="flex items-center justify-between text-xs text-[#666666]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#6366F1]" />
          <span className="font-medium text-[#111111]">24-Hour Event Timeline</span>
        </div>
        <span className="font-mono text-[11px] text-[#4F46E5] font-semibold bg-[#EEF2FF] px-2 py-0.5 rounded border border-[#E0E7FF]">
          {total24h} {total24h === 1 ? 'event' : 'events'} recorded
        </span>
      </div>

      {/* Interactive Chart Container */}
      <div className="relative w-full rounded-md bg-[#FAFAFA] border border-[#E5E5E5] p-2">
        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute -top-3 z-20 pointer-events-none -translate-x-1/2 transition-all duration-75"
            style={{
              left: `${Math.min(92, Math.max(8, (hoveredPoint.x / width) * 100))}%`
            }}
          >
            <div className="px-2.5 py-1.5 rounded bg-[#111111] text-white shadow-lg text-center border border-[#333333]">
              <div className="text-[10px] text-[#A5B4FC] font-mono leading-tight whitespace-nowrap">
                {formatTimestamp(hoveredPoint.time, hoveredPoint.index, points.length)}
              </div>
              <div className="text-xs font-mono font-semibold text-white leading-tight mt-0.5">
                {hoveredPoint.count} {hoveredPoint.count === 1 ? 'event' : 'events'}
              </div>
            </div>
          </div>
        )}

        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-32 overflow-visible cursor-crosshair block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Curvy Area Gradient */}
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#6366F1" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter for data points */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#4F46E5" floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Background horizontal grid guide lines */}
          <line
            x1={paddingLeft}
            y1={paddingTop}
            x2={width - paddingRight}
            y2={paddingTop}
            stroke="#E5E7EB"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={paddingLeft}
            y1={paddingTop + innerHeight / 2}
            x2={width - paddingRight}
            y2={paddingTop + innerHeight / 2}
            stroke="#E5E7EB"
            strokeDasharray="3 3"
            strokeWidth="1"
          />
          <line
            x1={paddingLeft}
            y1={bottomY}
            x2={width - paddingRight}
            y2={bottomY}
            stroke="#D1D5DB"
            strokeWidth="1.2"
          />

          {/* Smooth Curvy Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#chartAreaGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Smooth Curvy Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#4F46E5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300"
            />
          )}

          {/* Dots on points with recorded events */}
          {points.map((p, idx) => {
            if (p.count === 0) return null;
            return (
              <circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#4F46E5"
                stroke="#FFFFFF"
                strokeWidth="1.5"
                filter="url(#glow)"
              />
            );
          })}

          {/* Active Hover Indicator Line & Dot */}
          {hoveredPoint && (
            <g className="pointer-events-none">
              {/* Vertical Guide Line */}
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={bottomY}
                stroke="#6366F1"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {/* Active Dot */}
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill="#4F46E5"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                filter="url(#glow)"
              />
            </g>
          )}
        </svg>

        {/* Timeline Bottom Axis Labels Aligned to Data Points */}
        <div className="relative h-5 text-[10px] font-mono text-[#888888] pt-1 border-t border-[#F0F0F0]">
          {axisTicks.map((tick) => {
            let style = { left: `${(tick.x / width) * 100}%` };
            let transformClass = '-translate-x-1/2';
            if (tick.align === 'left') {
              transformClass = 'translate-x-0';
            } else if (tick.align === 'right') {
              transformClass = '-translate-x-full';
            }

            return (
              <div
                key={tick.label}
                className={`absolute ${transformClass} whitespace-nowrap`}
                style={style}
              >
                <span className={tick.isNow ? 'font-semibold text-[#4F46E5] flex items-center gap-1' : ''}>
                  {tick.isNow && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4F46E5] animate-pulse" />}
                  {tick.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
