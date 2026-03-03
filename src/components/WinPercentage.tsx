import React, { useMemo } from 'react';

interface WinPercentageProps {
  wins: number;
  losses: number;
  label: string;
}

const WinPercentage = ({ wins = 0, losses = 0, label }: WinPercentageProps) => {
  const val = useMemo(() => {
    return wins && losses ? wins / (wins + losses) : 0;
  }, [wins, losses]);

  const pct = val * 100;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (val * circumference);

  return (
    <div className="flex flex-col items-center pb-4">
      <h3 className="text-center w-full text-base font-normal mb-2">{label}</h3>
      <div className="relative flex items-center justify-center w-32 h-32">
        <svg className="rotate-[-90deg]" width="128" height="128" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#1E2640"
            strokeWidth="10"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-xl font-bold text-foreground">{pct.toFixed(1)}%</span>
          <span className="text-xs text-muted-foreground">{wins} - {losses}</span>
        </div>
      </div>
    </div>
  );
};

export default WinPercentage;
