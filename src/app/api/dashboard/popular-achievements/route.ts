import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '5');
    
    const achievements = await DashboardService.getPopularAchievements(limit);
    return NextResponse.json(achievements);
  } catch (error) {
    console.error('Erro ao buscar conquistas populares:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}