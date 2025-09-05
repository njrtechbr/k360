#!/bin/bash

# Script de deployment do sistema de backup
# Automatiza a instalação e configuração em diferentes ambientes

set -e  # Parar em caso de erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações padrão
ENVIRONMENT=${1:-"development"}
PROJECT_ROOT=$(pwd)
BACKUP_DIR="${PROJECT_ROOT}/backups"
LOG_FILE="${PROJECT_ROOT}/logs/deployment.log"

# Funções auxiliares
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

# Verificar se está na raiz do projeto
check_project_root() {
    if [[ ! -f "package.json" ]]; then
        error "Execute este script na raiz do projeto (onde está o package.json)"
    fi
    
    if [[ ! -d "src" ]]; then
        error "Diretório 'src' não encontrado. Verifique se está no projeto correto."
    fi
    
    success "Projeto encontrado: $(basename "$PROJECT_ROOT")"
}

# Verificar pré-requisitos do sistema
check_prerequisites() {
    log "Verificando pré-requisitos do sistema..."
    
    # Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        success "Node.js: $NODE_VERSION"
    else
        error "Node.js não encontrado. Instale Node.js 18+ antes de continuar."
    fi
    
    # npm
    if command -v npm >/dev/null 2>&1; then
        NPM_VERSION=$(npm --version)
        success "npm: $NPM_VERSION"
    else
        error "npm não encontrado. Instale npm antes de continuar."
    fi
    
    # PostgreSQL
    if command -v psql >/dev/null 2>&1; then
        PSQL_VERSION=$(psql --version | head -n1)
        success "PostgreSQL client: $PSQL_VERSION"
    else
        warning "PostgreSQL client não encontrado. Instale postgresql-client se necessário."
    fi
    
    # pg_dump
    if command -v pg_dump >/dev/null 2>&1; then
        PGDUMP_VERSION=$(pg_dump --version | head -n1)
        success "pg_dump: $PGDUMP_VERSION"
    else
        error "pg_dump não encontrado. Instale PostgreSQL client tools."
    fi
}

# Configurar ambiente específico
setup_environment() {
    log "Configurando ambiente: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        "development")
            setup_development
            ;;
        "staging")
            setup_staging
            ;;
        "production")
            setup_production
            ;;
        *)
            error "Ambiente inválido: $ENVIRONMENT. Use: development, staging, ou production"
            ;;
    esac
}

# Configuração para desenvolvimento
setup_development() {
    log "Configurando ambiente de desenvolvimento..."
    
    # Variáveis específicas de desenvolvimento
    cat > .env.backup.development << EOF
# Configurações de Desenvolvimento - Sistema de Backup
BACKUP_DIRECTORY=${PROJECT_ROOT}/backups
BACKUP_MAX_SIZE_GB=5
BACKUP_RETENTION_DAYS=7
BACKUP_MAX_CONCURRENT=1
BACKUP_ENABLE_COMPRESSION=true
BACKUP_ENABLE_MONITORING=true
BACKUP_LOG_LEVEL=debug

# PostgreSQL
PGDUMP_TIMEOUT=1800
PGDUMP_PATH=$(which pg_dump)

# Segurança (desenvolvimento)
BACKUP_RATE_LIMIT_REQUESTS=20
BACKUP_RATE_LIMIT_WINDOW_MS=300000
EOF
    
    success "Configuração de desenvolvimento criada"
}

# Configuração para staging
setup_staging() {
    log "Configurando ambiente de staging..."
    
    cat > .env.backup.staging << EOF
# Configurações de Staging - Sistema de Backup
BACKUP_DIRECTORY=/app/backups
BACKUP_MAX_SIZE_GB=10
BACKUP_RETENTION_DAYS=14
BACKUP_MAX_CONCURRENT=2
BACKUP_ENABLE_COMPRESSION=true
BACKUP_ENABLE_MONITORING=true
BACKUP_LOG_LEVEL=info

# PostgreSQL
PGDUMP_TIMEOUT=3600
PGDUMP_PATH=/usr/bin/pg_dump

# Segurança (staging)
BACKUP_RATE_LIMIT_REQUESTS=15
BACKUP_RATE_LIMIT_WINDOW_MS=600000
EOF
    
    success "Configuração de staging criada"
}

