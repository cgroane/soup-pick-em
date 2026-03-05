import React, { useCallback } from 'react';


const OtherMarkets: React.FC = () => {
  const fetchMoreMarkets = useCallback(() => {
    // placeholder for future market data
  }, []);

  return (
    <details className="mt-2" onToggle={(e) => (e.currentTarget.open ? fetchMoreMarkets() : null)}>
      <summary className="text-sm text-muted-foreground cursor-pointer select-none px-2 py-1 hover:text-foreground transition-colors">
        More Market Options
      </summary>
      <div className="p-3">{/* market options will appear here */}</div>
    </details>
  );
};

export default OtherMarkets;

OtherMarkets.displayName = 'OtherMarkets';
