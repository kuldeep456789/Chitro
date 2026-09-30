const BASE_URL = 'http://localhost:4000/api/v1';

async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function registerAndVerify(user) {
  // 1. Register
  const regRes = await apiRequest('/auth/register', 'POST', {
    email: user.email,
    username: user.username,
    password: user.password,
    displayName: user.displayName,
  });
  assert(regRes.ok, `User ${user.username} registration`);

  // 2. Dev mailbox for OTP
  const boxRes = await apiRequest(`/auth/dev-mailbox?email=${encodeURIComponent(user.email)}`);
  const code = boxRes.data?.data?.code || boxRes.data?.code;
  assert(Boolean(code), `Got OTP challenge for ${user.username}`);

  // 3. Verify OTP
  const verRes = await apiRequest('/auth/verify-otp', 'POST', {
    email: user.email,
    code,
  });
  const token = verRes.data?.accessToken || verRes.data?.tokens?.accessToken;
  const userId = verRes.data?.user?.id;
  assert(Boolean(token && userId), `Verified OTP & received token for ${user.username}`);

  return {
    id: userId,
    token: token,
    ...user,
  };
}

async function runV2Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING V2 FEATURES (READ RECEIPTS & GROUPS) TESTS');
  console.log('====================================================\n');

  const stamp = Date.now().toString().slice(-6);

  console.log('Step 1: Creating 3 test users...');
  const user1 = await registerAndVerify({
    email: `u1_${stamp}@test.com`,
    username: `u1_${stamp}`,
    password: 'Password123!',
    displayName: 'Alpha One',
  });

  const user2 = await registerAndVerify({
    email: `u2_${stamp}@test.com`,
    username: `u2_${stamp}`,
    password: 'Password123!',
    displayName: 'Beta Two',
  });

  const user3 = await registerAndVerify({
    email: `u3_${stamp}@test.com`,
    username: `u3_${stamp}`,
    password: 'Password123!',
    displayName: 'Gamma Three',
  });

  console.log('\nStep 2: User 1 creates a group with User 2...');
  const groupRes = await apiRequest('/conversations/groups', 'POST', {
    name: 'Rocket Squad',
    description: 'Initial description',
    memberIds: [user2.id],
  }, user1.token);
  assert(groupRes.ok && groupRes.data?.id, 'Group created successfully');
  const groupId = groupRes.data.id;
  assert(groupRes.data.members.length === 2, 'Group has 2 initial members');

  console.log('\nStep 3: User 1 updates group name & description...');
  const updateRes = await apiRequest(`/conversations/${groupId}`, 'PATCH', {
    name: 'Rocket Squad Prime',
    description: 'Updated awesome squad',
  }, user1.token);
  assert(updateRes.ok, 'Group updated successfully');
  assert(updateRes.data.name === 'Rocket Squad Prime', 'Group name changed');

  console.log('\nStep 4: User 1 sends a message in the group...');
  const msgRes = await apiRequest(`/conversations/${groupId}/messages`, 'POST', {
    text: 'Welcome to the team!',
  }, user1.token);
  assert(msgRes.ok && msgRes.data?.id, 'Message sent successfully');
  const msgId = msgRes.data.id;

  console.log('\nStep 5: User 2 verifies unread count > 0 before reading...');
  const convsResBefore = await apiRequest('/conversations', 'GET', null, user2.token);
  assert(convsResBefore.ok, 'User 2 fetched conversations');
  const user2ConvBefore = convsResBefore.data.find(c => c.id === groupId);
  assert(user2ConvBefore && user2ConvBefore.unreadCount === 1, 'User 2 has 1 unread message');

  console.log('\nStep 6: User 2 marks conversation as read...');
  const readRes = await apiRequest(`/conversations/${groupId}/read`, 'PUT', { messageId: msgId }, user2.token);
  assert(readRes.ok && readRes.data?.success, 'Conversation marked as read');

  console.log('\nStep 7: User 2 verifies unread count is now 0...');
  const convsResAfter = await apiRequest('/conversations', 'GET', null, user2.token);
  const user2ConvAfter = convsResAfter.data.find(c => c.id === groupId);
  assert(user2ConvAfter && user2ConvAfter.unreadCount === 0, 'User 2 unread count cleared to 0');

  console.log('\nStep 8: User 1 adds User 3 to the group...');
  const addRes = await apiRequest(`/conversations/${groupId}/members`, 'POST', {
    memberIds: [user3.id],
  }, user1.token);
  assert(addRes.ok, 'Member 3 added successfully');
  assert(addRes.data.members.some(m => m.user.id === user3.id), 'User 3 is in members list');

  console.log('\nStep 9: User 1 removes User 3 from the group...');
  const removeRes = await apiRequest(`/conversations/${groupId}/members/${user3.id}`, 'DELETE', null, user1.token);
  assert(removeRes.ok && removeRes.data?.success, 'User 3 removed successfully');

  console.log('\nStep 10: User 2 leaves the group...');
  const leaveRes = await apiRequest(`/conversations/${groupId}/leave`, 'POST', null, user2.token);
  assert(leaveRes.ok && leaveRes.data?.success, 'User 2 left the group successfully');

  console.log('\n====================================================');
  console.log('🎉 ALL V2 FEATURES VERIFIED SUCCESSFULLY!');
  console.log('====================================================\n');
}

runV2Tests().catch(err => {
  console.error('\n❌ Test run failed:', err);
  process.exit(1);
});
