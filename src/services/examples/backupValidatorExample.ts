/**
 * Exemplos de uso do BackupValidator
 * Este arquivo demonstra como usar as funcionalidades de validação de backup
 */

import { BackupValidator } from "../backupValidator";
import path from "path";

/**
 * Exemplo 1: Validação simples de um backup
 */
export async function exemploValidacaoSimples() {
  console.log("=== Exemplo 1: Validação Simples ===");

  const backupPath = "/caminho/para/backup.sql";

  try {
    const resultado = await BackupValidator.validateBackup(backupPath);

    if (resultado.isValid) {
      console.log("✅ Backup válido!");
      console.log(`Checksum: ${resultado.checksum}`);
      console.log(`Tamanho: ${(resultado.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Tempo de validação: ${resultado.validationTime}ms`);

      if (resultado.warnings.length > 0) {
        console.log("⚠️ Avisos:");
        resultado.warnings.forEach((warning) => console.log(`  - ${warning}`));
      }
    } else {
      console.log("❌ Backup inválido!");
      console.log("Erros encontrados:");
      resultado.errors.forEach((error) => console.log(`  - ${error}`));
    }
  } catch (error) {
    console.error("Erro durante validação:", error);
  }
}

/**
 * Exemplo 2: Validação com checksum esperado
 */
export async function exemploValidacaoComChecksum() {
  console.log("\n=== Exemplo 2: Validação com Checksum ===");

  const backupPath = "/caminho/para/backup.sql";
  const checksumEsperado = "abc123def456789";

  try {
    const resultado = await BackupValidator.validateBackup(
      backupPath,
      checksumEsperado,
    );

    if (resultado.isValid) {
      console.log("✅ Backup e checksum válidos!");
    } else {
      console.log("❌ Problemas encontrados:");
      resultado.errors.forEach((error) => {
        if (error.includes("Checksum")) {
          console.log(`  🔍 ${error}`);
        } else {
          console.log(`  - ${error}`);
        }
      });
    }
  } catch (error) {
    console.error("Erro durante validação:", error);
  }
}

/**
 * Exemplo 3: Cálculo de checksum independente
 */
export async function exemploCalculoChecksum() {
  console.log("\n=== Exemplo 3: Cálculo de Checksum ===");

  const backupPath = "/caminho/para/backup.sql";

  try {
    console.log("Calculando checksum...");
    const checksum = await BackupValidator.calculateChecksum(backupPath);

    console.log(`✅ Checksum calculado: ${checksum}`);
    console.log("Este valor pode ser armazenado para validações futuras");

    // Exemplo de verificação posterior
    const verificacao = BackupValidator.validateChecksum(checksum, checksum);
    console.log(`Verificação: ${verificacao.matches ? "OK" : "FALHA"}`);
  } catch (error) {
    console.error("Erro ao calcular checksum:", error);
  }
}

/**
 * Exemplo 4: Validação de estrutura SQL
 */
export async function exemploValidacaoEstruturaSql() {
  console.log("\n=== Exemplo 4: Validação de Estrutura SQL ===");

  const backupPath = "/caminho/para/backup.sql";

  try {
    const estrutura = await BackupValidator.validateSqlStructure(backupPath);

    console.log("📊 Análise da estrutura SQL:");
    console.log(
      `  - Cabeçalho PostgreSQL: ${estrutura.hasValidHeader ? "✅" : "❌"}`,
    );
    console.log(
      `  - Comandos CREATE: ${estrutura.hasCreateStatements ? "✅" : "❌"}`,
    );
    console.log(
      `  - Comandos INSERT: ${estrutura.hasInsertStatements ? "✅" : "❌"}`,
    );
    console.log(
      `  - Comandos COPY: ${estrutura.hasCopyStatements ? "✅" : "❌"}`,
    );
    console.log(
      `  - Footer de conclusão: ${estrutura.hasValidFooter ? "✅" : "❌"}`,
    );
    console.log(`  - Número de tabelas: ${estrutura.tableCount}`);
    console.log(
      `  - Operações de dados estimadas: ${estrutura.estimatedRecords}`,
    );

    // Análise da qualidade do backup
    if (estrutura.hasCreateStatements && estrutura.hasInsertStatements) {
      console.log("✅ Backup completo (estrutura + dados)");
    } else if (estrutura.hasCreateStatements) {
      console.log("⚠️ Backup apenas da estrutura");
    } else if (estrutura.hasInsertStatements || estrutura.hasCopyStatements) {
      console.log("⚠️ Backup apenas dos dados");
    } else {
      console.log("❌ Backup não contém estrutura nem dados");
    }
  } catch (error) {
    console.error("Erro ao validar estrutura SQL:", error);
  }
}

/**
 * Exemplo 5: Detecção de corrupção
 */
export async function exemploDeteccaoCorrupcao() {
  console.log("\n=== Exemplo 5: Detecção de Corrupção ===");

  const backupsParaTestar = [
    "/caminho/para/backup_valido.sql",
    "/caminho/para/backup_corrompido.sql",
    "/caminho/para/backup_comprimido.sql.gz",
  ];

  for (const backupPath of backupsParaTestar) {
    try {
      console.log(`\nTestando: ${path.basename(backupPath)}`);

      const estaCorrempido =
        await BackupValidator.detectFileCorruption(backupPath);

      if (estaCorrempido) {
        console.log("❌ Arquivo parece estar corrompido");
        console.log("  Recomendação: Criar novo backup");
      } else {
        console.log("✅ Arquivo parece estar íntegro");
      }
    } catch (error) {
      console.error(`Erro ao testar ${path.basename(backupPath)}:`, error);
    }
  }
}

/**
 * Exemplo 6: Validação em lote
 */
