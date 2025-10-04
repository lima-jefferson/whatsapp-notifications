require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { createReadStream } = require('fs');
const readline = require('readline');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'whatsapp_notifications',
  user: process.env.DB_USER || 'lima_jefferson',
  password: process.env.DB_PASSWORD || '',
});

// WhatsApp API Config
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

app.use(cors());
app.use(express.json());

// Tratamento de erros globais
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
});

// Inicializar banco de dados
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS batches (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255),
        total_records INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        batch_id INTEGER REFERENCES batches(id),
        nome VARCHAR(255),
        telefone VARCHAR(20),
        tipo VARCHAR(50),
        data_agendamento DATE,
        hora_agendamento TIME,
        local VARCHAR(255),
        medico VARCHAR(255),
        observacao TEXT,
        status VARCHAR(50) DEFAULT 'PENDENTE',
        message_id VARCHAR(255),
        error_message TEXT,
        sent_at TIMESTAMP,
        status_confirmacao VARCHAR(50),
        data_confirmacao TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_batch_id ON messages(batch_id);
      CREATE INDEX IF NOT EXISTS idx_status ON messages(status);
    `);
    console.log('Banco de dados inicializado com sucesso');
  } catch (error) {
    console.error('Erro ao inicializar banco:', error);
  }
}

initDB().catch(err => console.error('Erro fatal:', err));

// Função para enviar mensagem via WhatsApp
async function sendWhatsAppMessage(to, templateName, components) {
  try {
    const response = await axios.post(
      WHATSAPP_API_URL,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'pt_BR'
          },
          components: components
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, messageId: response.data.messages[0].id };
  } catch (error) {
    console.log('Erro WhatsApp:', error.response?.data);
    return { 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    };
  }
}

// Formatar mensagem
function formatMessage(record) {
  const tipo = record.tipo.toUpperCase();
  const data = new Date(record.data_agendamento).toLocaleDateString('pt-BR');
  
  const templateName = tipo === 'CONSULTA' 
    ? process.env.TEMPLATE_CONSULTA 
    : process.env.TEMPLATE_EXAME;
  
  const components = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: record.nome },
        { type: 'text', text: data },
        { type: 'text', text: record.hora_agendamento },
        { type: 'text', text: record.local },
        { type: 'text', text: record.medico },
        { type: 'text', text: record.observacao || 'Nenhuma observação adicional' }
      ]
    }
  ];
  
  return { templateName, components };
}

// Upload e processar arquivo
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const records = [];
    
    const fileStream = createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let isFirstLine = true;
    
    for await (const line of rl) {
      if (isFirstLine) {
        isFirstLine = false;
        continue;
      }
      
      const [nome, telefone, tipo, data, hora, local, medico, observacao] = line.split('|');
      
      if (nome && telefone) {
        records.push({
          nome: nome.trim(),
          telefone: telefone.trim(),
          tipo: tipo.trim(),
          data_agendamento: data.trim(),
          hora_agendamento: hora.trim(),
          local: local.trim(),
          medico: medico.trim(),
          observacao: observacao?.trim() || ''
        });
      }
    }

    const batchResult = await pool.query(
      'INSERT INTO batches (filename, total_records) VALUES ($1, $2) RETURNING id',
      [req.file.originalname, records.length]
    );
    
    const batchId = batchResult.rows[0].id;

    for (const record of records) {
      await pool.query(
        `INSERT INTO messages (batch_id, nome, telefone, tipo, data_agendamento, 
         hora_agendamento, local, medico, observacao) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [batchId, record.nome, record.telefone, record.tipo, record.data_agendamento,
         record.hora_agendamento, record.local, record.medico, record.observacao]
      );
    }

    res.json({ 
      success: true, 
      batchId, 
      totalRecords: records.length 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Processar envio de lote
app.post('/batch/:batchId/send', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM messages WHERE batch_id = $1 AND status = $2',
      [batchId, 'PENDENTE']
    );

    processMessages(result.rows);
    
    res.json({ success: true, message: 'Processamento iniciado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Processar mensagens (assíncrono)
async function processMessages(messages) {
  for (const msg of messages) {
    const { templateName, components } = formatMessage(msg);
    const result = await sendWhatsAppMessage(msg.telefone, templateName, components);
    
    if (result.success) {
      await pool.query(
        'UPDATE messages SET status = $1, message_id = $2, sent_at = NOW() WHERE id = $3',
        ['ENVIADO', result.messageId, msg.id]
      );
    } else {
      await pool.query(
        'UPDATE messages SET status = $1, error_message = $2 WHERE id = $3',
        ['FALHA', result.error, msg.id]
      );
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// WEBHOOK - Verificação (Meta chama uma vez para validar)
app.get('/webhook', (req, res) => {
  try {
    console.log('=== WEBHOOK GET RECEBIDO ===');
    console.log('Query params:', req.query);
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'token';
    
    console.log('Mode:', mode);
    console.log('Token recebido:', token);
    console.log('Token esperado:', VERIFY_TOKEN);
    console.log('Challenge:', challenge);
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verificado com sucesso!');
      return res.status(200).send(challenge);
    } else {
      console.log('❌ Falha na verificação do webhook');
      return res.sendStatus(403);
    }
  } catch (error) {
    console.error('❌ ERRO NO WEBHOOK GET:', error);
    return res.status(500).json({ error: error.message });
  }
});

// WEBHOOK - Receber eventos (respostas de botões, status, etc)
app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook recebido:', JSON.stringify(req.body, null, 2));
    
    const data = req.body;
    
    // Processar respostas de botões
    if (data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const message = data.entry[0].changes[0].value.messages[0];
      
      if (message.type === 'button' && message.button) {
        const buttonPayload = message.button.payload;
        const phoneNumber = message.from;
        const contextMessageId = message.context?.id;
        
        console.log(`Botão clicado: ${buttonPayload} por ${phoneNumber}`);
        
        // Padronizar o payload antes de salvar
        let payloadPadronizado = buttonPayload.toUpperCase();
        if (payloadPadronizado.includes('CONFIRMAR')) {
          payloadPadronizado = 'CONFIRMAR';
        } else if (payloadPadronizado.includes('CANCELAR') || payloadPadronizado.includes('NÃO')) {
          payloadPadronizado = 'CANCELAR';
        } else if (payloadPadronizado.includes('REAGENDAR')) {
          payloadPadronizado = 'REAGENDAR';
        }
        
        if (contextMessageId) {
          await pool.query(
            `UPDATE messages 
             SET status_confirmacao = $1, 
                 data_confirmacao = NOW() 
             WHERE message_id = $2`,
            [payloadPadronizado, contextMessageId]
          );
          
          console.log(`Status de confirmação atualizado: ${payloadPadronizado}`);
        }
        
        let respostaTexto = '';
        
        switch(payloadPadronizado) {
          case 'CONFIRMAR':
            respostaTexto = '✅ Agendamento confirmado!\n\nObrigado pela confirmação. Sua presença está confirmada para o dia e horário agendados.\n\nTe esperamos! 😊';
            break;
          case 'CANCELAR':
            respostaTexto = '❌ Agendamento cancelado.\n\nSeu agendamento foi cancelado conforme solicitado.\n\nPara reagendar, entre em contato conosco pelos nossos canais de atendimento.\n\nEstamos à disposição!';
            break;
          case 'REAGENDAR':
            respostaTexto = '📅 Solicitação de reagendamento recebida!\n\nNossa equipe entrará em contato com você em breve para verificar a melhor data e horário disponíveis.\n\nAguarde nosso retorno. Obrigado!';
            break;
        }
        
        if (respostaTexto) {
          await axios.post(
            WHATSAPP_API_URL,
            {
              messaging_product: 'whatsapp',
              to: phoneNumber,
              type: 'text',
              text: { body: respostaTexto }
            },
            {
              headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log('Resposta automática enviada');
        }
      }
    }
    
    // Processar status de entrega
    if (data.entry?.[0]?.changes?.[0]?.value?.statuses) {
      const status = data.entry[0].changes[0].value.statuses[0];
      console.log(`Status de entrega: ${status.status} para mensagem ${status.id}`);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.sendStatus(500);
  }
});

// Dashboard - Estatísticas
app.get('/dashboard/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const stats = await pool.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM messages
      WHERE batch_id = $1
      GROUP BY status
    `, [batchId]);
    
    const messages = await pool.query(
      'SELECT * FROM messages WHERE batch_id = $1 ORDER BY created_at DESC',
      [batchId]
    );
    
    res.json({
      statistics: stats.rows,
      messages: messages.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Gerar arquivo de retorno
app.get('/batch/:batchId/export', async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const result = await pool.query(
      'SELECT telefone, status, sent_at, message_id, error_message, status_confirmacao, data_confirmacao FROM messages WHERE batch_id = $1',
      [batchId]
    );
    
    let txtContent = 'TELEFONE|STATUS|DATA_ENVIO|ID_MENSAGEM|ERRO|CONFIRMACAO|DATA_CONFIRMACAO\n';
    
    for (const row of result.rows) {
      const sentAt = row.sent_at ? new Date(row.sent_at).toLocaleString('pt-BR') : '';
      const confirmedAt = row.data_confirmacao ? new Date(row.data_confirmacao).toLocaleString('pt-BR') : '';
      txtContent += `${row.telefone}|${row.status}|${sentAt}|${row.message_id || ''}|${row.error_message || ''}|${row.status_confirmacao || ''}|${confirmedAt}\n`;
    }
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=retorno_lote_${batchId}.txt`);
    res.send(txtContent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Listar lotes
app.get('/batches', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*,
        COUNT(m.id) as total_messages,
        SUM(CASE WHEN m.status = 'ENVIADO' THEN 1 ELSE 0 END) as sent,
        SUM(CASE WHEN m.status = 'FALHA' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN m.status = 'PENDENTE' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN m.status_confirmacao IS NOT NULL THEN 1 ELSE 0 END) as respostas_recebidas,
        SUM(CASE WHEN m.status = 'ENVIADO' AND m.status_confirmacao IS NULL THEN 1 ELSE 0 END) as respostas_pendentes
      FROM batches b
      LEFT JOIN messages m ON b.id = m.batch_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`WHATSAPP_TOKEN definido: ${!!WHATSAPP_TOKEN}`);
  console.log(`PHONE_NUMBER_ID: ${process.env.PHONE_NUMBER_ID}`);
  console.log(`Aguardando requisições...`);
});

server.on('error', (error) => {
  console.error('Erro no servidor:', error);
});