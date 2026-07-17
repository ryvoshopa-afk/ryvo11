import { Server, Socket } from 'socket.io';
import { 
  getOrCreateConversation, 
  addMessage, 
  updateConversationStatus, 
  updateConversationSummary 
} from './services/dbSupportService';
import { generateAIResponse, generateSmartSummary } from './services/aiSupportService';

export function initSockets(io: Server) {
  console.log("🔌 Initializing Socket.io Event Listeners...");

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join a support conversation room
    socket.on('join_conversation', async ({ sessionId }) => {
      if (!sessionId) return;
      const cleanSessionId = sessionId.toLowerCase().trim();
      const roomName = `conversation_${cleanSessionId}`;
      socket.join(roomName);
      console.log(`👤 Client ${socket.id} joined room ${roomName}`);

      // If this is an agent, join the 'agents' room
      socket.join('agents_room');
    });

    // Handle incoming messages
    socket.on('send_message', async (payload) => {
      const { sessionId, sender, text, attachment, isInternal } = payload;
      if (!sessionId) return;

      const cleanSessionId = sessionId.toLowerCase().trim();
      const clientRoom = `conversation_${cleanSessionId}`;

      // 1. Fetch current conversation status
      let conversation = await getOrCreateConversation(cleanSessionId);
      if (!conversation) {
        console.error(`Could not find or create conversation for ${cleanSessionId}`);
        return;
      }

      const msgType = attachment?.type?.startsWith('image/') ? 'image' : 
                      attachment?.type?.startsWith('audio/') ? 'audio' : 
                      attachment ? 'file' : 'text';
      const content = attachment ? attachment.url : text;

      // 2. AI Gateway Guard checking
      if (sender === 'user') {
        // Customer sending message
        if (conversation.status === 'AI_HANDLING') {
          // Save and broadcast customer message
          const savedUserMsg = await addMessage(conversation.id, 'customer', msgType, content, false);
          if (savedUserMsg) {
            io.to(clientRoom).emit('message_received', savedUserMsg);
            io.to('agents_room').emit('agent_message_received', { sessionId: cleanSessionId, message: savedUserMsg });
          }

          // Trigger Gemini AI processing
          // Update conversation object with the new user message locally so Gemini has it in context
          conversation.messages.push({
            id: savedUserMsg?.id || `temp-${Date.now()}`,
            sender: 'user',
            text: text,
            attachment: attachment
          });

          // Show typing indicator for AI
          io.to(clientRoom).emit('typing_status', { sender: 'support', isTyping: true });

          const aiReply = await generateAIResponse(conversation, text, attachment);
          
          // Stop typing indicator
          io.to(clientRoom).emit('typing_status', { sender: 'support', isTyping: false });

          let cleanAiReply = aiReply;
          let shouldTransfer = false;

          if (aiReply.includes('[TRANSFER_TO_AGENT]')) {
            shouldTransfer = true;
            cleanAiReply = aiReply.replace('[TRANSFER_TO_AGENT]', '').trim();
          }

          // Save AI message to DB
          const savedAiMsg = await addMessage(conversation.id, 'ai', 'text', cleanAiReply, false);
          if (savedAiMsg) {
            io.to(clientRoom).emit('message_received', savedAiMsg);
            io.to('agents_room').emit('agent_message_received', { sessionId: cleanSessionId, message: savedAiMsg });
          }

          if (shouldTransfer) {
            // Transition to PENDING_CUSTOMER_APPROVAL
            await updateConversationStatus(conversation.id, 'PENDING_CUSTOMER_APPROVAL');
            
            // Add user message to conversation for summary context
            conversation.messages.push({
              id: savedAiMsg?.id || `temp-ai-${Date.now()}`,
              sender: 'support',
              text: cleanAiReply
            });

            // Generate smart summary
            const summary = await generateSmartSummary(conversation);
            await updateConversationSummary(conversation.id, summary);

            // Emit status update to both rooms
            io.to(clientRoom).emit('status_updated', { status: 'PENDING_CUSTOMER_APPROVAL', ai_summary: summary });
            io.to('agents_room').emit('agent_status_updated', { sessionId: cleanSessionId, status: 'PENDING_CUSTOMER_APPROVAL', ai_summary: summary });
          }

        } else {
          // Conversation is handled by a human (HUMAN_HANDLING, QUEUED_FOR_HUMAN, PENDING_CUSTOMER_APPROVAL)
          // Pass directly to the agent screen via Socket.io
          const savedUserMsg = await addMessage(conversation.id, 'customer', msgType, content, false);
          if (savedUserMsg) {
            // Send to client room
            io.to(clientRoom).emit('message_received', savedUserMsg);
            // Send to agents room
            io.to('agents_room').emit('agent_message_received', { sessionId: cleanSessionId, message: savedUserMsg });
          }
        }
      } 
      else if (sender === 'support') {
        // Agent sending message
        const isNote = !!isInternal;
        const savedAgentMsg = await addMessage(conversation.id, 'agent', msgType, content, isNote);
        
        if (savedAgentMsg) {
          if (isNote) {
            // Internal note: ONLY emit to agent screen, NOT customer screen!
            io.to('agents_room').emit('agent_message_received', { sessionId: cleanSessionId, message: savedAgentMsg });
          } else {
            // Normal message: emit to both customer and agent
            io.to(clientRoom).emit('message_received', savedAgentMsg);
            io.to('agents_room').emit('agent_message_received', { sessionId: cleanSessionId, message: savedAgentMsg });
          }
        }

        // If status was QUEUED_FOR_HUMAN or PENDING_CUSTOMER_APPROVAL, change to HUMAN_HANDLING when agent replies
        if (conversation.status === 'QUEUED_FOR_HUMAN' || conversation.status === 'PENDING_CUSTOMER_APPROVAL') {
          await updateConversationStatus(conversation.id, 'HUMAN_HANDLING');
          io.to(clientRoom).emit('status_updated', { status: 'HUMAN_HANDLING' });
          io.to('agents_room').emit('agent_status_updated', { sessionId: cleanSessionId, status: 'HUMAN_HANDLING' });
        }
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ sessionId, sender, isTyping }) => {
      if (!sessionId) return;
      const cleanSessionId = sessionId.toLowerCase().trim();
      socket.to(`conversation_${cleanSessionId}`).emit('typing_status', { sender, isTyping });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });
}
