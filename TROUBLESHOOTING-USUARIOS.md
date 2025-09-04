# Guia de Solução de Problemas - Gerenciamento de Usuários

## 🚨 Problema: "Nenhum usuário encontrado" na página de usuários

### Possíveis Causas e Soluções

#### 1. **Usuário não está logado**
**Sintoma**: Página mostra "Faça login para visualizar os usuários"
**Solução**:
```bash
# 1. Acesse a página de login
http://localhost:3000/login

# 2. Use as credenciais padrão:
Email: superadmin@sistema.com
Senha: admin123
```

#### 2. **Usuário não tem permissão**
**Sintoma**: Usuário logado mas não vê usuários
**Causa**: Apenas ADMIN e SUPERADMIN podem ver a lista de usuários
**Solução**: Faça login com uma conta ADMIN ou SUPERADMIN

#### 3. **Problema de sessão NextAuth**
**Sintoma**: API retorna 401 mesmo logado
**Diagnóstico**:
```bash
node debug-nextauth-session.js
```
**Soluções**:
- Limpe cookies do navegador
- Faça logout e login novamente
- Reinicie o servidor (`npm run dev`)

#### 4. **Usuários não existem no banco**
**Diagnóstico**:
```bash
node verify-system-integrity.js
```
**Solução**:
```bash
node verify-user-integrity.js --create-test-user
```

#### 5. **Problema na API de usuários**
**Diagnóstico**:
```bash
node test-users-api.js
```
**Verificações**:
- Servidor está rodando na porta 3000
- Banco de dados está acessível
- Variáveis de ambiente configuradas

### 🔧 Comandos de Diagnóstico

```bash
# Verificação completa do sistema
node verify-system-integrity.js

# Verificação específica de usuários
node verify-user-integrity.js

# Teste das APIs
node test-users-api.js

# Debug de sessão NextAuth
node debug-nextauth-session.js

# Corrigir módulos dos usuários
node fix-user-modules.js
```

### 📋 Checklist de Verificação

- [ ] Servidor está rodando (`npm run dev`)
- [ ] Banco de dados está acessível
- [ ] Usuários existem no banco
- [ ] Usuário está logado
- [ ] Usuário tem permissão (ADMIN/SUPERADMIN)
- [ ] Sessão NextAuth está ativa
- [ ] API `/api/users` responde corretamente

### 🎯 Fluxo de Teste Completo

1. **Verificar sistema**:
   ```bash
   node verify-system-integrity.js
   ```

2. **Iniciar servidor**:
   ```bash
   npm run dev
   ```

3. **Fazer login**:
   - Acesse: http://localhost:3000/login
   - Email: superadmin@sistema.com
   - Senha: admin123

4. **Acessar página de usuários**:
   - URL: http://localhost:3000/dashboard/usuarios

5. **Verificar console do navegador** (F12):
   - Não deve haver erros de JavaScript
   - Verificar se há logs de erro da API

### 🆘 Se nada funcionar

1. **Reset completo**:
   ```bash
   # Parar servidor
   Ctrl+C
   
   # Limpar cache
   rm -rf .next
   npm run build
   
   # Reiniciar
   npm run dev
   ```

2. **Verificar logs do servidor**:
   - Procure por erros no terminal onde roda `npm run dev`
   - Verifique conexão com banco de dados

3. **Criar usuário manualmente**:
   ```bash
   node verify-user-integrity.js --create-test-user
   ```

### 📞 Informações para Suporte

Se o problema persistir, colete estas informações:

- Output de `node verify-system-integrity.js`
- Output de `node debug-nextauth-session.js`
- Logs do console do navegador (F12)
- Logs do servidor (terminal)
- Versão do Node.js (`node --version`)
- Sistema operacional

### 🔐 Credenciais Padrão

```
SUPERADMIN:
Email: superadmin@sistema.com
Senha: admin123

ADMIN:
Email: admin@sistema.com
Senha: admin123
```

### 🌐 URLs Importantes

- Login: http://localhost:3000/login
- Dashboard: http://localhost:3000/dashboard
- Usuários: http://localhost:3000/dashboard/usuarios
- API Usuários: http://localhost:3000/api/users (requer auth)