import { query, getDbStatus } from '../db';
import fs from 'fs';
import path from 'path';

const LOCAL_CONVERSATIONS_FILE = path.join(process.cwd(), 'support_conversations.json');

// Helper to load fallback local conversations
function loadLocalConversations() {
  if (fs.existsSync(LOCAL_CONVERSATIONS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_CONVERSATIONS_FILE, 'utf8'));
    } catch (e) {
      console.error("Error reading local support conversations:", e);
    }
  }
  return {};
}

// Helper to save fallback local conversation
function saveLocalConversation(sessionId: string, conversation: any) {
  try {
    const data = loadLocalConversations();
    data[sessionId.toLowerCase().trim()] = conversation;
    fs.writeFileSync(LOCAL_CONVERSATIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error("Error saving local support conversation:", e);
  }
}

// Map PostgreSQL message to frontend compatible message
function mapMessage(msg: any) {
  return {
    id: msg.id,
    sender: msg.sender_type === 'customer' ? 'user' : 'support',
    sender_type: msg.sender_type,
    text: msg.content,
    time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: new Date(msg.created_at).getTime(),
    isInternal: msg.is_internal,
    attachment: msg.message_type !== 'text' ? {
      name: msg.content.split('/').pop() || 'file',
      url: msg.content,
      type: msg.message_type
    } : undefined
  };
}

// Get active conversation for a user session
export async function getOrCreateConversation(sessionId: string, clientMetadata: any = {}) {
  const sessionKey = sessionId.toLowerCase().trim();
  const dbStatus = getDbStatus();

  if (!dbStatus.connected) {
    // Fallback mode
    const localData = loadLocalConversations();
    if (localData[sessionKey]) {
      return localData[sessionKey];
    }
    // Create new local conversation
    const newConv = {
      id: sessionKey,
      clientEmail: sessionKey.includes('@') ? sessionKey : 'guest@ryvo.co',
      clientName: sessionKey.split('@')[0] || 'زائر',
      clientPhone: clientMetadata.phone || '',
      country: clientMetadata.country || 'SA',
      language: clientMetadata.language || 'ar',
      device: clientMetadata.device || 'Desktop',
      os: clientMetadata.os || 'Windows',
      browser: clientMetadata.browser || 'Chrome',
      ip: clientMetadata.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
      lastActive: Date.now(),
      status: 'AI_HANDLING',
      messages: []
    };
    saveLocalConversation(sessionKey, newConv);
    return newConv;
  }

  try {
    // Find active (non-closed) conversation for this user session
    const selectRes = await query(
      `SELECT * FROM conversations WHERE user_id = $1 AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 1`,
      [sessionKey]
    );

    let dbConv;
    if (selectRes.rows.length > 0) {
      dbConv = selectRes.rows[0];
    } else {
      // Create new conversation
      const insertRes = await query(
        `INSERT INTO conversations (user_id, status, metadata) VALUES ($1, 'AI_HANDLING', $2) RETURNING *`,
        [sessionKey, JSON.stringify(clientMetadata)]
      );
      dbConv = insertRes.rows[0];
    }

    // Fetch messages for this conversation
    const msgRes = await query(
      `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [dbConv.id]
    );

    const messages = msgRes.rows.map(mapMessage);

    // Map to frontend expected object format
    return {
      id: dbConv.id, // UUID
      sessionId: sessionKey, // email/guest ID
      clientEmail: sessionKey.includes('@') ? sessionKey : 'guest@ryvo.co',
      clientName: sessionKey.split('@')[0] || 'زائر',
      clientPhone: clientMetadata.phone || '',
      country: dbConv.metadata.country || 'SA',
      language: dbConv.metadata.language || 'ar',
      device: dbConv.metadata.device || 'Desktop',
      os: dbConv.metadata.os || 'Windows',
      browser: dbConv.metadata.browser || 'Chrome',
      ip: dbConv.metadata.ip || '127.0.0.1',
      createdAt: dbConv.created_at,
      lastActive: new Date(dbConv.updated_at).getTime(),
      status: dbConv.status,
      ai_summary: dbConv.ai_summary,
      messages: messages
    };
  } catch (err: any) {
    console.error("Error in getOrCreateConversation:", err.message);
    // Fall back to local file if SQL errors out
    const localData = loadLocalConversations();
    return localData[sessionKey] || null;
  }
}

// Get a single conversation by UUID or local session ID
export async function getConversationById(id: string) {
  const dbStatus = getDbStatus();
  if (!dbStatus.connected) {
    const localData = loadLocalConversations();
    return localData[id.toLowerCase().trim()] || null;
  }

  try {
    const selectRes = await query(`SELECT * FROM conversations WHERE id = $1`, [id]);
    if (selectRes.rows.length === 0) {
      // Check if it's user_id instead of UUID
      const selectUserRes = await query(
        `SELECT * FROM conversations WHERE user_id = $1 AND status != 'CLOSED' ORDER BY created_at DESC LIMIT 1`,
        [id.toLowerCase().trim()]
      );
      if (selectUserRes.rows.length === 0) return null;
      id = selectUserRes.rows[0].id;
    }

    const dbConv = selectRes.rows[0] || (await query(`SELECT * FROM conversations WHERE id = $1`, [id])).rows[0];
    const msgRes = await query(`SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`, [dbConv.id]);
    const messages = msgRes.rows.map(mapMessage);

    return {
      id: dbConv.id,
      sessionId: dbConv.user_id,
      clientEmail: dbConv.user_id.includes('@') ? dbConv.user_id : 'guest@ryvo.co',
      clientName: dbConv.user_id.split('@')[0] || 'زائر',
      country: dbConv.metadata.country || 'SA',
      language: dbConv.metadata.language || 'ar',
      device: dbConv.metadata.device || 'Desktop',
      os: dbConv.metadata.os || 'Windows',
      browser: dbConv.metadata.browser || 'Chrome',
      ip: dbConv.metadata.ip || '127.0.0.1',
      createdAt: dbConv.created_at,
      lastActive: new Date(dbConv.updated_at).getTime(),
      status: dbConv.status,
      ai_summary: dbConv.ai_summary,
      messages: messages
    };
  } catch (err: any) {
    console.error("Error in getConversationById:", err.message);
    const localData = loadLocalConversations();
    return localData[id.toLowerCase().trim()] || null;
  }
}

// Fetch only conversations that are QUEUED_FOR_HUMAN or HUMAN_HANDLING for the Agent Panel
export async function getConversationsForAgent() {
  const dbStatus = getDbStatus();
  if (!dbStatus.connected) {
    // Fallback: filter local conversations by status
    const localData = loadLocalConversations();
    return Object.values(localData).filter((conv: any) => 
      conv.status === 'QUEUED_FOR_HUMAN' || conv.status === 'HUMAN_HANDLING'
    );
  }

  try {
    const res = await query(
      `SELECT * FROM conversations WHERE status IN ('QUEUED_FOR_HUMAN', 'HUMAN_HANDLING') ORDER BY updated_at DESC`
    );

    const conversations = [];
    for (const row of res.rows) {
      const msgRes = await query(
        `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
        [row.id]
      );
      const messages = msgRes.rows.map(mapMessage);
      
      conversations.push({
        id: row.id,
        sessionId: row.user_id,
        clientEmail: row.user_id.includes('@') ? row.user_id : 'guest@ryvo.co',
        clientName: row.user_id.split('@')[0] || 'زائر',
        country: row.metadata.country || 'SA',
        language: row.metadata.language || 'ar',
        device: row.metadata.device || 'Desktop',
        os: row.metadata.os || 'Windows',
        browser: row.metadata.browser || 'Chrome',
        ip: row.metadata.ip || '127.0.0.1',
        createdAt: row.created_at,
        lastActive: new Date(row.updated_at).getTime(),
        status: row.status,
        ai_summary: row.ai_summary,
        messages: messages
      });
    }
    return conversations;
  } catch (err: any) {
    console.error("Error in getConversationsForAgent:", err.message);
    const localData = loadLocalConversations();
    return Object.values(localData).filter((conv: any) => 
      conv.status === 'QUEUED_FOR_HUMAN' || conv.status === 'HUMAN_HANDLING'
    );
  }
}

