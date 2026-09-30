const fs = require('fs');
const path = require('path');

// Dynamically import compiled or source template
let getAutoTradeVerificationTemplate;
try {
  const mod = require('./dist/mail/templates/autotrade-verification.template');
  getAutoTradeVerificationTemplate = mod.getAutoTradeVerificationTemplate;
} catch (e) {
  // If not built yet, we can test after build
}

function runTemplateUnitTests() {
  console.log('--- PHASE 4: AUTOTRADE EMAIL TEMPLATE VERIFICATION ---');

  if (!getAutoTradeVerificationTemplate) {
    console.error('Template module not found in dist. Building first...');
    process.exit(1);
  }

  const testData = {
    name: 'Alex Mercer',
    otp: '849201',
    expiryMinutes: 10,
  };

  const rendered = getAutoTradeVerificationTemplate(testData);

  console.log('\n[1] Checking Subject Line...');
  if (rendered.subject === 'Verify Your AutoTrade Account') {
    console.log('✓ Subject verified:', rendered.subject);
  } else {
    throw new Error(`Unexpected subject: ${rendered.subject}`);
  }

  console.log('\n[2] Checking Placeholder Replacements in HTML...');
  const html = rendered.html;
  const unreplacedHtml = html.match(/\{\{[^}]+\}\}/g);
  if (unreplacedHtml) {
    throw new Error(`Found unreplaced placeholders in HTML: ${unreplacedHtml.join(', ')}`);
  }
  console.log('✓ No unreplaced {{...}} placeholders in HTML');

  // Verify critical content elements in HTML
  const htmlChecks = [
    { label: 'AutoTrade brand name', test: html.includes('AUTOTRADE') },
    { label: 'Tagline: GENUINE PARTS & PREMIUM CARE', test: html.includes('GENUINE PARTS &amp; PREMIUM CARE') || html.includes('GENUINE PARTS & PREMIUM CARE') },
    { label: 'Heading: Verify your account', test: html.includes('Verify your account') },
    { label: 'Personalized greeting with name', test: html.includes('Alex Mercer') },
    { label: 'Verification code OTP present', test: html.includes('849201') },
    { label: 'Expiry duration in minutes', test: html.includes('10 minutes') },
    { label: 'Security notice included', test: html.includes('Security Tip:') || html.includes('SECURITY NOTICE') },
    { label: 'Dark mode / styling meta tags', test: html.includes('color-scheme') && html.includes('max-width: 520px') },
    { label: 'Mobile responsive media query', test: html.includes('@media only screen and (max-width: 600px)') },
  ];

  htmlChecks.forEach((chk) => {
    if (chk.test) {
      console.log(`✓ ${chk.label}`);
    } else {
      throw new Error(`HTML check failed: ${chk.label}`);
    }
  });

  console.log('\n[3] Checking Plain-Text Fallback Version...');
  const text = rendered.text;
  const unreplacedText = text.match(/\{\{[^}]+\}\}/g);
  if (unreplacedText) {
    throw new Error(`Found unreplaced placeholders in text: ${unreplacedText.join(', ')}`);
  }
  console.log('✓ No unreplaced {{...}} placeholders in Plain-Text');

  const textChecks = [
    { label: 'Brand & Tagline in plain text', test: text.includes('AUTOTRADE — GENUINE PARTS & PREMIUM CARE') },
    { label: 'Personalized greeting in plain text', test: text.includes('Hello Alex Mercer,') },
    { label: 'Verification code in plain text', test: text.includes('VERIFICATION CODE: 849201') },
    { label: 'Expiry in plain text', test: text.includes('10 minutes') },
    { label: 'Security notice in plain text', test: text.includes('SECURITY NOTICE') },
  ];

  textChecks.forEach((chk) => {
    if (chk.test) {
      console.log(`✓ ${chk.label}`);
    } else {
      throw new Error(`Plain-text check failed: ${chk.label}`);
    }
  });

  // Save preview HTML file for visual verification
  const previewPath = path.join(__dirname, 'autotrade-email-preview.html');
  fs.writeFileSync(previewPath, html, 'utf8');
  console.log(`\n✓ Preview HTML generated at: ${previewPath}`);

  console.log('\n=======================================================');
  console.log(' ALL AUTOTRADE TEMPLATE UNIT TESTS PASSED (100%)');
  console.log('=======================================================\n');
}

runTemplateUnitTests();
