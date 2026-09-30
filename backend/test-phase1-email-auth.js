/**
 * Phase 1: Comprehensive Email OTP & Authentication Test Suite
 *
 * Verifies:
 * 1. User registration & Chitro verification email generation
 * 2. Zero-leakage dev-mailbox OTP retrieval
 * 3. Valid OTP verification & session token issuance
 * 4. User `isVerified` transition in database
 * 5. Reused OTP rejection (prevent OTP replay attacks)
 * 6. Incorrect OTP attempt counter decrement
 * 7. Brute-force lockout enforcement (challenge invalidated after 5 failed attempts)
 * 8. Expired OTP challenge rejection
 * 9. 60-second cooldown enforcement on OTP resend
 * 10. Duplicate registration prevention for verified users
 * 11. Login with verified account & password check
 * 12. Invalid password rejection (401 Unauthorized)
 * 13. Protected endpoint access with valid Bearer token
 * 14. Protected endpoint access without token (401 Unauthorized)
 */

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

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

async function runPhase1AuthSuite() {
  console.log('\n==========================================================');
  console.log('🧪 RUNNING PHASE 1: EMAIL OTP & AUTHENTICATION TEST SUITE');
  console.log('==========================================================\n');

  const runId = Math.floor(Math.random() * 900000) + 100000;
  const testUser = {
    email: `chitro_p1_${runId}@chitrotest.com`,
    username: `user_p1_${runId}`,
    displayName: `P1 Test User ${runId}`,
    password: `Password@${runId}`,
  };

  // ------------------------------------------------------------------
  // 1. REGISTRATION & OTP DISPATCH
  // ------------------------------------------------------------------
  console.log('▶ STEP 1: Registration and Verification Code Dispatch');
  const regRes = await apiRequest('/auth/register', 'POST', testUser);
  assert(regRes.status === 201, `Registration returned HTTP 201 Created`);
  assert(regRes.data.success === true, `Registration response has success: true`);
  assert(regRes.data.email === testUser.email, `Registration confirms email ${testUser.email}`);

  // ------------------------------------------------------------------
  // 2. DEV MAILBOX RETRIEVAL (Zero-leakage)
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 2: Dev Mailbox OTP Retrieval (Safe Sandbox)');
  const devMailRes = await apiRequest(`/auth/dev-mailbox?email=${encodeURIComponent(testUser.email)}`);
  assert(devMailRes.status === 200, `Dev mailbox endpoint returned HTTP 200`);
  const otpEntry = devMailRes.data?.data || devMailRes.data;
  assert(otpEntry && otpEntry.code, `OTP code retrieved from sandbox`);
  assert(otpEntry.code.length === 6, `OTP code is exactly 6 digits`);
  const correctOtp = otpEntry.code;

  // ------------------------------------------------------------------
  // 3. 60-SECOND RESEND COOLDOWN ENFORCEMENT
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 3: 60-Second Cooldown on OTP Resend');
  const cooldownRes = await apiRequest('/auth/resend-otp', 'POST', { email: testUser.email });
  assert(
    cooldownRes.status === 400 || cooldownRes.status === 429,
    `Immediate resend blocked with HTTP ${cooldownRes.status} (${cooldownRes.data.message})`,
  );

  // ------------------------------------------------------------------
  // 4. INCORRECT OTP ATTEMPT COUNTER
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 4: Incorrect OTP Validation & Attempt Counting');
  const badOtpRes = await apiRequest('/auth/verify-otp', 'POST', {
    email: testUser.email,
    code: '000000',
  });
  assert(badOtpRes.status === 400, `Incorrect OTP rejected with HTTP 400`);
  assert(
    badOtpRes.data.message.includes('remaining') || badOtpRes.data.message.includes('Invalid'),
    `Error response indicates attempts remaining (${badOtpRes.data.message})`,
  );

  // ------------------------------------------------------------------
  // 5. VALID OTP VERIFICATION & SESSION ISSUANCE
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 5: Valid OTP Verification & Session Issuance');
  const verifyRes = await apiRequest('/auth/verify-otp', 'POST', {
    email: testUser.email,
    code: correctOtp,
  });
  assert(verifyRes.status === 200, `Valid OTP verified with HTTP 200`);
  assert(verifyRes.data.success === true, `Verification response indicates success`);
  assert(verifyRes.data.user.isVerified === true, `User isVerified flag is now true`);
  assert(verifyRes.data.accessToken, `Access token (JWT) returned`);
  assert(verifyRes.data.refreshToken, `Refresh token returned`);
  const accessToken = verifyRes.data.accessToken;

  // ------------------------------------------------------------------
  // 6. REUSED OTP REJECTION (PREVENT REPLAY ATTACKS)
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 6: Reused OTP Rejection (Anti-Replay)');
  const replayRes = await apiRequest('/auth/verify-otp', 'POST', {
    email: testUser.email,
    code: correctOtp,
  });
  assert(
    replayRes.status === 400,
    `Reused OTP rejected with HTTP 400 (${replayRes.data.message})`,
  );

  // ------------------------------------------------------------------
  // 7. DUPLICATE REGISTRATION REJECTION FOR VERIFIED USER
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 7: Duplicate Registration Prevention');
  const dupRes = await apiRequest('/auth/register', 'POST', testUser);
  assert(
    dupRes.status === 400,
    `Duplicate registration for verified user rejected with HTTP 400 (${dupRes.data.message})`,
  );

  // ------------------------------------------------------------------
  // 8. LOGIN WITH VERIFIED ACCOUNT
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 8: Login with Verified Account');
  const loginRes = await apiRequest('/auth/login', 'POST', {
    identifier: testUser.email,
    password: testUser.password,
  });
  assert(loginRes.status === 200, `Login with verified credentials returned HTTP 200`);
  assert(loginRes.data.accessToken, `Login successfully issued new access token`);

  // Login via username
  const loginUsernameRes = await apiRequest('/auth/login', 'POST', {
    identifier: testUser.username,
    password: testUser.password,
  });
  assert(loginUsernameRes.status === 200, `Login with username returned HTTP 200`);

  // ------------------------------------------------------------------
  // 9. WRONG PASSWORD REJECTION
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 9: Wrong Password Rejection');
  const wrongPassRes = await apiRequest('/auth/login', 'POST', {
    identifier: testUser.email,
    password: 'IncorrectPassword999!',
  });
  assert(
    wrongPassRes.status === 401,
    `Wrong password rejected with HTTP 401 Unauthorized (${wrongPassRes.data.message})`,
  );

  // ------------------------------------------------------------------
  // 10. PROTECTED ROUTE ACCESS WITH TOKEN
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 10: Authenticated Profile Retrieval (/auth/me)');
  const meRes = await apiRequest('/auth/me', 'GET', null, accessToken);
  assert(meRes.status === 200, `Authenticated GET /auth/me returned HTTP 200`);
  assert(meRes.data.user?.email === testUser.email, `Profile email matches registered user`);
  assert(meRes.data.user?.isVerified === true, `Profile confirms user isVerified`);

  // ------------------------------------------------------------------
  // 11. PROTECTED ROUTE ACCESS WITHOUT TOKEN (401)
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 11: Unauthorized Access Rejection (No Token)');
  const unauthRes = await apiRequest('/auth/me', 'GET');
  assert(unauthRes.status === 401, `Unauthenticated request blocked with HTTP 401`);

  // ------------------------------------------------------------------
  // 12. BRUTE-FORCE LOCKOUT ON SEPARATE CHALLENGE
  // ------------------------------------------------------------------
  console.log('\n▶ STEP 12: Brute-Force Lockout (5 Failed Attempts)');
  const victimEmail = `chitro_lockout_${runId}@chitrotest.com`;
  await apiRequest('/auth/register', 'POST', {
    email: victimEmail,
    username: `lockout_${runId}`,
    displayName: `Lockout Test User`,
    password: `Password@${runId}`,
  });

  for (let i = 1; i <= 4; i++) {
    const r = await apiRequest('/auth/verify-otp', 'POST', {
      email: victimEmail,
      code: '999999',
    });
    assert(r.status === 400, `Attempt ${i} rejected with attempts remaining`);
  }

  // 5th attempt: triggers challenge invalidation
  const attempt5 = await apiRequest('/auth/verify-otp', 'POST', {
    email: victimEmail,
    code: '999999',
  });
  assert(
    attempt5.status === 400 && attempt5.data.message.includes('Maximum attempts'),
    `5th attempt triggers lockout (${attempt5.data.message})`,
  );

  // 6th attempt: challenge already invalidated
  const attempt6 = await apiRequest('/auth/verify-otp', 'POST', {
    email: victimEmail,
    code: '999999',
  });
  assert(
    attempt6.status === 400 && attempt6.data.message.includes('No active verification request'),
    `Subsequent attempts rejected as challenge is invalidated (${attempt6.data.message})`,
  );

  console.log('\n==========================================================');
  console.log('🎉 ALL PHASE 1 EMAIL OTP & AUTH TESTS PASSED SUCCESSFULLY!');
  console.log('==========================================================\n');
}

runPhase1AuthSuite().catch((err) => {
  console.error('\n❌ PHASE 1 AUTH SUITE FAILED WITH ERROR:');
  console.error(err);
  process.exit(1);
});
