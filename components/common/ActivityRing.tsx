import React from 'react';
import { PieChart, Pie, Cell } from 'recharts';

interface ActivityRingProps {
  value: number;
  max: number;
  color: string;
  label?: string;
  size?: number;
  strokeWidth?: number;
  backgroundColor?: string;
}

interface RingMetric {
  value: number;
  max: number;
  color: string;
  label: string;
  unit?: string;
}

interface ConcentricActivityRingsProps {
  metrics: RingMetric[];
  size?: number;
  strokeWidth?: number;
}

/**
 * ActivityRing - a circular progress ring for analytics (like Apple Activity Rings).
 */
const ActivityRing: React.FC<ActivityRingProps> = ({
  value,
  max,
  color,
  label,
  size = 120,
  strokeWidth = 16,
  backgroundColor = '#22242a',
}) => {
  const percent = Math.max(0, Math.min(1, value / max));
  const data = [
    { name: 'progress', value: percent },
    { name: 'rest', value: 1 - percent },
  ];
  return (
    <div style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}>
      <PieChart width={size} height={size}>
        <Pie
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={size / 2 - strokeWidth}
          outerRadius={size / 2}
          dataKey="value"
          stroke="none"
        >
          <Cell key="progress" fill={color} cornerRadius={strokeWidth / 2} />
          <Cell key="rest" fill={backgroundColor} />
        </Pie>
      </PieChart>
      {label && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            pointerEvents: 'none',
          }}
        >
          <span style={{ color: color, fontWeight: 700, fontSize: size * 0.22 }}>{value}</span>
          <span style={{ color: '#aaa', fontSize: size * 0.13 }}>{label}</span>
        </div>
      )}
    </div>
  );
};

export const ConcentricActivityRings: React.FC<ConcentricActivityRingsProps> = ({
  metrics,
  size = 180,
  strokeWidth = 18,
}) => {
  const ringGap = 10;
  const numRings = metrics.length;
  const rings = metrics.map((metric, i) => {
    const radius = (size / 2) - (i * (strokeWidth + ringGap)) - strokeWidth / 2;
    const percent = Math.max(0, Math.min(1, metric.value / metric.max));
    const circumference = 2 * Math.PI * radius;
    const dash = percent * circumference;
    const offset = circumference - dash;
    return { ...metric, radius, percent, circumference, dash, offset };
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        {rings.map((ring, i) => (
          <circle
            key={ring.label}
            cx={size / 2}
            cy={size / 2}
            r={ring.radius}
            fill="none"
            stroke="#23272e"
            strokeWidth={strokeWidth}
          />
        ))}
        {rings.map((ring, i) => (
          <circle
            key={ring.label + '-progress'}
            cx={size / 2}
            cy={size / 2}
            r={ring.radius}
            fill="none"
            stroke={ring.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${ring.dash} ${ring.circumference - ring.dash}`}
            strokeDashoffset={ring.circumference * 0.25}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(.4,2,.6,1)', filter: 'drop-shadow(0 0 6px ' + ring.color + '44)' }}
          />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 110 }}>
        {rings.map((ring, i) => (
          <div key={ring.label + '-stat'} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={{ color: '#a3a3a3', fontSize: 15, fontWeight: 500, letterSpacing: 1 }}>{ring.label.toUpperCase()}</span>
            <span style={{ color: ring.color, fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>
              {ring.value}
              <span style={{ color: '#fff', fontWeight: 400, fontSize: 20, marginLeft: 2 }}>
                /{ring.max}
                {ring.unit && <span style={{ color: '#a3a3a3', fontSize: 15, marginLeft: 2 }}>{ring.unit}</span>}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityRing; 