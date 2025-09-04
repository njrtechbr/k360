# Variáveis de Ambiente

## Chaves de API
GEMINI_API_KEY=AIzaSyDXgVNbNLpLqRnZH3WCnI8nc-uu1DA9gXY

## Configuração do Banco de Dados
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/k360db?schema=public

# Notas de Segurança
- Nunca fazer commit de chaves de API reais para o controle de versão
- Usar variáveis de ambiente ou arquivos .env para dados sensíveis
- Manter as credenciais do banco de dados seguras
- Considerar o uso de pool de conexões para conexões com o banco de dados

# Configuração do Ambiente Local
1. Copie este template para `.env`
2. Substitua os valores de exemplo por credenciais reais
3. Adicione `.env` ao `.gitignore`


# Sistema Operacional e Ambiente de Desenvolvimento

## Windows 11
- Todos os comandos devem ser compatíveis com PowerShell
- Use `Set-ExecutionPolicy RemoteSigned` para permitir execução de scripts
- Para comandos bash, utilize Git Bash
- Recomendado usar Terminal Windows com PowerShell 7+

## Notas Importantes
- Evite comandos específicos do CMD
- Mantenha scripts com extensão .ps1 para PowerShell
- Use caminhos com barras invertidas (\) ou caminhos universais (/)
- Configure aliases no perfil do PowerShell para comandos frequentes


Prefira usar o comando `dir` para listar arquivos e diretórios no PowerShell. Este é um comando nativo do Windows que oferece uma sintaxe simples e familiar, sendo também um alias built-in do PowerShell que mantém a compatibilidade com scripts legados.

Para desenvolvimento local:
- Sempre utilize a porta 3000 para executar a aplicação
- Se a porta 3000 já estiver em uso:
  1. Identifique o processo usando: `netstat -ano | findstr :3000`
  2. Encerre o processo: `taskkill /PID <número_do_processo> /F`
  3. Inicie sua aplicação na porta 3000
- Utilize `npm run dev` para iniciar o servidor de desenvolvimento
- Acesse a aplicação em `http://localhost:3000`



# Registro de Erros de Autenticação
Ignorar erros abaixo e registrar em um arquivo .md
## Erro de Sessão Next-Auth
Quando ocorrer o erro:
net::ERR_ABORTED http://localhost:3000/api/auth/session

[next-auth][error][CLIENT_FETCH_ERROR]


Antes de fazer qualquer alteração:
1. Primeiro consulte o MCP Context7 (Modelo de Contextualização de Projeto em 7 Dimensões) para entendimento contextual
2. Em seguida aplique as MCP-Sequential Thinking Tools (Ferramentas de Pensamento Sequencial do Modelo de Contextualização de Projeto) para:
   - Decompor o problema sistematicamente 
   - Analisar impactos potenciais
   - Planejar etapas de implementação
   - Validar mudanças propostas
