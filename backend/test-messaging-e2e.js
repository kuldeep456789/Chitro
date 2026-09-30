require('dotenv').config({ path: __dirname + '/.env' });
const { io } = require('socket.io-client');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000/api/v1';
const SOCKET_URL = 'http://localhost:4000';
const otpSalt = process.env.OTP_SECRET_SALT || 'chitro-otp-digest-salt-2026';

function hashOtp(code) {
  return crypto.createHash('sha256').update(`${code}:${otpSalt}`).digest('hex');
}

async function createAndVerifyUser(suffix) {
  const email = `user_${suffix}_${Date.now()}@chitro.test`;
  const username = `u_${suffix}_${Date.now()}`;
  const password = 'Password123!';
  const displayName = `Chitro User ${suffix}`;

  // Register
  await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, displayName, password }),
  });

  // Find challenge in DB with retry
  let challenge = null;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      challenge = await prisma.otpChallenge.findFirst({
        where: { email, purpose: 'REGISTER', isUsed: false },
        orderBy: { createdAt: 'desc' },
      });
      if (challenge) break;
    } catch (e) {
      if (attempt === 5) throw e;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Find matching code
  let code = null;
  for (let i = 100000; i <= 999999; i++) {
    const s = i.toString();
    if (hashOtp(s) === challenge.codeHash) {
      code = s;
      break;
    }
  }

  // Verify
  const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  const data = await verifyRes.json();
  return { ...data.user, token: data.accessToken };
}

