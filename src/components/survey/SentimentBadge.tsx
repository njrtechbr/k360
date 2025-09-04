'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Smile, Frown, Meh, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SentimentBadgeProps } from './types';

const sentimentConfig = {
  positive: {
    label: 'Positivo',
    icon: Smile,
    colors: {
      default: 'bg-green-500 text-white hover:bg-green-600',
      outline: 'border-green-500 text-green-700 hover:bg-green-50',
      subtle: 'bg-green-50 text-green-700 hover:bg-green-100'
    }
  },
  negative: {
    label: 'Negativo',
    icon: Frown,
    colors: {
      default: 'bg-red-500 text-white hover:bg-red-600',
      outline: 'border-red-500 text-red-700 hover:bg-red-50',
      subtle: 'bg-red-50 text-red-700 hover:bg-red-100'
    }
  },
  neutral: {
    label: 'Neutro',
    icon: Meh,
    colors: {
      default: 'bg-gray-500 text-white hover:bg-gray-600',
      outline: 'border-gray-500 text-gray-700 hover:bg-gray-50',
      subtle: 'bg-gray-50 text-gray-700 hover:bg-gray-100'
    }
  },
  // Compatibilidade com valores antigos
  'Positivo': {
    label: 'Positivo',
    icon: Smile,
    colors: {
      default: 'bg-green-500 text-white hover:bg-green-600',
      outline: 'border-green-500 text-green-700 hover:bg-green-50',
      subtle: 'bg-green-50 text-green-700 hover:bg-green-100'
    }
  },
  'Negativo': {
    label: 'Negativo',
    icon: Frown,
    colors: {
      default: 'bg-red-500 text-white hover:bg-red-600',
      outline: 'border-red-500 text-red-700 hover:bg-red-50',
      subtle: 'bg-red-50 text-red-700 hover:bg-red-100'
    }
  },
  'Neutro': {
    label: 'Neutro',
    icon: Meh,
    colors: {
      default: 'bg-gray-500 text-white hover:bg-gray-600',
      outline: 'border-gray-500 text-gray-700 hover:bg-gray-50',
      subtle: 'bg-gray-50 text-gray-700 hover:bg-gray-100'
    }
  }
};

const sizeClasses = {
  sm: {
    badge: 'text-xs px-2 py-1',
    icon: 'w-3 h-3',
    confidence: 'text-xs'
  },
  md: {
    badge: 'text-sm px-2.5 py-1.5',
    icon: 'w-4 h-4',
    confidence: 'text-sm'
  },
  lg: {
    badge: 'text-base px-3 py-2',
    icon: 'w-5 h-5',
    confidence: 'text-base'
  }
};

function getConfidenceLevel(confidence: number): {
  level: 'low' | 'medium' | 'high';
  label: string;
  color: string;
} {
  if (confidence >= 0.8) {
    return {
      level: 'high',
      label: 'Alta confiança',
      color: 'text-green-600'
    };
  } else if (confidence >= 0.6) {
    return {
      level: 'medium',
      label: 'Média confiança',
      color: 'text-yellow-600'
    };
  } else {
    return {
      level: 'low',
      label: 'Baixa confiança',
      color: 'text-red-600'
    };
  }
}

const SentimentBadge: React.FC<SentimentBadgeProps> = ({
  sentiment,
  confidence,
  size = 'md',
  showConfidence = false,
  className,
  showIcon = true,
  variant = 'default',
  tooltip
}) => {
  const config = sentimentConfig[sentiment as keyof typeof sentimentConfig];
  const sizeConfig = sizeClasses[size];
  const Icon = config?.icon || Meh;
  
  const confidenceInfo = confidence !== undefined ? getConfidenceLevel(confidence) : null;
  
  const badgeContent = (
    <Badge
      className={cn(
        'inline-flex items-center gap-1.5 font-medium transition-colors',
        config?.colors[variant] || sentimentConfig.neutral.colors[variant],
        sizeConfig.badge,
        className
      )}
    >
      {showIcon && <Icon className={sizeConfig.icon} />}
      <span>{config?.label || 'Neutro'}</span>
      {showConfidence && confidence !== undefined && (
        <span className={cn('font-normal opacity-90', sizeConfig.confidence)}>
          ({Math.round(confidence * 100)}%)
        </span>
      )}
    </Badge>
  );

  const tooltipContent = tooltip || (
    <div className="space-y-1">
      <div className="font-medium">
        Sentimento: {config?.label || 'Neutro'}
      </div>
      {confidence !== undefined && confidenceInfo && (
        <div className="text-sm">
          <div className={confidenceInfo.color}>
            {confidenceInfo.label}: {Math.round(confidence * 100)}%
          </div>
        </div>
      )}
    </div>
  );

  if (tooltip !== null && (tooltip || confidence !== undefined)) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
};

// Componente para mostrar confiança separadamente
export function ConfidenceBadge({
  confidence,
  size = 'sm',
  className
}: {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const confidenceInfo = getConfidenceLevel(confidence);
  const sizeConfig = sizeClasses[size];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'inline-flex items-center gap-1',
              confidenceInfo.color,
              sizeConfig.badge,
              className
            )}
          >
            <TrendingUp className={sizeConfig.icon} />
            {Math.round(confidence * 100)}%
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            {confidenceInfo.label}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Componente para análise completa
export function SentimentAnalysis({
  sentiment,
  confidence,
  size = 'md',
  showDetails = false,
  className
}: {
  sentiment: string;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}) {
  const confidenceInfo = confidence !== undefined ? getConfidenceLevel(confidence) : null;
  
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <SentimentBadge
        sentiment={sentiment}
        confidence={showDetails ? confidence : undefined}
        size={size}
        showConfidence={showDetails}
        showIcon
      />
      
      {!showDetails && confidence !== undefined && (
        <ConfidenceBadge
          confidence={confidence}
          size={size === 'lg' ? 'md' : 'sm'}
        />
      )}
      
      {showDetails && confidenceInfo && confidence !== undefined && confidence < 0.6 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                Análise com baixa confiança.
                <br />
                Recomenda-se revisão manual.
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default SentimentBadge;