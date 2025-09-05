import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '6');
    
    const stats = await DashboardService.getMonthlyEvaluationStats(months);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas mensais:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}