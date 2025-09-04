export interface XPDisplayProps {
  currentXp: number;
  showLevel?: boolean;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export interface XPCounterProps {
  xp: number;
  animated?: boolean;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface XPGainProps {
  amount: number;
  reason: string;
  timestamp: string;
  animated?: boolean;
  className?: string;
}