// Update conversation status
export async function updateConversationStatus(id: string, status: string) {
  const dbStatus = getDbStatus();
  if (!dbStatus.connected) {
    const localData = loadLocalConversations();
    const sessionKey = id.toLowerCase().trim();
    if (localData[sessionKey]) {
      localData[sessionKey].status = status;
      localData[sessionKey].lastActive = Date.now();
      saveLocalConversation(sessionKey, localData[sessionKey]);
      return localData[sessionKey];
    }
    return null;
  }

  try {
    const res = await query(
      `UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (res.rows.length === 0) {
      // Check if ID is user_id session key
      const resUser = await query(
        `UPDATE conversations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND status != 'CLOSED' RETURNING *`,
        [status, id.toLowerCase().trim()]
      );
      return resUser.rows[0] || null;
    }
    return res.rows[0];
  } catch (err: any) {
    console.error("Error in updateConversationStatus:", err.message);
    return null;
  }
}

// Update conversation AI summary
export async function updateConversationSummary(id: string, summary: string) {
  const dbStatus = getDbStatus();
  if (!dbStatus.connected) {
    const localData = loadLocalConversations();
    const sessionKey = id.toLowerCase().trim();
    if (localData[sessionKey]) {
      localData[sessionKey].ai_summary = summary;
      localData[sessionKey].lastActive = Date.now();
      saveLocalConversation(sessionKey, localData[sessionKey]);
      return localData[sessionKey];
    }
    return null;
  }

  try {
    const res = await query(
      `UPDATE conversations SET ai_summary = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [summary, id]
    );
    if (res.rows.length === 0) {
      const resUser = await query(
        `UPDATE conversations SET ai_summary = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2 AND status != 'CLOSED' RETURNING *`,
        [summary, id.toLowerCase().trim()]
      );
      return resUser.rows[0] || null;
    }
    return res.rows[0];
  } catch (err: any) {
    console.error("Error in updateConversationSummary:", err.message);
    return null;
  }
}

