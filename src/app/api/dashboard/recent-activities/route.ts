import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const activities = await DashboardService.getRecentActivities(limit);
    return NextResponse.json(activities);
  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}