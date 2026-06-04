import 'dotenv/config';
import axios from 'axios';

const BASE = 'http://localhost:5000/api';

// Step 1: Login
console.log('1. Logging in as esperance@upande.com...');
let token;
try {
  const { data } = await axios.post(`${BASE}/auth/login`, {
    email: 'esperance@upande.com',
    password: 'supersecret123', // local dev only
  });
  token = data.token;
  console.log('   ✓ Logged in');
} catch (err) {
  console.error('   ✗ Login failed:', err.response?.data?.error ?? err.message);
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

// Step 2: Find first active tenant
console.log('2. Fetching active tenants...');
let tenant;
try {
  const { data } = await axios.get(`${BASE}/tenants`, { headers });
  const active = data.tenants.filter(t => t.lease_status === 'active');
  if (!active.length) {
    console.error('   ✗ No active tenants found. Add a tenant first.');
    process.exit(1);
  }
  tenant = active[0];
  console.log(`   ✓ Using: ${tenant.full_name} — ${tenant.property_name} / ${tenant.unit_number} (lease_id: ${tenant.lease_id})`);
} catch (err) {
  console.error('   ✗ Failed to fetch tenants:', err.response?.data?.error ?? err.message);
  process.exit(1);
}

// Step 3: Initiate STK Push
console.log('3. Initiating STK Push...');
let checkoutRequestId;
try {
  const { data } = await axios.post(
    `${BASE}/payments/initiate`,
    { lease_id: tenant.lease_id },
    { headers }
  );
  checkoutRequestId = data.payment.checkout_request_id;
  console.log(`   ✓ STK Push sent — CheckoutRequestID: ${checkoutRequestId}`);
  console.log(`   Payment status: ${data.payment.status}`);
} catch (err) {
  console.error('   ✗ Initiate failed:', err.response?.data?.error ?? err.message);
  process.exit(1);
}

// Step 4: Wait 2 seconds
console.log('4. Waiting 2 seconds (pending state visible in UI)...');
await new Promise(resolve => setTimeout(resolve, 2000));
console.log('   ✓ Done');

// Step 5: Simulate success callback
console.log('5. Simulating success callback...');
const receipt = 'DEMO' + Math.random().toString(36).substring(2, 10).toUpperCase();
const transactionDate = Number(
  new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14)
);
try {
  await axios.post(`${BASE}/mpesa/callback`, {
    Body: {
      stkCallback: {
        MerchantRequestID: 'demo-' + Date.now(),
        CheckoutRequestID: checkoutRequestId,
        ResultCode: 0,
        ResultDesc: 'The service request is processed successfully.',
        CallbackMetadata: {
          Item: [
            { Name: 'Amount',             Value: Math.round(Number(tenant.monthly_rent)) },
            { Name: 'MpesaReceiptNumber', Value: receipt },
            { Name: 'TransactionDate',    Value: transactionDate },
            { Name: 'PhoneNumber',        Value: 254712000004 },
          ],
        },
      },
    },
  });
  console.log(`   ✓ Callback delivered — Receipt: ${receipt}`);
} catch (err) {
  console.error('   ✗ Callback failed:', err.response?.data ?? err.message);
  process.exit(1);
}

console.log('');
console.log('✓ Full demo flow complete. The Payments page should now show "completed".');