export async function exemploValidacaoLote() {
  console.log("\n=== Exemplo 6: Validação em Lote ===");

  const backups = [
    "/caminho/para/backup_2025_01_01.sql",
    "/caminho/para/backup_2025_01_02.sql",
    "/caminho/para/backup_2025_01_03.sql.gz",
  ];

  const checksumEsperados = {
    "/caminho/para/backup_2025_01_01.sql": "abc123",
    "/caminho/para/backup_2025_01_02.sql": "def456",
    "/caminho/para/backup_2025_01_03.sql.gz": "ghi789",
  };

  try {
    console.log(`Validando ${backups.length} backups...`);

    const resultados = await BackupValidator.validateMultipleBackups(
      backups,
      checksumEsperados,
    );

    let validos = 0;
    let invalidos = 0;

    for (const [caminho, resultado] of Object.entries(resultados)) {
      const nome = path.basename(caminho);

      if (resultado.isValid) {
        console.log(
          `✅ ${nome} - Válido (${(resultado.size / 1024 / 1024).toFixed(2)} MB)`,
        );
        validos++;
      } else {
        console.log(
          `❌ ${nome} - Inválido (${resultado.errors.length} erro(s))`,
        );
        invalidos++;
      }
    }

    console.log(`\n📊 Resumo: ${validos} válidos, ${invalidos} inválidos`);
  } catch (error) {
    console.error("Erro durante validação em lote:", error);
  }
}

/**
 * Exemplo 7: Geração de relatório completo
 */
export async function exemploRelatorioCompleto() {
  console.log("\n=== Exemplo 7: Relatório Completo ===");

  const backups = [
    "/caminho/para/backup_recente.sql",
    "/caminho/para/backup_antigo.sql",
    "/caminho/para/backup_grande.sql.gz",
  ];

  try {
    const resultados = await BackupValidator.validateMultipleBackups(backups);

    // Gerar relatório detalhado
    const relatorio = BackupValidator.generateValidationReport(resultados);

    console.log("\n📋 RELATÓRIO DETALHADO:");
    console.log(relatorio);

    // Salvar relatório em arquivo (opcional)
    // await fs.writeFile('/caminho/para/relatorio_validacao.txt', relatorio);
    // console.log('\n💾 Relatório salvo em arquivo');
  } catch (error) {
    console.error("Erro ao gerar relatório:", error);
  }
}

/**
 * Exemplo 8: Workflow completo de validação
 */
export async function exemploWorkflowCompleto() {
  console.log("\n=== Exemplo 8: Workflow Completo ===");

  const backupPath = "/caminho/para/backup_producao.sql";

  try {
    console.log("🔍 Iniciando validação completa...");

    // Passo 1: Validação básica
    console.log("\n1️⃣ Validação básica...");
    const validacao = await BackupValidator.validateBackup(backupPath);

    if (!validacao.isValid) {
      console.log("❌ Validação básica falhou. Interrompendo workflow.");
      validacao.errors.forEach((error) => console.log(`  - ${error}`));
      return;
    }

    console.log("✅ Validação básica passou");

    // Passo 2: Análise detalhada da estrutura
    console.log("\n2️⃣ Analisando estrutura SQL...");
    const estrutura = await BackupValidator.validateSqlStructure(backupPath);

    if (!estrutura.hasCreateStatements && !estrutura.hasInsertStatements) {
      console.log("⚠️ Backup não contém dados nem estrutura");
    } else {
      console.log(
        `✅ Backup contém ${estrutura.tableCount} tabela(s) e ${estrutura.estimatedRecords} operação(ões)`,
      );
    }

    // Passo 3: Verificação de corrupção
    console.log("\n3️⃣ Verificando integridade...");
    const corrompido = await BackupValidator.detectFileCorruption(backupPath);

    if (corrompido) {
      console.log("❌ Arquivo pode estar corrompido");
      return;
    }

    console.log("✅ Arquivo parece íntegro");

    // Passo 4: Resumo final
    console.log("\n4️⃣ Resumo final:");
    console.log(`  📁 Arquivo: ${path.basename(backupPath)}`);
    console.log(
      `  📏 Tamanho: ${(validacao.size / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(`  🔐 Checksum: ${validacao.checksum}`);
    console.log(`  ⏱️ Tempo de validação: ${validacao.validationTime}ms`);
    console.log(`  🏗️ Tabelas: ${estrutura.tableCount}`);
    console.log(`  📊 Registros estimados: ${estrutura.estimatedRecords}`);

    if (validacao.warnings.length > 0) {
      console.log("  ⚠️ Avisos:");
      validacao.warnings.forEach((warning) => console.log(`    - ${warning}`));
    }

    console.log("\n🎉 Validação completa finalizada com sucesso!");
  } catch (error) {
    console.error("❌ Erro durante workflow de validação:", error);
  }
}

/**
 * Função principal para executar todos os exemplos
 */
export async function executarTodosExemplos() {
  console.log("🚀 Executando exemplos do BackupValidator...\n");

  // Nota: Em um ambiente real, você substituiria os caminhos pelos arquivos reais
  console.log(
    "ℹ️ Nota: Os exemplos usam caminhos fictícios. Em produção, use caminhos reais.\n",
  );

  try {
    await exemploValidacaoSimples();
    await exemploValidacaoComChecksum();
    await exemploCalculoChecksum();
    await exemploValidacaoEstruturaSql();
    await exemploDeteccaoCorrupcao();
    await exemploValidacaoLote();
    await exemploRelatorioCompleto();
    await exemploWorkflowCompleto();

    console.log("\n✅ Todos os exemplos foram executados!");
  } catch (error) {
    console.error("\n❌ Erro durante execução dos exemplos:", error);
  }
}

// Executar exemplos se o arquivo for chamado diretamente
if (require.main === module) {
  executarTodosExemplos();
}
