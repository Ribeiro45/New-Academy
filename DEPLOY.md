# Guia de Deploy - Academy Platform

## Estrutura do Projeto

```
├── server/                 # Backend Node.js/Express
│   ├── src/               # Código fonte
│   ├── prisma/            # Schema do banco de dados
│   ├── Dockerfile         # Container do backend
│   └── package.json
├── docker-compose.yml     # Orquestração dos containers
├── docker/
│   ├── nginx.conf         # Configuração do Nginx
│   └── init.sql           # Inicialização do PostgreSQL
└── src/                   # Frontend React (existente)
```

## Pré-requisitos

- Docker e Docker Compose instalados
- VPS com pelo menos 2GB RAM
- Domínio configurado (opcional)

## Deploy Passo a Passo

### 1. Clonar/Enviar o Projeto para a VPS

```bash
# Via Git
git clone <seu-repositorio> academy
cd academy

# Ou via SCP
scp -r ./academy user@sua-vps:/home/user/
```

### 2. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env na raiz
cat > .env << EOF
POSTGRES_USER=academy
POSTGRES_PASSWORD=sua_senha_segura_aqui
POSTGRES_DB=academy_db
JWT_SECRET=sua_chave_jwt_muito_segura_aqui
FRONTEND_URL=https://seu-dominio.com
EOF
```

### 3. Build do Frontend

```bash
# Instalar dependências e buildar
npm install
npm run build
```

### 4. Iniciar os Containers

```bash
# Subir todos os serviços
docker-compose up -d

# Verificar se está rodando
docker-compose ps

# Ver logs
docker-compose logs -f
```

### 5. Executar Migrações do Banco

```bash
# Entrar no container do backend
docker-compose exec backend sh

# Executar migrações do Prisma
npx prisma migrate deploy

# Sair do container
exit
```

### 6. Criar Primeiro Admin

```bash
# Conectar ao PostgreSQL
docker-compose exec postgres psql -U academy -d academy_db

# Inserir admin (após registrar usuário via interface)
INSERT INTO user_roles (user_id, role) 
VALUES ('UUID_DO_USUARIO', 'admin');
```

## Comandos Úteis

```bash
# Reiniciar serviços
docker-compose restart

# Parar tudo
docker-compose down

# Ver logs do backend
docker-compose logs -f backend

# Backup do banco
docker-compose exec postgres pg_dump -U academy academy_db > backup.sql

# Restaurar backup
cat backup.sql | docker-compose exec -T postgres psql -U academy academy_db
```

## Configurar SSL (HTTPS)

### Com Certbot

```bash
# Instalar Certbot
apt install certbot python3-certbot-nginx

# Gerar certificado
certbot --nginx -d seu-dominio.com
```

## Frontend - Alteração Necessária

Adicione no arquivo `.env` do frontend (antes do build):

```env
VITE_API_URL=https://seu-dominio.com/api
```

## Migrar Dados Existentes

Se você tem dados no Supabase, exporte-os:

```bash
# No Supabase, gere um dump SQL
pg_dump --data-only sua_conexao_supabase > data.sql

# Importe na nova instalação
cat data.sql | docker-compose exec -T postgres psql -U academy academy_db
```

## Estrutura das Portas

- **80/443**: Nginx (frontend + proxy)
- **3001**: Backend API (interno)
- **5432**: PostgreSQL (interno)

## Troubleshooting

### Container não inicia
```bash
docker-compose logs backend
```

### Erro de conexão com banco
```bash
docker-compose exec backend npx prisma db push
```

### Resetar tudo
```bash
docker-compose down -v
docker-compose up -d
```