async function runMessagingTests() {
  console.log('--- STARTING MILESTONE 3 & 4 MESSAGING & SOCKET.IO TESTS ---');

  try {
    // 1. Create two verified users (Alice and Bob)
    console.log('\n[1] Creating verified User Alice and User Bob...');
    const alice = await createAndVerifyUser('alice');
    const bob = await createAndVerifyUser('bob');
    console.log(`✓ Alice created: ${alice.username} (${alice.id})`);
    console.log(`✓ Bob created: ${bob.username} (${bob.id})`);

    // 2. Test User Search
    console.log('\n[2] Testing User Search (Alice searches for Bob)...');
    const searchRes = await fetch(`${API_URL}/users/search?q=${bob.username.slice(0, 5)}`, {
      headers: { Authorization: `Bearer ${alice.token}` },
    });
    const searchResults = await searchRes.json();
    console.log('Search results count:', searchResults.length);
    if (!searchResults.some((u) => u.id === bob.id)) {
      throw new Error('Bob was not found in user search!');
    }
    console.log('✓ User search returned matching user.');

    // 3. Create Direct Conversation (Deterministic pairKey)
    console.log('\n[3] Testing Direct Conversation Creation (pairKey)...');
    const convRes = await fetch(`${API_URL}/conversations/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({ targetUserId: bob.id }),
    });
    const conv = await convRes.json();
    console.log('Conversation response status:', convRes.status, 'Body:', conv);
    if (!conv.id || !conv.pairKey) {
      throw new Error(`Failed to create direct conversation: status ${convRes.status} ${JSON.stringify(conv)}`);
    }

    // Check duplicate direct conversation returns same conversation
    const convRes2 = await fetch(`${API_URL}/conversations/direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bob.token}`,
      },
      body: JSON.stringify({ targetUserId: alice.id }),
    });
    const conv2 = await convRes2.json();
    if (conv2.id !== conv.id) {
      throw new Error('Direct conversation pairKey did not deduplicate between users!');
    }
    console.log('✓ Deterministic pairKey successfully deduplicated direct conversation.');

    // 4. Test Socket.IO Connection and Subscription
    console.log('\n[4] Connecting Alice and Bob to Socket.IO gateway...');
    const aliceSocket = io(SOCKET_URL, {
      auth: { token: alice.token },
      transports: ['websocket'],
    });

    const bobSocket = io(SOCKET_URL, {
      auth: { token: bob.token },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((resolve) => aliceSocket.on('connect', resolve)),
      new Promise((resolve) => bobSocket.on('connect', resolve)),
    ]);
    console.log('✓ Both Alice and Bob authenticated on Socket.IO.');

    // Bob subscribes to conversation room
    const subAck = await new Promise((resolve) => {
      bobSocket.emit('conversation:subscribe', { conversationId: conv.id }, resolve);
    });
    console.log('Bob subscribe acknowledgment:', subAck);
    if (!subAck.success) {
      throw new Error('Bob failed to subscribe to conversation room');
    }

    // Alice subscribes to conversation room
    await new Promise((resolve) => {
      aliceSocket.emit('conversation:subscribe', { conversationId: conv.id }, resolve);
    });

    // 5. Test Live Message Transmission (Alice -> Bob)
    console.log('\n[5] Testing Real-Time Message Send via Socket.IO...');
    const clientMsgId = `cli_${Date.now()}`;
    const testMessageText = 'Hello Bob, Chitro real-time messaging is live!';

    const messagePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for message:new')), 5000);
      bobSocket.on('message:new', (msg) => {
        if (msg.text === testMessageText) {
          clearTimeout(timeout);
          resolve(msg);
        }
      });
    });

    const sendAck = await new Promise((resolve) => {
      aliceSocket.emit(
        'message:send',
        {
          conversationId: conv.id,
          text: testMessageText,
          clientMessageId: clientMsgId,
        },
        resolve,
      );
    });
    console.log('Alice send acknowledgment:', sendAck.success);
    if (!sendAck.success) {
      throw new Error(`Message send failed: ${JSON.stringify(sendAck)}`);
    }

    const receivedMessage = await messagePromise;
    console.log('✓ Bob received live message:', receivedMessage.text);
    console.log('Canonical message id in Neon:', receivedMessage.id);

    // 6. Test Idempotency (resending with same clientMessageId)
    console.log('\n[6] Testing Message Idempotency (resend duplicate clientMessageId)...');
    const duplicateAck = await new Promise((resolve) => {
      aliceSocket.emit(
        'message:send',
        {
          conversationId: conv.id,
          text: testMessageText,
          clientMessageId: clientMsgId,
        },
        resolve,
      );
    });
    if (duplicateAck.message.id !== receivedMessage.id) {
      throw new Error('Duplicate message was created instead of returning existing record!');
    }
    console.log('✓ Duplicate retry safely returned existing canonical message ID.');

    // 7. Test Message History Recovery (Reload simulation)
    console.log('\n[7] Testing History Pagination (GET /conversations/:id/messages)...');
    const historyRes = await fetch(`${API_URL}/conversations/${conv.id}/messages`, {
      headers: { Authorization: `Bearer ${bob.token}` },
    });
    const history = await historyRes.json();
    console.log('Message history count:', history.length);
    if (!history.some((m) => m.text === testMessageText)) {
      throw new Error('Sent message not found in history!');
    }
    console.log('✓ History restored accurately from Neon PostgreSQL.');

    // 8. Test Unauthorized Subscription Rejection
    console.log('\n[8] Testing Unauthorized Room Subscription (Eve tries to join conversation)...');
    const eve = await createAndVerifyUser('eve');
    const eveSocket = io(SOCKET_URL, {
      auth: { token: eve.token },
      transports: ['websocket'],
    });
    await new Promise((resolve) => eveSocket.on('connect', resolve));
    const eveSubAck = await new Promise((resolve) => {
      eveSocket.emit('conversation:subscribe', { conversationId: conv.id }, resolve);
    });
    console.log('Eve unauthorized subscribe response:', eveSubAck);
    if (eveSubAck.success) {
      throw new Error('Non-member was able to subscribe to conversation room!');
    }
    console.log('✓ Unauthorized subscription properly rejected by server.');

    // 9. Test Atomic Group Creation & Messaging
    console.log('\n[9] Testing Atomic Group Conversation Creation...');
    const groupRes = await fetch(`${API_URL}/conversations/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${alice.token}`,
      },
      body: JSON.stringify({
        name: 'Chitro Core Team',
        description: 'Product & Engineering discussions',
        memberIds: [bob.id],
      }),
    });
    const groupData = await groupRes.json();
    console.log('Group created:', groupData.name, 'Members count:', groupData.members.length);
    if (groupData.members.length !== 2) {
      throw new Error('Group was not created with atomic memberships!');
    }
    console.log('✓ Group created atomically with roles.');

    // Disconnect sockets
    aliceSocket.disconnect();
    bobSocket.disconnect();
    eveSocket.disconnect();

    console.log('\n=================================================================');
    console.log(' ALL MILESTONE 3 & 4 MESSAGING & SOCKET.IO GATES PASSED! ');
    console.log('=================================================================');
  } finally {
    await prisma.$disconnect();
  }
}

runMessagingTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