# Configuração para produção
setup_production() {
    log "Configurando ambiente de produção..."
    
    cat > .env.backup.production << EOF
# Configurações de Produção - Sistema de Backup
BACKUP_DIRECTORY=/app/backups
BACKUP_MAX_SIZE_GB=50
BACKUP_RETENTION_DAYS=30
BACKUP_MAX_CONCURRENT=2
BACKUP_ENABLE_COMPRESSION=true
BACKUP_ENABLE_MONITORING=true
BACKUP_LOG_LEVEL=warn

# PostgreSQL
PGDUMP_TIMEOUT=7200
PGDUMP_PATH=/usr/bin/pg_dump

# Segurança (produção)
BACKUP_RATE_LIMIT_REQUESTS=10
BACKUP_RATE_LIMIT_WINDOW_MS=900000
EOF
    
    success "Configuração de produção criada"
}

# Instalar dependências
install_dependencies() {
    log "Instalando dependências..."
    
    # Verificar se node_modules existe
    if [[ ! -d "node_modules" ]]; then
        log "Instalando dependências npm..."
        npm ci --production=false
        success "Dependências npm instaladas"
    else
        log "Verificando dependências..."
        npm audit --audit-level=high
        success "Dependências verificadas"
    fi
    
    # Verificar dependências específicas do backup
    REQUIRED_DEPS=("archiver")
    for dep in "${REQUIRED_DEPS[@]}"; do
        if npm list "$dep" >/dev/null 2>&1; then
            success "Dependência encontrada: $dep"
        else
            warning "Instalando dependência faltante: $dep"
            npm install "$dep"
        fi
    done
}

# Criar estrutura de diretórios
create_directories() {
    log "Criando estrutura de diretórios..."
    
    # Diretórios principais
    DIRECTORIES=(
        "$BACKUP_DIR"
        "$BACKUP_DIR/files"
        "$BACKUP_DIR/temp"
        "${PROJECT_ROOT}/logs"
    )
    
    for dir in "${DIRECTORIES[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            success "Diretório criado: $dir"
        else
            success "Diretório já existe: $dir"
        fi
        
        # Configurar permissões
        chmod 755 "$dir"
    done
}

# Configurar permissões de segurança
setup_security() {
    log "Configurando segurança..."
    
    # Permissões do diretório de backup
    if [[ -d "$BACKUP_DIR" ]]; then
        chmod 755 "$BACKUP_DIR"
        chmod 755 "$BACKUP_DIR/files"
        chmod 755 "$BACKUP_DIR/temp"
        success "Permissões do diretório de backup configuradas"
    fi
    
    # Permissões dos logs
    if [[ -d "${PROJECT_ROOT}/logs" ]]; then
        chmod 755 "${PROJECT_ROOT}/logs"
        success "Permissões do diretório de logs configuradas"
    fi
    
    # Verificar se arquivos sensíveis não são legíveis por outros
    if [[ -f ".env" ]]; then
        chmod 600 .env
        success "Permissões do arquivo .env configuradas"
    fi
}

# Inicializar registry de backups
initialize_registry() {
    log "Inicializando registry de backups..."
    
    REGISTRY_FILE="$BACKUP_DIR/registry.json"
    
    if [[ ! -f "$REGISTRY_FILE" ]]; then
        cat > "$REGISTRY_FILE" << EOF
{
  "backups": [],
  "lastCleanup": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "settings": {
    "maxBackups": 50,
    "retentionDays": 30,
    "defaultDirectory": "$BACKUP_DIR",
    "enableCompression": true,
    "enableMonitoring": true
  },
  "version": "1.0.0",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "environment": "$ENVIRONMENT"
}
EOF
        success "Registry de backups criado"
    else
        success "Registry de backups já existe"
    fi
    
    chmod 644 "$REGISTRY_FILE"
}

# Configurar cron jobs (apenas para produção)
setup_cron_jobs() {
    if [[ "$ENVIRONMENT" == "production" ]]; then
        log "Configurando cron jobs para produção..."
        
        # Criar script de backup automático
        cat > "${PROJECT_ROOT}/scripts/auto-backup.sh" << EOF
#!/bin/bash
# Script de backup automático
cd "$PROJECT_ROOT"
npm run backup:create --compress >> "${PROJECT_ROOT}/logs/auto-backup.log" 2>&1
EOF
        
        chmod +x "${PROJECT_ROOT}/scripts/auto-backup.sh"
        
        # Criar script de limpeza automática
        cat > "${PROJECT_ROOT}/scripts/auto-cleanup.sh" << EOF
#!/bin/bash
# Script de limpeza automática
cd "$PROJECT_ROOT"
npm run backup:cleanup 30 >> "${PROJECT_ROOT}/logs/auto-cleanup.log" 2>&1
EOF
        
        chmod +x "${PROJECT_ROOT}/scripts/auto-cleanup.sh"
        
        success "Scripts de automação criados"
        
        # Sugerir configuração do crontab
        warning "Configure o crontab manualmente:"
        echo "  # Backup diário às 2h"
        echo "  0 2 * * * ${PROJECT_ROOT}/scripts/auto-backup.sh"
        echo "  # Limpeza semanal aos domingos às 3h"
        echo "  0 3 * * 0 ${PROJECT_ROOT}/scripts/auto-cleanup.sh"
    fi
}

