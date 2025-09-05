"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getXpForLevel, MAX_LEVEL } from '@/lib/xp';
import { Shield, TrendingUp, Target } from 'lucide-react';

interface LevelScaleProps {
  currentLevel?: number;
  currentXp?: number;
  className?: string;
}

const LevelScale: React.FC<LevelScaleProps> = ({ 
  currentLevel = 1, 
  currentXp = 0, 
  className 
}) => {
  // Gerar dados para todos os níveis
  const levelData = Array.from({ length: MAX_LEVEL }, (_, index) => {
    const level = index + 1;
    const xpRequired = getXpForLevel(level);
    const xpForNext = level < MAX_LEVEL ? getXpForLevel(level + 1) : xpRequired;
    const xpDifference = xpForNext - xpRequired;
    
    return {
      level,
      xpRequired,
      xpForNext,
      xpDifference,
      isCurrentLevel: level === currentLevel,
      isUnlocked: level <= currentLevel
    };
  });

  // Estatísticas gerais
  const totalXpForMaxLevel = getXpForLevel(MAX_LEVEL);
  const averageXpPerLevel = totalXpForMaxLevel / MAX_LEVEL;
  const progressToMax = currentXp > 0 ? (currentXp / totalXpForMaxLevel) * 100 : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Nível Máximo</p>
                <p className="text-2xl font-bold">{MAX_LEVEL}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">XP Total para Nível Máximo</p>
                <p className="text-2xl font-bold">{totalXpForMaxLevel.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Progresso Total</p>
                <p className="text-2xl font-bold">{progressToMax.toFixed(1)}%</p>
                <Progress value={progressToMax} className="h-1 mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Níveis */}
      <Card>
        <CardHeader>
          <CardTitle>Escala de Níveis e XP</CardTitle>
          <CardDescription>
            Requisitos de experiência para cada nível do sistema de gamificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-20">Nível</TableHead>
                  <TableHead>XP Necessário</TableHead>
                  <TableHead>XP para Próximo</TableHead>
                  <TableHead>Diferença</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {levelData.map((data) => (
                  <TableRow 
                    key={data.level}
                    className={data.isCurrentLevel ? 'bg-blue-50 dark:bg-blue-950/20' : ''}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Shield 
                          className={`h-4 w-4 ${
                            data.isUnlocked ? 'text-blue-500' : 'text-muted-foreground'
                          }`} 
                        />
                        {data.level}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {data.xpRequired.toLocaleString()} XP
                    </TableCell>
                    <TableCell className="font-mono">
                      {data.level < MAX_LEVEL 
                        ? `${data.xpForNext.toLocaleString()} XP`
                        : 'Nível Máximo'
                      }
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {data.level < MAX_LEVEL 
                        ? `+${data.xpDifference.toLocaleString()}`
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {data.isCurrentLevel && (
                        <Badge variant="default" className="text-xs">
                          Atual
                        </Badge>
                      )}
                      {data.isUnlocked && !data.isCurrentLevel && (
                        <Badge variant="secondary" className="text-xs">
                          Desbloqueado
                        </Badge>
                      )}
                      {!data.isUnlocked && (
                        <Badge variant="outline" className="text-xs">
                          Bloqueado
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LevelScale;