// Add a new message to a conversation
export async function addMessage(
  conversationId: string,
  senderType: 'customer' | 'ai' | 'agent' | 'system',
  messageType: 'text' | 'image' | 'audio' | 'file',
  content: string,
  isInternal: boolean = false
) {
  const dbStatus = getDbStatus();

  if (!dbStatus.connected) {
    const localData = loadLocalConversations();
    const sessionKey = conversationId.toLowerCase().trim();
    const conversation = localData[sessionKey];
    if (conversation) {
      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        sender: senderType === 'customer' ? 'user' : 'support',
        sender_type: senderType,
        text: content,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        isInternal: isInternal,
        attachment: messageType !== 'text' ? {
          name: content.split('/').pop() || 'file',
          url: content,
          type: messageType
        } : undefined
      };
      conversation.messages.push(newMsg);
      conversation.lastActive = Date.now();
      saveLocalConversation(sessionKey, conversation);
      return newMsg;
    }
    return null;
  }

  try {
    // Resolve conversation ID if it's user_id session key
    let actualConvId = conversationId;
    if (!conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      const convRes = await query(
        `SELECT id FROM conversations WHERE user_id = $1 AND status != 'CLOSED' LIMIT 1`,
        [conversationId.toLowerCase().trim()]
      );
      if (convRes.rows.length > 0) {
        actualConvId = convRes.rows[0].id;
      } else {
        // Create conversation first if not exists
        const newConv = await getOrCreateConversation(conversationId);
        actualConvId = newConv.id;
      }
    }

    const res = await query(
      `INSERT INTO messages (conversation_id, sender_type, message_type, content, is_internal) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [actualConvId, senderType, messageType, content, isInternal]
    );

    // Update conversation's updated_at
    await query(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [actualConvId]
    );

    return mapMessage(res.rows[0]);
  } catch (err: any) {
    console.error("Error in addMessage:", err.message);
    return null;
  }
}
