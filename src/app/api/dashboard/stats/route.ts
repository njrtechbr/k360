import { NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET() {
  try {
    const stats = await DashboardService.getGeneralStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}