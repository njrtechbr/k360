import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BackupErrorHandler } from '@/services/backupErrorHandler';

/**
 * GET /api/backup/error-report
 * Gera relatório detalhado de erros de backup
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar permissões (apenas ADMIN e SUPERADMIN podem gerar relatórios)
    if (!['ADMIN', 'SUPERADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para gerar relatórios de erro' },
        { status: 403 }
      );
    }

    // Obter parâmetros da query
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const format = searchParams.get('format') || 'json'; // json ou text

    // Validar parâmetros
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Parâmetro days deve estar entre 1 e 365' },
        { status: 400 }
      );
    }

    if (!['json', 'text'].includes(format)) {
      return NextResponse.json(
        { error: 'Formato deve ser json ou text' },
        { status: 400 }
      );
    }

    // Gerar relatório
    const report = await BackupErrorHandler.generateErrorReport(days);
    const stats = await BackupErrorHandler.getErrorStats(days);

    if (format === 'text') {
      // Retornar como texto plano
      return new NextResponse(report, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Content-Disposition': `attachment; filename="backup-error-report-${days}days-${new Date().toISOString().split('T')[0]}.txt"`
        }
      });
    }

    // Retornar como JSON
    return NextResponse.json({
      success: true,
      data: {
        period: `${days} dias`,
        report,
        stats,
        generatedAt: new Date().toISOString(),
        generatedBy: session.user.email
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor ao gerar relatório' 
      },
      { status: 500 }
    );
  }
}