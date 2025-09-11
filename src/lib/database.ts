import { Pool, PoolClient } from "pg";

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // máximo de conexões
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Classe para operações diretas com PostgreSQL
export class DatabaseService {
  // Executar query simples
  static async query(text: string, params?: any[]): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      console.error("Erro na query:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Executar transação
  static async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // Exemplo: Query complexa de relatório
  static async getUserStatsReport(): Promise<any[]> {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.role,
        COUNT(DISTINCT ai.id) as attendant_imports,
        COUNT(DISTINCT ei.id) as evaluation_imports,
        COUNT(DISTINCT a.id) as total_attendants,
        COUNT(DISTINCT e.id) as total_evaluations,
        COALESCE(SUM(xe.points), 0) as total_xp
      FROM "User" u
      LEFT JOIN "AttendantImport" ai ON u.id = ai."importedById"
      LEFT JOIN "EvaluationImport" ei ON u.id = ei."importedById"
      LEFT JOIN "Attendant" a ON a."importId" = ai.id
      LEFT JOIN "Evaluation" e ON e."attendantId" = a.id
      LEFT JOIN "XpEvent" xe ON xe."userId" = u.id
      GROUP BY u.id, u.name, u.role
      ORDER BY total_xp DESC, u.name;
    `;

    return await this.query(query);
  }

  // Exemplo: Limpeza de dados órfãos
  static async cleanOrphanedData(): Promise<void> {
    await this.transaction(async (client) => {
      // Remover avaliações sem atendente
      await client.query(`
        DELETE FROM "Evaluation" 
        WHERE "attendantId" NOT IN (SELECT id FROM "Attendant")
      `);

      // Remover eventos XP sem usuário
      await client.query(`
        DELETE FROM "XpEvent" 
        WHERE "userId" NOT IN (SELECT id FROM "User")
      `);

      // Remover sessões expiradas
      await client.query(`
        DELETE FROM "Session" 
        WHERE expires < NOW()
      `);
    });
  }

  // Exemplo: Análise de performance
  static async getSlowQueries(): Promise<any[]> {
    const query = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE mean_time > 100
      ORDER BY mean_time DESC
      LIMIT 10;
    `;

    return await this.query(query);
  }

  // Fechar pool (para cleanup)
  static async close(): Promise<void> {
    await pool.end();
  }
}

// Exemplo de uso em API route
export async function getUserAnalytics(userId: string) {
  const query = `
    SELECT 
      DATE_TRUNC('day', e."data") as date,
      COUNT(*) as evaluations_count,
      AVG(e.nota::numeric) as avg_rating,
      SUM(xe.points) as daily_xp
    FROM "Evaluation" e
    JOIN "Attendant" a ON e."attendantId" = a.id
    JOIN "AttendantImport" ai ON a."importId" = ai.id
    LEFT JOIN "XpEvent" xe ON xe."evaluationId" = e.id
    WHERE ai."importedById" = $1
      AND e."data" >= NOW() - INTERVAL '30 days'
    GROUP BY DATE_TRUNC('day', e."data")
    ORDER BY date DESC;
  `;

  return await DatabaseService.query(query, [userId]);
}
