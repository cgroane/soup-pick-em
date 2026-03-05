import React from 'react';
import { Skeleton } from './ui/skeleton';

interface LoadingProps {
  iterations?: number;
  type: 'card' | 'gameCard' | 'profileCard';
}

const Loading = ({ iterations = 1 }: LoadingProps) => {
  const items = Array.from(Array(iterations));
  return (
    <>
      {items.map((_, index) => (
        <div key={`skeleton-${index}`} className="p-4 flex justify-center">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      ))}
    </>
  );
};

export default Loading;
