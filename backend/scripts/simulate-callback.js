import 'dotenv/config';
import axios from 'axios';

const [,, checkoutRequestId, mode = 'success'] = process.argv;

if (!checkoutRequestId) {
  console.error('Usage: node scripts/simulate-callback.js <CheckoutRequestID> [success|fail]');
  process.exit(1);
}
if (!['success', 'fail'].includes(mode)) {
  console.error('Mode must be "success" or "fail"');
  process.exit(1);
}

const receipt = 'DEMO' + Math.random().toString(36).substring(2, 10).toUpperCase();
const transactionDate = Number(
  new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14)
);

const body = mode === 'success'
  ? {
      Body: {
        stkCallback: {
          MerchantRequestID: 'demo-' + Date.now(),
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 0,
          ResultDesc: 'The service request is processed successfully.',
          CallbackMetadata: {
            Item: [
              { Name: 'Amount',             Value: 15000 },
              { Name: 'MpesaReceiptNumber', Value: receipt },
              { Name: 'TransactionDate',    Value: transactionDate },
              { Name: 'PhoneNumber',        Value: 254712000004 },
            ],
          },
        },
      },
    }
  : {
      Body: {
        stkCallback: {
          MerchantRequestID: 'demo-' + Date.now(),
          CheckoutRequestID: checkoutRequestId,
          ResultCode: 1032,
          ResultDesc: 'Request cancelled by user',
        },
      },
    };

try {
  const { status, data } = await axios.post(
    'http://localhost:5000/api/mpesa/callback',
    body
  );
  console.log(`Status: ${status}`);
  console.log(JSON.stringify(data, null, 2));
  console.log(`✓ Simulated ${mode} callback delivered for CheckoutRequestID ${checkoutRequestId}`);
} catch (err) {
  if (err.response) {
    console.error(`✗ Server responded with ${err.response.status}:`, err.response.data);
  } else {
    console.error('✗ Could not reach backend:', err.message);
  }
  process.exit(1);
}
