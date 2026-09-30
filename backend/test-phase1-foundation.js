
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

async function runPhase1Tests() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 1 AUTOMATED E2E VERIFICATION SUITE');
  console.log('====================================================\n');

  const stamp = Date.now().toString().slice(-6);

  const users = {
    owner: {
      email: `chitro_owner_${stamp}@test.com`,
      username: `owner_${stamp}`,
      password: 'Password123!',
      displayName: 'Owner User',
      token: null,
      id: null,
      code: null,
    },
    member1: {
      email: `chitro_m1_${stamp}@test.com`,
      username: `member1_${stamp}`,
      password: 'Password123!',
      displayName: 'Member One',
      token: null,
      id: null,
      code: null,
    },
    member2: {
      email: `chitro_m2_${stamp}@test.com`,
      username: `member2_${stamp}`,
      password: 'Password123!',
      displayName: 'Member Two',
      token: null,
      id: null,
      code: null,
    },
    nonMember: {
      email: `chitro_intruder_${stamp}@test.com`,
      username: `intruder_${stamp}`,
      password: 'Password123!',
      displayName: 'Intruder User',
      token: null,
      id: null,
      code: null,
    },
  };

  // ------------------------------------------------------------------
  // TEST 1: Register and retrieve OTP via Dev Mailbox (Zero-Leakage)
  // ------------------------------------------------------------------
  console.log('▶ TEST 1: Registration and Dev Mailbox OTP Retrieval');
  for (const [key, user] of Object.entries(users)) {
    const regRes = await apiRequest('/auth/register', 'POST', {
      email: user.email,
      username: user.username,
      password: user.password,
      displayName: user.displayName,
    });
    assert(regRes.status === 201, `Registered ${key} (${user.email}) successfully`);

    // Fetch OTP via dev-mailbox
    const mbRes = await apiRequest(`/auth/dev-mailbox?email=${encodeURIComponent(user.email)}`);
    assert(mbRes.status === 200 && mbRes.data?.data?.code, `Dev mailbox returned OTP for ${key}`);
    user.code = mbRes.data.data.code;
  }

  // ------------------------------------------------------------------
  // TEST 2: Brute-Force OTP Lockout (Max 5 attempts)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 2: Brute-Force Lockout Enforcement');
  const bruteUser = {
    email: `chitro_brute_${stamp}@test.com`,
    username: `brute_${stamp}`,
    password: 'Password123!',
    displayName: 'Brute Test',
  };
  await apiRequest('/auth/register', 'POST', bruteUser);

  // Send 4 invalid attempts -> each decrements remaining
  for (let i = 1; i <= 4; i++) {
    const attempt = await apiRequest('/auth/verify-otp', 'POST', {
      email: bruteUser.email,
      code: '000000',
    });
    assert(attempt.status === 400 && attempt.data?.message?.includes('remaining'), `Attempt ${i} rejected with attempts remaining`);
  }

  // 5th attempt exhausts attempts and marks challenge used
  const fifthAttempt = await apiRequest('/auth/verify-otp', 'POST', {
    email: bruteUser.email,
    code: '000000',
  });
  assert(
    fifthAttempt.status === 400 && fifthAttempt.data?.message?.includes('Maximum attempts reached'),
    `5th attempt triggers maximum attempts lockout (${fifthAttempt.data?.message})`,
  );

  // 6th attempt is completely locked out
  const lockedOutAttempt = await apiRequest('/auth/verify-otp', 'POST', {
    email: bruteUser.email,
    code: '000000',
  });
  assert(
    lockedOutAttempt.status === 400 &&
    (lockedOutAttempt.data?.message?.includes('No active verification') ||
      lockedOutAttempt.data?.message?.includes('Maximum verification attempts')),
    `Subsequent attempts rejected as challenge is invalidated (${lockedOutAttempt.data?.message})`,
  );

  // ------------------------------------------------------------------
  // TEST 3: 60-Second Cooldown on Resend OTP
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 3: 60-Second Cooldown on OTP Resend');
  const cdUser = {
    email: `chitro_cd_${stamp}@test.com`,
    username: `cd_${stamp}`,
    password: 'Password123!',
    displayName: 'Cooldown User',
  };
  await apiRequest('/auth/register', 'POST', cdUser);
  const cooldownRes = await apiRequest('/auth/resend-otp', 'POST', {
    email: cdUser.email,
  });
  assert(
    (cooldownRes.status === 400 || cooldownRes.status === 429) &&
    cooldownRes.data?.message?.includes('wait'),
    `Resend within 60s blocked with HTTP ${cooldownRes.status} (${cooldownRes.data?.message})`,
  );

  // ------------------------------------------------------------------
  // TEST 4: OTP Verification and Token Issuance
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 4: Verify OTP and Obtain JWT Tokens');
  for (const [key, user] of Object.entries(users)) {
    const verifyRes = await apiRequest('/auth/verify-otp', 'POST', {
      email: user.email,
      code: user.code,
    });
    if (verifyRes.status !== 200) {
      console.error(`Verification failed for ${key}:`, JSON.stringify(verifyRes));
    }
    assert(verifyRes.status === 200, `OTP verified for ${key}`);
    user.token = verifyRes.data?.accessToken;
    user.id = verifyRes.data?.user?.id;
    assert(Boolean(user.token && user.id), `${key} issued valid JWT and user ID: ${user.id}`);
  }

  // ------------------------------------------------------------------
  // TEST 5: Group Creation with Multiple Members (Role Assignment)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 5: Group Creation with Multiple Members');
  const groupRes = await apiRequest(
    '/conversations/groups',
    'POST',
    {
      name: 'Engineering Alpha',
      memberIds: [users.member1.id, users.member2.id],
    },
    users.owner.token,
  );

  if (groupRes.status !== 201) {
    console.error('groupRes failed:', JSON.stringify(groupRes));
  }
  assert(groupRes.status === 201, `Group created successfully (ID: ${groupRes.data?.id})`);
  const group = groupRes.data;
  assert(group.type === 'GROUP', 'Group conversation has type = GROUP');
  assert(group.name === 'Engineering Alpha', 'Group conversation name is correct');

  const members = group.members;
  assert(members.length === 3, 'Group contains exactly 3 members (owner + 2 members)');

  const ownerPart = members.find((p) => p.userId === users.owner.id);
  assert(ownerPart && ownerPart.role === 'OWNER', 'Creator has role OWNER');

  const m1Part = members.find((p) => p.userId === users.member1.id);
  const m2Part = members.find((p) => p.userId === users.member2.id);
  assert(m1Part && m1Part.role === 'MEMBER', 'Member 1 has role MEMBER');
  assert(m2Part && m2Part.role === 'MEMBER', 'Member 2 has role MEMBER');

  // ------------------------------------------------------------------
  // TEST 6: Group Creation with 0 Initial Members (Solo Group)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 6: Group Creation with 0 Initial Members');
  const soloGroupRes = await apiRequest(
    '/conversations/groups',
    'POST',
    {
      name: 'Solo Project Workspace',
      memberIds: [],
    },
    users.owner.token,
  );

  assert(soloGroupRes.status === 201, `Solo group created successfully (ID: ${soloGroupRes.data?.id})`);
  assert(
    soloGroupRes.data.members.length === 1,
    'Solo group has exactly 1 member (the creator as OWNER)',
  );
  assert(
    soloGroupRes.data.members[0].userId === users.owner.id &&
    soloGroupRes.data.members[0].role === 'OWNER',
    'Creator in solo group is OWNER',
  );

  // ------------------------------------------------------------------
  // TEST 7: Group Creation with Invalid / Non-existent User ID
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 7: Group Creation with Non-Existent User ID');
  const invalidGroupRes = await apiRequest(
    '/conversations/groups',
    'POST',
    {
      name: 'Invalid Members Group',
      memberIds: ['00000000-0000-0000-0000-000000000000'],
    },
    users.owner.token,
  );
  assert(
    invalidGroupRes.status === 400,
    `Rejected non-existent user with HTTP 400 (${invalidGroupRes.data?.message})`,
  );

  // ------------------------------------------------------------------
  // TEST 8: Group Authorization Check (403 Forbidden for Non-Members)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 8: Group Access Control Enforcement (403 Forbidden)');
  // Non-member tries to get group details
  const getForbiddenRes = await apiRequest(
    `/conversations/${group.id}`,
    'GET',
    null,
    users.nonMember.token,
  );
  assert(
    getForbiddenRes.status === 403,
    `Non-member blocked from GET /conversations/${group.id} with HTTP 403`,
  );

  // Non-member tries to send message into group
  const postForbiddenRes = await apiRequest(
    `/conversations/${group.id}/messages`,
    'POST',
    { text: 'I should not be here' },
    users.nonMember.token,
  );
  assert(
    postForbiddenRes.status === 403,
    `Non-member blocked from posting message with HTTP 403`,
  );

  // Authorized member can view group
  const memberGetRes = await apiRequest(
    `/conversations/${group.id}`,
    'GET',
    null,
    users.member1.token,
  );
  assert(
    memberGetRes.status === 200,
    `Authorized member can view group details with HTTP 200`,
  );

  // Authorized member can post message
  const memberPostRes = await apiRequest(
    `/conversations/${group.id}/messages`,
    'POST',
    { text: 'Hello team!' },
    users.member1.token,
  );
  assert(
    memberPostRes.status === 201,
    `Authorized member can post message to group with HTTP 201`,
  );

  // ------------------------------------------------------------------
  // TEST 9: Direct Conversation Deduplication (pairKey)
  // ------------------------------------------------------------------
  console.log('\n▶ TEST 9: Direct Conversation Deduplication (pairKey)');
  const d1 = await apiRequest(
    '/conversations/direct',
    'POST',
    { targetUserId: users.member1.id },
    users.owner.token,
  );
  if (d1.status !== 201 && d1.status !== 200) {
    console.error('d1 direct failed:', JSON.stringify(d1));
  }
  assert(d1.status === 201 || d1.status === 200, `First direct conversation created: ${d1.data?.id}`);

  // Create again from member1 to owner (reverse direction)
  const d2 = await apiRequest(
    '/conversations/direct',
    'POST',
    { targetUserId: users.owner.id },
    users.member1.token,
  );
  assert(
    d2.data?.id === d1.data?.id,
    `Reverse direct call returns exact same conversation ID (${d1.data?.id} === ${d2.data?.id})`,
  );

  console.log('\n====================================================');
  console.log('🎉 ALL PHASE 1 AUTOMATED E2E TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runPhase1Tests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
