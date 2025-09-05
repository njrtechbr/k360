import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const trend = await DashboardService.getEvaluationTrend(days);
    return NextResponse.json(trend);
  } catch (error) {
    console.error('Erro ao buscar tendência de avaliações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}