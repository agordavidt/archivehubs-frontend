import conversationsData from './data/conversations.json';

const REPLY_POOL = [
  "Sounds good — let's do it.",
  "Thanks for following up on this.",
  "Got it. I'll take a look and get back to you.",
  "Interesting perspective. Can you say more?",
  "Makes sense. What's the timeline looking like?",
  "Appreciate the context — that helps a lot.",
  "Sure, I'm free later this week.",
  "Let me check with the team and circle back.",
];

const MY_ID = () => {
  try { return localStorage.getItem('ah:mock:userId') || 'me'; }
  catch { return 'me'; }
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const jitter = (base, spread) => base + Math.random() * spread;

export function createMockSocket() {
  const handlers = new Map();
  let connected = false;

  // ── Seed state ─────────────────────────────────────────────
  const conversations = conversationsData.conversations.map(c => ({ ...c }));
  const messages = new Map();
  conversationsData.messages.forEach((m) => {
    if (!messages.has(m.conversationId)) messages.set(m.conversationId, []);
    messages.get(m.conversationId).push({
      ...m,
      senderId: m.senderId === 'me' ? MY_ID() : m.senderId,
    });
  });

  // ── Emitter ────────────────────────────────────────────────
  function dispatch(event, payload) {
    const set = handlers.get(event);
    if (!set) return;
    set.forEach((h) => {
      try { h(payload); }
      catch (e) { console.error(`[socket-mock] handler error for "${event}":`, e); }
    });
  }

  function emitToClient(event, payload) {
    setTimeout(() => dispatch(event, payload), jitter(30, 60));
  }

  // ── Handlers ───────────────────────────────────────────────
  function handleGetMessages({ conversationId, limit = 30 }, ack) {
    const all = messages.get(conversationId) || [];
    const slice = all.slice(-limit);
    const hasMore = all.length > slice.length;
    setTimeout(() => {
      ack?.({ conversationId, messages: slice, hasMore });
    }, jitter(80, 120));
  }

  function handleSendMessage({ recipientId, conversationId, content, mediaUrl, replyToMessageId }, ack) {
    let conv = conversationId
      ? conversations.find(c => c.id === conversationId)
      : conversations.find(c => c.participants.some(p => p.id === recipientId));

    // Auto-create a conversation if none exists
    if (!conv) {
      const recipient = conversations
        .flatMap(c => c.participants)
        .find(p => p.id === recipientId) || {
          id: recipientId, name: 'New connection', avatar: 'images/profile.jpg', headline: '',
        };
      conv = {
        id: `c-${Date.now().toString(36)}`,
        participants: [recipient],
        lastMessage: null,
        unreadCount: 0,
        updatedAt: Date.now(),
        focused: true,
        starred: false,
      };
      conversations.push(conv);
      messages.set(conv.id, []);
    }

    const msg = {
      id: `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
      conversationId: conv.id,
      senderId: MY_ID(),
      content,
      mediaUrl,
      replyToMessageId,
      createdAt: Date.now(),
      read: false,
    };
    messages.get(conv.id).push(msg);
    conv.lastMessage = { ...msg };
    conv.updatedAt = msg.createdAt;

    // Ack immediately
    setTimeout(() => ack?.({ message: msg }), jitter(40, 60));

    // Echo as newMessage so the UI unifies sender/receiver handling
    emitToClient('newMessage', msg);

    // Simulate the recipient reading it, then typing, then replying
    simulateRecipientFlow(conv, recipientId);

    return conv.id;
  }

  function handleMarkAsRead({ conversationId, lastReadMessageId }, ack) {
    const list = messages.get(conversationId) || [];
    list.forEach(m => { m.read = true; });
    const conv = conversations.find(c => c.id === conversationId);
    if (conv) conv.unreadCount = 0;
    setTimeout(() => ack?.({ ok: true }), jitter(40, 60));

    // Echo a read receipt from "the other side"
    emitToClient('readReceipt', { conversationId, lastReadMessageId });
  }

  function handleTyping({ conversationId, typing }) {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;
    const other = conv.participants[0];
    // In mock, we only send typing to our own client when *we* type.
    // Real server would broadcast to the other party.
  }

  // ── Auto-reply simulation ──────────────────────────────────
  function simulateRecipientFlow(conv, recipientId) {
    const recipient = conv.participants.find(p => p.id === recipientId) || conv.participants[0];
    if (!recipient) return;

    // 1) Mark their read receipt after a short pause
    setTimeout(() => {
      emitToClient('readReceipt', {
        conversationId: conv.id,
        lastReadMessageId: messages.get(conv.id).at(-1)?.id,
      });
    }, jitter(500, 700));

    // 2) Typing indicator
    setTimeout(() => {
      emitToClient('typing', { conversationId: conv.id, userId: recipient.id, typing: true });
    }, jitter(900, 500));

    // 3) Reply after a natural pause
    setTimeout(() => {
      emitToClient('typing', { conversationId: conv.id, userId: recipient.id, typing: false });

      const reply = {
        id: `m-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
        conversationId: conv.id,
        senderId: recipient.id,
        content: REPLY_POOL[Math.floor(Math.random() * REPLY_POOL.length)],
        createdAt: Date.now(),
        read: false,
      };
      messages.get(conv.id).push(reply);
      conv.lastMessage = { ...reply };
      conv.updatedAt = reply.createdAt;
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      emitToClient('newMessage', reply);
    }, jitter(2600, 1400));
  }

  // ── Socket facade ──────────────────────────────────────────
  const socket = {
    get connected() { return connected; },

    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return () => handlers.get(event)?.delete(handler);
    },

    off(event, handler) {
      handlers.get(event)?.delete(handler);
    },

    emit(event, payload, ack) {
      switch (event) {
        case 'getMessages':  return handleGetMessages(payload, ack);
        case 'sendMessage':  return handleSendMessage(payload, ack);
        case 'markAsRead':   return handleMarkAsRead(payload, ack);
        case 'typing':       return handleTyping(payload);
        default:
          console.warn(`[socket-mock] unhandled emit: ${event}`);
      }
    },

    connect() {
      if (connected) return socket;
      connected = true;
      setTimeout(() => dispatch('connect'), jitter(60, 80));
      return socket;
    },

    disconnect() {
      connected = false;
      dispatch('disconnect');
    },

    // Test helper — expose conversation list for hydration in the UI
    _getConversations() { return conversations; },
  };

  return socket.connect();
}