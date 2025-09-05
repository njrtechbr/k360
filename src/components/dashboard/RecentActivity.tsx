"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Trophy, 
  UserPlus, 
  Zap, 
  Star,
  Calendar,
  Clock,
  TrendingUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: 'evaluation' | 'achievement' | 'xp_event' | 'attendant_added' | 'season_started';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  attendant?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: {
    rating?: number;
    xp?: number;
    achievement?: string;
  };
}

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'evaluation':
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case 'achievement':
      return <Trophy className="h-4 w-4 text-amber-500" />;
    case 'xp_event':
      return <Zap className="h-4 w-4 text-purple-500" />;
    case 'attendant_added':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'season_started':
      return <Calendar className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'evaluation':
      return 'border-l-blue-500';
    case 'achievement':
      return 'border-l-amber-500';
    case 'xp_event':
      return 'border-l-purple-500';
    case 'attendant_added':
      return 'border-l-green-500';
    case 'season_started':
      return 'border-l-orange-500';
    default:
      return 'border-l-gray-300';
  }
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export function RecentActivity({ activities, isLoading, maxItems = 10 }: RecentActivityProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
          <CardDescription>Últimas ações no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Atividade Recente
          </CardTitle>
          <CardDescription>Últimas ações no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhuma atividade recente</p>
            <p className="text-sm text-muted-foreground mt-2">
              As atividades aparecerão aqui conforme o sistema for utilizado
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayedActivities = activities.slice(0, maxItems);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Atividade Recente
        </CardTitle>
        <CardDescription>
          Últimas {displayedActivities.length} ações no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {displayedActivities.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-l-2 bg-muted/30 ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background border">
                  {getActivityIcon(activity.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm leading-tight">
                        {activity.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                      
                      {/* Metadados específicos por tipo */}
                      <div className="flex items-center gap-2 mt-2">
                        {activity.metadata?.rating && (
                          <Badge variant="outline" className="text-xs">
                            {activity.metadata.rating} <Star className="h-3 w-3 ml-1" />
                          </Badge>
                        )}
                        {activity.metadata?.xp && (
                          <Badge variant="outline" className="text-xs">
                            +{activity.metadata.xp} XP
                          </Badge>
                        )}
                        {activity.metadata?.achievement && (
                          <Badge variant="outline" className="text-xs">
                            {activity.metadata.achievement}
                          </Badge>
                        )}
                      </div>

                      {/* Informações do usuário/atendente */}
                      {(activity.user || activity.attendant) && (
                        <div className="flex items-center gap-2 mt-2">
                          {activity.attendant && (
                            <Link 
                              href={`/dashboard/rh/atendentes/${activity.attendant.id}`}
                              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={activity.attendant.avatar} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(activity.attendant.name)}
                                </AvatarFallback>
                              </Avatar>
                              {activity.attendant.name}
                            </Link>
                          )}
                          {activity.user && !activity.attendant && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={activity.user.avatar} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(activity.user.name)}
                                </AvatarFallback>
                              </Avatar>
                              {activity.user.name}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(activity.timestamp, { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {activities.length > maxItems && (
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {maxItems} de {activities.length} atividades
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}