const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();
const API_URL = 'http://localhost:4000/api/v1';

async function runAuthTests() {
  console.log('--- STARTING CHITRO MILESTONE 2 AUTH ACCEPTANCE TESTS ---');
  const timestamp = Date.now();
  const testEmail = `testuser_${timestamp}@chitro.test`;
  const testUsername = `user_${timestamp}`;
  const testPassword = 'Password123!';
  const testDisplayName = 'Test Runner';

  try {
    // 1. Test Registration
    console.log('\n[1] Testing Registration (POST /auth/register)...');
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        username: testUsername,
        displayName: testDisplayName,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    console.log('Registration response:', regData);
    if (!regRes.ok || !regData.success) {
      throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
    }
    console.log('✓ Registration succeeded, OTP challenge issued.');

    // 2. Test Unverified User Login Attempt
    console.log('\n[2] Testing Unverified User Login (should return isVerified: false)...');
    const unverifiedLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testEmail,
        password: testPassword,
      }),
    });
    const unverifiedLoginData = await unverifiedLoginRes.json();
    console.log('Unverified login response:', unverifiedLoginData);
    if (unverifiedLoginData.isVerified !== false) {
      throw new Error('Unverified user was unexpectedly allowed to log in!');
    }
    console.log('✓ Unverified user blocked from full session access.');

    // 3. Test Invalid OTP verification
    console.log('\n[3] Testing Invalid OTP rejection (POST /auth/verify-otp with 000000)...');
    const invalidOtpRes = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: '000000',
      }),
    });
    const invalidOtpData = await invalidOtpRes.json();
    console.log('Invalid OTP response status:', invalidOtpRes.status, invalidOtpData.message);
    if (invalidOtpRes.ok) {
      throw new Error('Invalid OTP was unexpectedly accepted!');
    }
    console.log('✓ Invalid OTP properly rejected.');

    // 4. Retrieve stored challenge and calculate code or test resend cooldown
    console.log('\n[4] Testing Resend Cooldown (POST /auth/resend-otp immediately)...');
    const resendRes = await fetch(`${API_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const resendData = await resendRes.json();
    console.log('Immediate resend response status:', resendRes.status, resendData.message);
    if (resendRes.ok) {
      throw new Error('Resend cooldown was bypassed!');
    }
    console.log('✓ 60-second resend cooldown strictly enforced.');

    // 5. Query OTP challenge from Neon to verify cryptographic hash storage
    console.log('\n[5] Verifying OTP challenge record in Neon PostgreSQL...');
    const challenge = await prisma.otpChallenge.findFirst({
      where: { email: testEmail, purpose: 'REGISTER', isUsed: false },
    });
    if (!challenge) {
      throw new Error('No active OTP challenge found in Neon database!');
    }
    console.log('Active challenge id:', challenge.id);
    console.log('SHA-256 CodeHash in Neon:', challenge.codeHash);
    console.log('Attempts recorded:', challenge.attempts);
    if (challenge.codeHash.length !== 64) {
      throw new Error('OTP is not stored as a 64-char SHA-256 digest!');
    }
    console.log('✓ OTP is cryptographically hashed with salt (never plaintext).');

    // 6. Test Valid OTP verification
    // Since code is hashed, let's find the valid 6-digit by comparing hash using the salt in auth.service:
    console.log('\n[6] Matching OTP code against SHA-256 hash for verification test...');
    const otpSalt = process.env.OTP_SECRET_SALT || 'chitro-otp-digest-salt-2026';
    let matchedCode = null;
    for (let i = 100000; i <= 999999; i++) {
      const codeStr = i.toString();
      const h = crypto.createHash('sha256').update(`${codeStr}:${otpSalt}`).digest('hex');
      if (h === challenge.codeHash) {
        matchedCode = codeStr;
        break;
      }
    }
    if (!matchedCode) {
      throw new Error('Could not compute matching OTP code from challenge hash');
    }
    console.log(`Computed valid OTP code: ${matchedCode}`);

    console.log('Submitting valid verification code...');
    const verifyRes = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        code: matchedCode,
      }),
    });
    const verifyData = await verifyRes.json();
    console.log('Verify response:', verifyData.message, 'User:', verifyData.user?.displayName);
    if (!verifyRes.ok || !verifyData.accessToken) {
      throw new Error(`Verification failed: ${JSON.stringify(verifyData)}`);
    }
    console.log('✓ Account verified and JWT access token received.');

    // 7. Test Verified Login
    console.log('\n[7] Testing Login with verified account...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: testUsername,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    console.log('✓ Verified user logged in successfully with token.');

    // 8. Test Protected Route (/auth/me)
    console.log('\n[8] Testing Protected Profile Route (GET /auth/me)...');
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${loginData.accessToken}`,
      },
    });
    const meData = await meRes.json();
    console.log('Profile retrieved:', meData.user?.email, 'Verified:', meData.user?.isVerified);
    if (!meRes.ok || meData.user?.email !== testEmail) {
      throw new Error(`Profile check failed: ${JSON.stringify(meData)}`);
    }
    console.log('✓ Protected route authenticated via JWT Guard.');

    console.log('\n===========================================================');
    console.log(' ALL MILESTONE 2 AUTHENTICATION ACCEPTANCE GATES PASSED! ');
    console.log('===========================================================');
  } finally {
    await prisma.$disconnect();
  }
}

runAuthTests().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
