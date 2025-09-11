export interface ProgressProps {
  value: number;
  max?: number;
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

export interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  showNumbers?: boolean;
  showPercentage?: boolean;
  color?: string;
  height?: number;
  animated?: boolean;
  className?: string;
}

export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  showValue?: boolean;
  color?: string;
  backgroundColor?: string;
  className?: string;
}
