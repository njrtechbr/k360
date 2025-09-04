---
inclusion: always
---

# Diretrizes para Windows 11 + PowerShell + WSL 2 Ubuntu

## Ambiente de Desenvolvimento

### Sistema Híbrido
- **Windows 11** como sistema host
- **PowerShell** como shell principal para comandos Windows
- **WSL 2 Ubuntu** para ferramentas de desenvolvimento Linux
- **Integração** entre ambos os ambientes

## Comandos por Ambiente

### PowerShell (Windows)
```powershell
# Navegação e arquivos
Get-ChildItem                    # Listar arquivos (equivale a ls)
Set-Location path               # Navegar diretórios (equivale a cd)
New-Item -ItemType Directory    # Criar diretório
Remove-Item -Recurse -Force     # Remover diretório recursivamente

# Gerenciamento de processos
Get-Process                     # Listar processos
Stop-Process -Name "processo"   # Parar processo
```

### WSL 2 Ubuntu
```bash
# Ferramentas de desenvolvimento
npm run dev                     # Executar em ambiente Linux
docker compose up              # Containers Docker
git status                     # Controle de versão
```

## Integração de Ambientes

### Acesso a Arquivos
- **Windows → WSL**: `/mnt/c/Users/usuario/projeto`
- **WSL → Windows**: `\\wsl$\Ubuntu\home\usuario`
- **Recomendação**: Manter projetos Node.js no sistema de arquivos WSL para melhor performance

### Variáveis de Ambiente
- Configure `DATABASE_URL` e outras variáveis em ambos os ambientes
- Use `.env` local para desenvolvimento
- WSL herda algumas variáveis do Windows automaticamente

## Boas Práticas

### Desenvolvimento Node.js
1. **Execute npm/node dentro do WSL** para melhor compatibilidade
2. **Use PowerShell para** operações de sistema Windows
3. **Configure VS Code** para trabalhar com WSL Remote
4. **Instale dependências** no ambiente WSL, não no Windows

### Comandos Recomendados
```bash
# Iniciar projeto (dentro do WSL)
wsl
cd /mnt/c/caminho/do/projeto
npm run dev

# Operações de banco (WSL)
npm run db:seed
npx prisma studio

# Comandos de sistema (PowerShell)
Get-Process node
netstat -an | findstr :3000
```

### Troubleshooting Comum
- **Porta ocupada**: Use `netstat` no PowerShell para identificar processos
- **Permissões**: Execute WSL como administrador se necessário  
- **Performance**: Evite executar Node.js diretamente no Windows
- **Hot reload**: Configure corretamente o watching de arquivos entre sistemas

## Integração com Ferramentas

### Git
- Configure credenciais uma vez, funciona em ambos ambientes
- Use WSL para operações Git em projetos de desenvolvimento

### Docker
- Docker Desktop integra automaticamente com WSL 2
- Execute containers preferencialmente via WSL

### Banco de Dados
- PostgreSQL pode rodar no Windows ou WSL
- Configure `DATABASE_URL` apontando para o ambiente correto