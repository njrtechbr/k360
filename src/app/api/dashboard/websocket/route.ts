import { NextRequest, NextResponse } from 'next/server';
import { dashboardSocketServer } from '@/lib/websocket/dashboardSocket';

// GET - Obter status do servidor WebSocket
export async function GET() {
  try {
    const stats = dashboardSocketServer.getStats();
    
    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao obter status do WebSocket:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}

// POST - Enviar broadcast para todos os clientes conectados
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tipo e dados são obrigatórios' 
        },
        { status: 400 }
      );
    }

    // Enviar broadcast baseado no tipo
    switch (type) {
      case 'evaluation':
        dashboardSocketServer.onEvaluationCreated(data);
        break;
      
      case 'xp':
        dashboardSocketServer.onXpEventCreated(data);
        break;
      
      case 'achievement':
        dashboardSocketServer.onAchievementUnlocked(data);
        break;
      
      case 'full_refresh':
        dashboardSocketServer.triggerFullRefresh();
        break;
      
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Tipo de evento não reconhecido' 
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Broadcast enviado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao processar broadcast:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    );
  }
}