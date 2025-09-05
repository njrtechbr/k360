import { NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET() {
  try {
    const distribution = await DashboardService.getRatingDistribution();
    return NextResponse.json(distribution);
  } catch (error) {
    console.error('Erro ao buscar distribuição de notas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}