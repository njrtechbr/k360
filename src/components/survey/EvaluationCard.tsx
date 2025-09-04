'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, MessageSquare, Star, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { RatingDisplay } from './RatingStars';
import SentimentBadge, { SentimentAnalysis } from './SentimentBadge';
import { EvaluationCardProps } from './types';

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const EvaluationCard: React.FC<EvaluationCardProps> = ({
  evaluation,
  attendant,
  showAttendant = true,
  showActions = true,
  compact = false,
  className,
  onView,
  onEdit,
  onDelete,
  onAttendantClick
}) => {
  const hasActions = showActions && (onView || onEdit || onDelete);

  return (
    <Card className={cn(
      'transition-all duration-200 hover:shadow-md',
      compact ? 'p-3' : 'p-4',
      className
    )}>
      <CardHeader className={cn(
        'flex flex-row items-start justify-between space-y-0',
        compact ? 'pb-2' : 'pb-3'
      )}>
        <div className="flex items-start space-x-3 flex-1">
          {showAttendant && attendant && (
            <div 
              className={cn(
                'flex items-center space-x-2',
                onAttendantClick && 'cursor-pointer hover:opacity-80'
              )}
              onClick={onAttendantClick}
            >
              <Avatar className={compact ? 'h-8 w-8' : 'h-10 w-10'}>
                <AvatarImage 
                  src={attendant.avatar || attendant.avatarUrl} 
                  alt={attendant.nome || attendant.name}
                />
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(attendant.nome || attendant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className={cn(
                  'font-medium text-foreground truncate',
                  compact ? 'text-sm' : 'text-base'
                )}>
                  {attendant.nome || attendant.name}
                </p>
                {!compact && (attendant.setor || attendant.funcao) && (
                  <p className="text-xs text-muted-foreground">
                    {attendant.setor || attendant.funcao}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <RatingDisplay 
                value={evaluation.nota || evaluation.rating} 
                size={compact ? 'sm' : 'md'}
                showValue
              />
              
              {evaluation.sentiment && (
                <SentimentAnalysis
                  sentiment={evaluation.sentiment}
                  confidence={evaluation.confidence}
                  size={compact ? 'sm' : 'md'}
                />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formatDate(evaluation.data || evaluation.createdAt)}</span>
              
              {(evaluation.comentario || evaluation.comment) && (
                <>
                  <Separator orientation="vertical" className="h-3" />
                  <MessageSquare className="h-3 w-3" />
                  <span>{(evaluation.comentario || evaluation.comment).length} caracteres</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {hasActions && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(evaluation)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(evaluation)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {(onView || onEdit) && onDelete && (
                <DropdownMenuSeparator />
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(evaluation)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      
      {(evaluation.comentario || evaluation.comment) && (
        <CardContent className={cn(
          'pt-0',
          compact ? 'pb-2' : 'pb-3'
        )}>
          <div className="space-y-2">
            <p className={cn(
              'text-muted-foreground leading-relaxed',
              compact ? 'text-sm' : 'text-base'
            )}>
              {evaluation.comentario || evaluation.comment}
            </p>
            
            {evaluation.tags && evaluation.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {evaluation.tags.map((tag: string, index: number) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            
            {evaluation.xpGained > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="secondary" className="text-xs">
                  +{evaluation.xpGained} XP
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// Lista de avaliações
export interface EvaluationsListProps {
  evaluations: any[];
  loading?: boolean;
  emptyMessage?: string;
  showActions?: boolean;
  compact?: boolean;
  onView?: (evaluation: any) => void;
  onEdit?: (evaluation: any) => void;
  onDelete?: (evaluation: any) => void;
  onAttendantClick?: (attendant: any) => void;
  className?: string;
}

export const EvaluationsList: React.FC<EvaluationsListProps> = ({
  evaluations,
  loading = false,
  emptyMessage = "Nenhuma avaliação encontrada",
  showActions = true,
  compact = false,
  onView,
  onEdit,
  onDelete,
  onAttendantClick,
  className
}) => {
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (evaluations.length === 0) {
    return (
      <Card className={cn("p-8 text-center", className)}>
        <div className="text-gray-500">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {evaluations.map((evaluation) => (
        <EvaluationCard
          key={evaluation.id}
          evaluation={evaluation}
          attendant={evaluation.attendant}
          showActions={showActions}
          compact={compact}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onAttendantClick={onAttendantClick}
        />
      ))}
    </div>
  );
};

// Variantes pré-configuradas
export const CompactEvaluationCard: React.FC<Omit<EvaluationCardProps, 'compact'>> = (props) => (
  <EvaluationCard {...props} compact={true} />
);

export const SimpleEvaluationCard: React.FC<Omit<EvaluationCardProps, 'showActions' | 'compact'>> = (props) => (
  <EvaluationCard {...props} showActions={false} compact={true} />
);

export default EvaluationCard;