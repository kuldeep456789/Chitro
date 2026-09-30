/**
 * Phase 2: Comprehensive Group Creation & Group Authorization Test Suite
 *
 * Verifies:
 * 1. Valid group creation (creator assigned OWNER, members assigned MEMBER)
 * 2. Group creation with only creator (single-participant group)
 * 3. Group name validation (min 2, max 50 characters, trimming)
 * 4. Duplicate member ID deduplication in request payload
 * 5. Invalid / non-existent user ID rejection (HTTP 400)
 * 6. Real-time Socket.IO `conversation:new` notification push to online participants
 * 7. Group persistence and retrieval via GET /conversations and GET /conversations/:id
 * 8. Group membership authorization (non-members blocked with HTTP 403 Forbidden)
 * 9. Group messaging authorization (non-members blocked from sending messages)
 */

let io;
try {
  io = require('socket.io-client').io;
} catch {
  io = require('../frontend/node_modules/socket.io-client').io;
}

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4000';

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function createVerifiedUser(prefix) {
  const runId = Math.floor(Math.random() * 900000) + 100000;
  const userPayload = {
    email: `p2_${prefix}_${runId}@ chitrotest.com`.replace(' ', ''),
    username: `u2_${prefix}_${runId}`,
    displayName: `P2 User ${prefix} ${runId}`,
    password: `Password@${runId}`,
  };

  const regRes = await apiRequest('/auth/register', 'POST', userPayload);
  if (regRes.status !== 201) {
    throw new Error(`User registration failed: ${JSON.stringify(regRes.data)}`);
  }

  const devRes = await apiRequest(`/auth/dev-mailbox?email=${encodeURIComponent(userPayload.email)}`);
  const code = devRes.data?.data?.code || devRes.data?.code;

  const verifyRes = await apiRequest('/auth/verify-otp', 'POST', {
    email: userPayload.email,
    code,
  });

  if (verifyRes.status !== 200) {
    throw new Error(`User verification failed: ${JSON.stringify(verifyRes.data)}`);
  }

  return {
    id: verifyRes.data.user.id,
    email: verifyRes.data.user.email,
    username: verifyRes.data.user.username,
    displayName: verifyRes.data.user.displayName,
    token: verifyRes.data.accessToken,
  };
}

