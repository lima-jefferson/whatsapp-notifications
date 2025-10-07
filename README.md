# Sistema de Notificações WhatsApp

Sistema completo para envio automático de notificações de consultas e exames médicos via WhatsApp Business API, com dashboard de gerenciamento e acompanhamento em tempo real.

## Funcionalidades

### Backend
- Autenticação JWT com tokens de 8 horas de validade
- Upload e processamento de arquivos em lote (formato TXT/CSV)
- Envio automático de mensagens via WhatsApp Business API
- Webhook para receber confirmações e respostas dos pacientes
- Sistema de templates para consultas e exames
- Dashboard com estatísticas em tempo real
- Exportação de relatórios com status de envio e confirmações
- Gerenciamento de múltiplos lotes de envio

### Frontend
- Interface moderna em Angular 20
- Sistema de login com autenticação JWT
- Upload de arquivos com validação
- Listagem de lotes com estatísticas
- Dashboard detalhado por lote
- Atualização automática a cada 5 segundos
- Exportação de relatórios
- Design responsivo com Tailwind CSS

## Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados relacional
- **JWT** - Autenticação e autorização
- **bcryptjs** - Hash de senhas
- **Multer** - Upload de arquivos
- **Axios** - Cliente HTTP para WhatsApp API
- **dotenv** - Gerenciamento de variáveis de ambiente

### Frontend
- **Angular 20** - Framework frontend
- **TypeScript** - Linguagem tipada
- **Tailwind CSS** - Framework CSS
- **RxJS** - Programação reativa
- **HTTP Client** - Comunicação com API

## Arquitetura

### Backend (Node.js + Express)

O backend é uma API RESTful que gerencia:

1. **Autenticação**: Sistema JWT com middleware de proteção de rotas
2. **Processamento de Lotes**:
   - Leitura de arquivos com dados de agendamentos
   - Armazenamento em PostgreSQL
   - Processamento assíncrono de envios
3. **Integração WhatsApp**:
   - Envio de mensagens usando templates aprovados
   - Webhook para receber status e respostas
   - Resposta automática às interações dos usuários
4. **Dashboard**: Estatísticas em tempo real e exportação de dados

### Frontend (Angular)

O frontend é uma SPA (Single Page Application) que oferece:

1. **Login**: Autenticação com armazenamento de token
2. **Gestão de Lotes**: Upload e listagem de lotes de envio
3. **Dashboard**: Visualização detalhada com atualização automática
4. **Exportação**: Download de relatórios em formato TXT

### Fluxo de Dados

```
[Upload Arquivo] → [Backend: Processa e Armazena] → [BD PostgreSQL]
                                ↓
                    [Envia para WhatsApp API]
                                ↓
                    [WhatsApp → Paciente]
                                ↓
                    [Paciente Responde]
                                ↓
                    [Webhook Recebe] → [Atualiza BD]
                                ↓
                    [Frontend: Dashboard Atualiza]
```

## Requisitos

- **Node.js** 18 ou superior
- **PostgreSQL** 12 ou superior
- **npm** ou **yarn**
- **Conta WhatsApp Business API** (Meta)
- **Angular CLI** (para desenvolvimento frontend)

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/whatsapp-notifications.git
cd whatsapp-notifications
```

### 2. Configure o Backend

```bash
cd backend
npm install
```

Crie um arquivo `.env` na pasta `backend`:

```env
# Servidor
PORT=3000

# Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_notifications
DB_USER=seu_usuario
DB_PASSWORD=sua_senha

# JWT
JWT_SECRET=seu_secret_super_seguro_aqui

# WhatsApp Business API
WHATSAPP_TOKEN=seu_token_whatsapp
PHONE_NUMBER_ID=seu_phone_number_id
TEMPLATE_CONSULTA=nome_template_consulta
TEMPLATE_EXAME=nome_template_exame

# Webhook
WEBHOOK_VERIFY_TOKEN=seu_token_verificacao
```

### 3. Configure o Frontend

```bash
cd frontend
npm install
```

Edite o arquivo `frontend/src/app/config.ts`:

```typescript
export const CONFIG = {
  apiUrl: 'http://localhost:3000' // URL do backend
};
```

### 4. Configure o Banco de Dados

Crie o banco de dados PostgreSQL:

```bash
createdb whatsapp_notifications
```

As tabelas serão criadas automaticamente na primeira execução do backend.

## Como Usar

### 1. Iniciar o Backend

```bash
cd backend
npm start
# ou para desenvolvimento com hot reload
npm run dev
```

O servidor estará disponível em `http://localhost:3000`

### 2. Iniciar o Frontend

```bash
cd frontend
npm start
```

A aplicação estará disponível em `http://localhost:4200`

### 3. Fazer Login

Usuário padrão:
- **Usuário**: admin
- **Senha**: admin123

### 4. Upload de Arquivo

Prepare um arquivo TXT com o seguinte formato (separado por `|`):

```
NOME|TELEFONE|TIPO|DATA|HORA|LOCAL|MEDICO|OBSERVACAO
João Silva|5511999999999|CONSULTA|2024-01-15|14:30|Clínica Central|Dr. Pedro|Trazer exames anteriores
Maria Santos|5511888888888|EXAME|2024-01-16|09:00|Lab Saúde|Dra. Ana|Jejum de 12 horas
```

**Campos:**
- **NOME**: Nome completo do paciente
- **TELEFONE**: Número com código do país (ex: 5511999999999)
- **TIPO**: CONSULTA ou EXAME
- **DATA**: Data no formato YYYY-MM-DD
- **HORA**: Hora no formato HH:MM
- **LOCAL**: Nome da clínica/laboratório
- **MEDICO**: Nome do médico/responsável
- **OBSERVACAO**: Observações adicionais (opcional)

