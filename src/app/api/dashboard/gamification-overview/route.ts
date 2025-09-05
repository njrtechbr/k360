import { NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

export async function GET() {
  try {
    const overview = await DashboardService.getGamificationOverview();
    return NextResponse.json(overview);
  } catch (error) {
    console.error('Erro ao buscar visão geral da gamificação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}