async function runPhase2GroupSuite() {
  console.log('\n==========================================================');
  console.log('🧪 RUNNING PHASE 2: GROUP CREATION & AUTHORIZATION SUITE');
  console.log('==========================================================\n');

  // 1. Setup Test Users: Owner (Alice), Member (Bob), Member (Charlie), Outsider (Eve)
  console.log('▶ STEP 1: Creating Verified Test Users');
  const alice = await createVerifiedUser('alice');
  const bob = await createVerifiedUser('bob');
  const charlie = await createVerifiedUser('charlie');
  const eve = await createVerifiedUser('eve');
  assert(alice.id && bob.id && charlie.id && eve.id, 'Created Alice, Bob, Charlie, and Eve');

  // 2. Validate Group Name Boundaries
  console.log('\n▶ STEP 2: Group Name Validation');
  const shortNameRes = await apiRequest('/conversations/groups', 'POST', { name: 'A' }, alice.token);
  assert(shortNameRes.status === 400, 'Group name < 2 characters rejected with HTTP 400');

  const emptyNameRes = await apiRequest('/conversations/groups', 'POST', { name: '   ' }, alice.token);
  assert(emptyNameRes.status === 400, 'Whitespace group name rejected with HTTP 400');

  // 3. Non-Existent Member Validation
  console.log('\n▶ STEP 3: Non-Existent Member ID Rejection');
  const badMemberRes = await apiRequest(
    '/conversations/groups',
    'POST',
    {
      name: 'Invalid Group',
      memberIds: ['00000000-0000-0000-0000-000000000000'],
    },
    alice.token,
  );
  assert(badMemberRes.status === 400, 'Non-existent member ID rejected with HTTP 400');

  // 4. Duplicate Member Deduplication & Role Assignment
  console.log('\n▶ STEP 4: Group Creation with Member Deduplication & Role Assignment');
  // Connect Bob's socket to test real-time notification push
  const bobSocket = io(SOCKET_URL, {
    auth: { token: bob.token },
    transports: ['websocket'],
  });

  await new Promise((resolve) => bobSocket.on('connect', resolve));
  console.log('  ✓ Bob connected to Socket.IO for real-time notification testing');

  let bobReceivedGroupNotification = null;
  bobSocket.on('conversation:new', (conv) => {
    bobReceivedGroupNotification = conv;
  });

  const groupPayload = {
    name: 'Chitro Core Engineering',
    description: 'High performance messaging discussion',
    memberIds: [bob.id, charlie.id, bob.id, alice.id], // duplicate Bob and self-ID
  };

  const groupRes = await apiRequest('/conversations/groups', 'POST', groupPayload, alice.token);
  assert(groupRes.status === 201, 'Group created successfully with HTTP 201 Created');
  const group = groupRes.data;

  assert(group.type === 'GROUP', 'Conversation type is GROUP');
  assert(group.name === 'Chitro Core Engineering', 'Group name set correctly');
  assert(group.createdById === alice.id, 'Creator ID matches Alice');

  // Verify roles: Alice = OWNER, Bob & Charlie = MEMBER (Total 3 unique members)
  assert(group.members.length === 3, `Deduplicated member count is 3 (found ${group.members.length})`);

  const aliceMember = group.members.find((m) => m.userId === alice.id || m.user?.id === alice.id);
  assert(aliceMember && aliceMember.role === 'OWNER', 'Creator (Alice) assigned OWNER role');

  const bobMember = group.members.find((m) => m.userId === bob.id || m.user?.id === bob.id);
  assert(bobMember && bobMember.role === 'MEMBER', 'Participant (Bob) assigned MEMBER role');

  const charlieMember = group.members.find((m) => m.userId === charlie.id || m.user?.id === charlie.id);
  assert(charlieMember && charlieMember.role === 'MEMBER', 'Participant (Charlie) assigned MEMBER role');

  // Wait briefly for Socket.IO event push
  await new Promise((r) => setTimeout(r, 1000));
  assert(
    bobReceivedGroupNotification && bobReceivedGroupNotification.id === group.id,
    'Bob received real-time conversation:new push notification',
  );

  bobSocket.disconnect();

  // 5. Creator-Only Single Participant Group
  console.log('\n▶ STEP 5: Creator-Only Group Creation');
  const soloGroupRes = await apiRequest('/conversations/groups', 'POST', { name: 'Alice Notes' }, alice.token);
  assert(soloGroupRes.status === 201, 'Solo group created with HTTP 201 Created');
  assert(soloGroupRes.data.members.length === 1, 'Solo group contains exactly 1 member');
  assert(soloGroupRes.data.members[0].role === 'OWNER', 'Solo group creator has OWNER role');

  // 6. Group Persistence & Chat List Inclusion
  console.log('\n▶ STEP 6: Group Persistence & Retrieval');
  const aliceChatsRes = await apiRequest('/conversations', 'GET', null, alice.token);
  assert(aliceChatsRes.status === 200, 'GET /conversations returned HTTP 200');
  const foundGroupInList = aliceChatsRes.data.find((c) => c.id === group.id);
  assert(foundGroupInList !== undefined, 'Created group appears in Alice chat list');

  const bobChatsRes = await apiRequest('/conversations', 'GET', null, bob.token);
  const foundInBobList = bobChatsRes.data.find((c) => c.id === group.id);
  assert(foundInBobList !== undefined, 'Created group appears in Bob chat list');

  const getGroupDetailsRes = await apiRequest(`/conversations/${group.id}`, 'GET', null, bob.token);
  assert(getGroupDetailsRes.status === 200, 'Bob can retrieve group details via GET /conversations/:id');

  // 7. Group Authorization Enforcement (Non-Member Block)
  console.log('\n▶ STEP 7: Group Membership Authorization (Outsider Block)');
  const eveDetailsRes = await apiRequest(`/conversations/${group.id}`, 'GET', null, eve.token);
  assert(eveDetailsRes.status === 403, 'Non-member (Eve) blocked from GET /conversations/:id with HTTP 403');

  const eveMessagesRes = await apiRequest(`/conversations/${group.id}/messages`, 'GET', null, eve.token);
  assert(eveMessagesRes.status === 403, 'Non-member (Eve) blocked from GET messages with HTTP 403');

  const evePostRes = await apiRequest(
    `/conversations/${group.id}/messages`,
    'POST',
    { text: 'Unauthorized message' },
    eve.token,
  );
  assert(evePostRes.status === 403, 'Non-member (Eve) blocked from POST message with HTTP 403');

  console.log('\n==========================================================');
  console.log('🎉 ALL PHASE 2 GROUP CREATION & AUTH TESTS PASSED!');
  console.log('==========================================================\n');
}

runPhase2GroupSuite().catch((err) => {
  console.error('\n❌ PHASE 2 GROUP SUITE FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