### 5. Enviar Lote

1. Faça upload do arquivo
2. Na lista de lotes, clique em "Enviar"
3. Acompanhe o progresso no dashboard

### 6. Acompanhar Resultados

O dashboard mostra:
- Total de mensagens
- Mensagens enviadas
- Mensagens com falha
- Mensagens pendentes
- Respostas recebidas
- Detalhes de cada envio

## Estrutura do Projeto

```
whatsapp-notifications/
├── backend/
│   ├── server.js           # Servidor principal
│   ├── package.json        # Dependências backend
│   ├── .env               # Variáveis de ambiente (não versionado)
│   └── uploads/           # Diretório de uploads (criado automaticamente)
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   │   └── dashboard/    # Componente do dashboard
│   │   │   ├── login/            # Componente de login
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts      # Serviço de autenticação
│   │   │   │   └── whatsapp.ts          # Serviço da API WhatsApp
│   │   │   ├── config.ts                # Configurações
│   │   │   └── app.routes.ts            # Rotas
│   │   └── main.ts
│   ├── package.json        # Dependências frontend
│   └── angular.json        # Configurações Angular
│
└── README.md              # Este arquivo
```

## API Endpoints

### Públicos (sem autenticação)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/login` | Autenticação de usuário |
| GET | `/` | Health check |
| GET | `/webhook` | Verificação do webhook (Meta) |
| POST | `/webhook` | Recebimento de eventos WhatsApp |

### Protegidos (requerem token JWT)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/upload` | Upload de arquivo com lote |
| POST | `/batch/:batchId/send` | Iniciar envio de lote |
| GET | `/batches` | Listar todos os lotes |
| GET | `/dashboard/:batchId` | Estatísticas de um lote |
| GET | `/batch/:batchId/export` | Exportar relatório do lote |

### Exemplo de Requisição Autenticada

```bash
curl -X GET http://localhost:3000/batches \
  -H "Authorization: Bearer seu_token_jwt_aqui"
```

## Webhook do WhatsApp

O webhook está configurado para:

1. **Verificação** (GET `/webhook`):
   - Valida o token com a Meta
   - Necessário para ativar o webhook no dashboard da Meta

2. **Recebimento de Eventos** (POST `/webhook`):
   - Recebe respostas de botões (Confirmar/Cancelar/Reagendar)
   - Atualiza status no banco de dados
   - Envia respostas automáticas aos pacientes

### Configurar Webhook na Meta

1. Acesse o [Facebook Developers](https://developers.facebook.com/)
2. Vá em seu app → WhatsApp → Configuration
3. Configure o webhook:
   - **URL**: `https://seu-dominio.com/webhook`
   - **Token de Verificação**: valor do `WEBHOOK_VERIFY_TOKEN`
4. Inscreva-se nos eventos: `messages`

## Desenvolvimento

### Backend

```bash
cd backend
npm run dev  # Inicia com nodemon (hot reload)
```

### Frontend

```bash
cd frontend
npm start    # Inicia servidor de desenvolvimento
```

O frontend atualiza automaticamente ao modificar arquivos.

### Criar Novo Usuário

Para criar um novo usuário, gere o hash da senha:

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('sua_senha', 10);
console.log(hash);
```

Adicione ao array `users` em `server.js`:

```javascript
const users = [
  {
    id: 1,
    username: 'admin',
    password: '$2b$10$RgxB9nd4AlaMDEgqwPnrhuTQd34jhYDlKISXXfVVtUKBdBiRYiDgK'
  },
  {
    id: 2,
    username: 'novo_usuario',
    password: 'hash_gerado_aqui'
  }
];
```

## Build para Produção

### Backend

O backend roda diretamente com Node.js:

```bash
cd backend
npm start
```

### Frontend

```bash
cd frontend
npm run build
```

Os arquivos otimizados estarão em `frontend/dist/`

O build já substitui automaticamente a URL da API para produção:
```
http://localhost:3000/api → https://notifica-backend.negocios-digitais-br.online
```

## Deploy

### Backend

Recomendações:
- Use PM2 para gerenciar o processo
- Configure reverse proxy com Nginx
- Use HTTPS (Let's Encrypt)
- Configure variáveis de ambiente no servidor

```bash
npm install -g pm2
pm2 start server.js --name whatsapp-backend
pm2 save
pm2 startup
```

### Frontend

Sirva os arquivos estáticos do `dist/`:
- Nginx
- Apache
- Serviços como Vercel, Netlify

### Banco de Dados

Use PostgreSQL gerenciado:
- AWS RDS
- Google Cloud SQL
- DigitalOcean Managed Databases

## Segurança

- ✅ Autenticação JWT com expiração
- ✅ Hash de senhas com bcrypt
- ✅ Validação de tokens
- ✅ CORS configurado
- ✅ Rotas protegidas com middleware
- ✅ Variáveis de ambiente para secrets

**Importante**:
- Nunca commite o arquivo `.env`
- Use secrets fortes em produção
- Mantenha as dependências atualizadas

## Troubleshooting

### Erro de conexão com PostgreSQL

Verifique:
- PostgreSQL está rodando: `sudo service postgresql status`
- Credenciais corretas no `.env`
- Banco de dados existe: `psql -l`

### Mensagens não estão sendo enviadas

Verifique:
- Token do WhatsApp é válido
- Templates estão aprovados no Meta Business
- Phone Number ID está correto
- Números têm código do país

### Frontend não conecta no backend

Verifique:
- Backend está rodando
- URL em `config.ts` está correta
- CORS configurado corretamente

## Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## Licença

ISC

## Suporte

Para questões e suporte, abra uma issue no repositório.

---

Desenvolvido com Node.js, Angular e WhatsApp Business API