# Executar testes de validação
run_validation() {
    log "Executando validação do ambiente..."
    
    if [[ -f "scripts/validate-backup-environment.ts" ]]; then
        if command -v tsx >/dev/null 2>&1; then
            tsx scripts/validate-backup-environment.ts
        elif command -v npx >/dev/null 2>&1; then
            npx tsx scripts/validate-backup-environment.ts
        else
            warning "tsx não encontrado. Execute manualmente: npx tsx scripts/validate-backup-environment.ts"
        fi
    else
        warning "Script de validação não encontrado"
    fi
}

# Criar backup de teste
create_test_backup() {
    log "Criando backup de teste..."
    
    if [[ -n "$DATABASE_URL" ]]; then
        if npm run backup:create -- --verbose --name "test-deployment-$(date +%Y%m%d-%H%M%S)"; then
            success "Backup de teste criado com sucesso"
        else
            error "Falha ao criar backup de teste"
        fi
    else
        warning "DATABASE_URL não configurada. Pule o teste de backup por enquanto."
    fi
}

# Gerar relatório de deployment
generate_report() {
    log "Gerando relatório de deployment..."
    
    REPORT_FILE="${PROJECT_ROOT}/logs/deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    cat > "$REPORT_FILE" << EOF
# Relatório de Deployment - Sistema de Backup
Data: $(date)
Ambiente: $ENVIRONMENT
Projeto: $(basename "$PROJECT_ROOT")

## Configurações
- Diretório de backup: $BACKUP_DIR
- Node.js: $(node --version)
- npm: $(npm --version)
- PostgreSQL: $(psql --version | head -n1)

## Arquivos Criados
- Configuração: .env.backup.$ENVIRONMENT
- Registry: $BACKUP_DIR/registry.json
- Logs: ${PROJECT_ROOT}/logs/

## Próximos Passos
1. Copie as configurações de .env.backup.$ENVIRONMENT para seu .env principal
2. Configure DATABASE_URL se ainda não estiver configurada
3. Execute: npm run backup:create --verbose
4. Acesse /dashboard/backup para testar a interface web

## Automação (Produção)
Para ambiente de produção, configure os cron jobs:
- Backup diário: 0 2 * * * ${PROJECT_ROOT}/scripts/auto-backup.sh
- Limpeza semanal: 0 3 * * 0 ${PROJECT_ROOT}/scripts/auto-cleanup.sh

## Documentação
- Guia completo: docs/sistema-backup-completo.md
- Guia do usuário: docs/guia-usuario.md
- Guia CLI: docs/guia-cli.md
- Troubleshooting: docs/troubleshooting.md
EOF
    
    success "Relatório gerado: $REPORT_FILE"
}

# Função principal
main() {
    log "🚀 Iniciando deployment do sistema de backup..."
    log "Ambiente: $ENVIRONMENT"
    log "Diretório: $PROJECT_ROOT"
    
    # Criar diretório de logs se não existir
    mkdir -p "${PROJECT_ROOT}/logs"
    
    # Executar etapas do deployment
    check_project_root
    check_prerequisites
    setup_environment
    install_dependencies
    create_directories
    setup_security
    initialize_registry
    setup_cron_jobs
    run_validation
    
    # Teste opcional (apenas se DATABASE_URL estiver configurada)
    if [[ -n "$DATABASE_URL" ]]; then
        create_test_backup
    fi
    
    generate_report
    
    success "🎉 Deployment concluído com sucesso!"
    
    echo ""
    echo "📋 Próximos passos:"
    echo "1. Copie as configurações de .env.backup.$ENVIRONMENT para seu .env"
    echo "2. Configure DATABASE_URL se necessário"
    echo "3. Execute: npm run backup:create --verbose"
    echo "4. Acesse /dashboard/backup para testar"
    echo ""
    echo "📚 Documentação disponível em docs/"
    echo "📊 Relatório completo em: logs/"
}

# Verificar argumentos
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Uso: $0 [environment]"
    echo ""
    echo "Ambientes disponíveis:"
    echo "  development  - Configuração para desenvolvimento (padrão)"
    echo "  staging      - Configuração para staging"
    echo "  production   - Configuração para produção"
    echo ""
    echo "Exemplo:"
    echo "  $0 production"
    exit 0
fi

# Executar deployment
main