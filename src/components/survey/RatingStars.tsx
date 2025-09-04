'use client';

import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RatingStarsProps {
  /** Valor atual da avaliação (1-5) */
  value?: number;
  /** Callback chamado quando a avaliação muda */
  onChange?: (rating: number) => void;
  /** Se o componente está desabilitado */
  disabled?: boolean;
  /** Se é apenas para leitura */
  readOnly?: boolean;
  /** Tamanho das estrelas */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Mostrar rótulos de texto */
  showLabels?: boolean;
  /** Rótulos personalizados para cada estrela */
  labels?: string[];
  /** Classe CSS adicional */
  className?: string;
  /** Mostrar valor numérico */
  showValue?: boolean;
  /** Permitir avaliação com meio ponto */
  allowHalf?: boolean;
  /** Callback para hover */
  onHover?: (rating: number | null) => void;
}

const defaultLabels = [
  'Muito Ruim',
  'Ruim', 
  'Regular',
  'Bom',
  'Excelente'
];

const RatingStars: React.FC<RatingStarsProps> = ({
  value = 0,
  onChange,
  disabled = false,
  readOnly = false,
  size = 'md',
  showLabels = false,
  labels = defaultLabels,
  className,
  showValue = false,
  allowHalf = false,
  onHover
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const isInteractive = !disabled && !readOnly;
  const displayValue = hoverValue ?? value;

  const handleStarClick = useCallback((rating: number) => {
    if (!isInteractive) return;
    onChange?.(rating);
  }, [isInteractive, onChange]);

  const handleStarHover = useCallback((rating: number | null) => {
    if (!isInteractive) return;
    setHoverValue(rating);
    setIsHovering(rating !== null);
    onHover?.(rating);
  }, [isInteractive, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (!isInteractive) return;
    setHoverValue(null);
    setIsHovering(false);
    onHover?.(null);
  }, [isInteractive, onHover]);

  const getStarFill = useCallback((starIndex: number) => {
    const starValue = starIndex + 1;
    
    if (allowHalf) {
      if (displayValue >= starValue) {
        return 'full';
      } else if (displayValue >= starValue - 0.5) {
        return 'half';
      } else {
        return 'empty';
      }
    } else {
      return displayValue >= starValue ? 'full' : 'empty';
    }
  }, [displayValue, allowHalf]);

  const renderStar = useCallback((starIndex: number) => {
    const starValue = starIndex + 1;
    const fill = getStarFill(starIndex);
    
    return (
      <button
        key={starIndex}
        type="button"
        disabled={disabled}
        className={cn(
          'relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded',
          isInteractive && 'cursor-pointer hover:scale-110',
          disabled && 'cursor-not-allowed opacity-50',
          readOnly && 'cursor-default'
        )}
        onClick={() => handleStarClick(starValue)}
        onMouseEnter={() => handleStarHover(starValue)}
        onMouseLeave={handleMouseLeave}
        aria-label={`Avaliar com ${starValue} estrela${starValue > 1 ? 's' : ''}`}
      >
        <Star
          className={cn(
            sizeClasses[size],
            'transition-colors duration-200',
            fill === 'full' && (
              isHovering 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'fill-yellow-500 text-yellow-500'
            ),
            fill === 'half' && 'fill-yellow-300 text-yellow-400',
            fill === 'empty' && (
              isHovering
                ? 'fill-gray-200 text-gray-300'
                : 'fill-gray-100 text-gray-300'
            )
          )}
        />
        
        {/* Renderização de meia estrela */}
        {fill === 'half' && (
          <Star
            className={cn(
              sizeClasses[size],
              'absolute inset-0 fill-yellow-500 text-yellow-500 transition-colors duration-200'
            )}
            style={{
              clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
            }}
          />
        )}
      </button>
    );
  }, [size, getStarFill, isInteractive, disabled, readOnly, isHovering, handleStarClick, handleStarHover, handleMouseLeave]);

  const currentLabel = labels[Math.ceil(displayValue) - 1] || '';

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, index) => renderStar(index))}
        
        {showValue && (
          <span className={cn(
            'ml-2 font-medium text-gray-700',
            textSizeClasses[size]
          )}>
            {displayValue.toFixed(allowHalf ? 1 : 0)}
          </span>
        )}
      </div>
      
      {showLabels && currentLabel && (
        <div className={cn(
          'text-center font-medium transition-all duration-200',
          textSizeClasses[size],
          isHovering ? 'text-yellow-600' : 'text-gray-600'
        )}>
          {currentLabel}
        </div>
      )}
    </div>
  );
};

// Componente simplificado para exibição apenas
export function RatingDisplay({ 
  value, 
  size = 'md', 
  showValue = true,
  className 
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showValue?: boolean;
  className?: string;
}) {
  return (
    <RatingStars
      value={value}
      readOnly
      size={size}
      showValue={showValue}
      className={className}
    />
  );
}

// Hook para gerenciar estado de rating
export function useRating(initialValue: number = 0) {
  const [rating, setRating] = useState(initialValue);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const handleRatingChange = useCallback((newRating: number) => {
    setRating(newRating);
  }, []);

  const handleHover = useCallback((hoverRating: number | null) => {
    setHoverValue(hoverRating);
    setIsHovering(hoverRating !== null);
  }, []);

  const reset = useCallback(() => {
    setRating(0);
    setHoverValue(null);
    setIsHovering(false);
  }, []);

  return {
    rating,
    setRating: handleRatingChange,
    hoverValue,
    isHovering,
    onHover: handleHover,
    reset,
    displayValue: hoverValue ?? rating
  };
}

// Variantes pré-configuradas
export const SmallRating = (props: Omit<RatingStarsProps, 'size'>) => (
  <RatingStars {...props} size="sm" />
);

export const LargeRating = (props: Omit<RatingStarsProps, 'size'>) => (
  <RatingStars {...props} size="lg" />
);

export const RatingWithLabels = (props: Omit<RatingStarsProps, 'showLabels'>) => (
  <RatingStars {...props} showLabels />
);

export const InteractiveRating = (props: Omit<RatingStarsProps, 'showLabels' | 'showValue'>) => (
  <RatingStars {...props} showLabels showValue />
);

export default RatingStars;