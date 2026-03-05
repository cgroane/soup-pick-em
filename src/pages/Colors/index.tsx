import React from 'react';

const colorTokens = [
  { name: 'background', hex: '#0A0E1A' },
  { name: 'surface', hex: '#141929' },
  { name: 'surface-elevated', hex: '#1E2640' },
  { name: 'border', hex: '#2A3250' },
  { name: 'primary', hex: '#3B82F6' },
  { name: 'success', hex: '#22C55E' },
  { name: 'destructive', hex: '#EF4444' },
  { name: 'warning', hex: '#F59E0B' },
  { name: 'foreground', hex: '#F1F5F9' },
  { name: 'muted-foreground', hex: '#94A3B8' },
];

interface ColorsProps {}

const Colors: React.FC<ColorsProps> = () => {
  return (
    <div className="p-4 flex flex-col gap-2">
      {colorTokens.map((color) => (
        <div key={color.name} className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded border border-border flex-shrink-0"
            style={{ backgroundColor: color.hex }}
          />
          <span className="text-sm text-foreground">{color.name}</span>
          <span className="text-xs text-muted-foreground">{color.hex}</span>
        </div>
      ))}
    </div>
  );
};

export default Colors;

Colors.displayName = 'Colors';
