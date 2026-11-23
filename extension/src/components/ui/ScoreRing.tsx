import React from 'react';

interface ScoreRingProps {
  score: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  showGrade?: boolean;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 110,
  strokeWidth = 9,
  label = 'ICP Fit',
  showGrade = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(Math.max(score, 0), 100) / 100) * circumference;

  const getColor = (val: number) => {
    if (val >= 80) return '#10B981'; // emerald-500
    if (val >= 60) return '#F59E0B'; // amber-500
    return '#EF4444'; // rose-500
  };

  const getGrade = (val: number) => {
    if (val >= 85) return 'A+';
    if (val >= 75) return 'A';
    if (val >= 65) return 'B';
    if (val >= 50) return 'C';
    return 'D';
  };

  const strokeColor = getColor(score);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-bold text-slate-800 tracking-tight leading-none">
            {score}
          </span>
          <span className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">/ 100</span>
          {showGrade && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.2 rounded mt-0.5"
              style={{ color: strokeColor }}
            >
              {getGrade(score)}
            </span>
          )}
        </div>
      </div>
      {label && <span className="text-xs font-medium text-slate-600 mt-1.5">{label}</span>}
    </div>
  );
};
