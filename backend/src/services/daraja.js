import axios from 'axios';

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';

let tokenCache = { token: null, expires_at: 0 };

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.expires_at - now > 60) {
    return tokenCache.token;
  }

  const auth = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const { data } = await axios.get(
    `${SANDBOX_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  tokenCache = {
    token: data.access_token,
    expires_at: now + Number(data.expires_in),
  };
  return tokenCache.token;
}

function buildPassword() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp =
    now.getFullYear() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());

  const password = Buffer.from(
    process.env.MPESA_SHORTCODE + process.env.MPESA_PASSKEY + timestamp
  ).toString('base64');

  return { password, timestamp };
}

export async function initiateSTKPush({ phone, amount, accountReference, transactionDesc }) {
  if (!/^254[0-9]{9}$/.test(phone)) {
    throw new Error('Phone must be in 254XXXXXXXXX format.');
  }
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error('Amount must be a positive integer (Daraja does not accept decimals in sandbox).');
  }

  const token = await getAccessToken();
  const { password, timestamp } = buildPassword();

  const body = {
    BusinessShortCode: process.env.MPESA_SHORTCODE,
    Password:          password,
    Timestamp:         timestamp,
    TransactionType:   'CustomerPayBillOnline',
    Amount:            amount,
    PartyA:            phone,
    PartyB:            process.env.MPESA_SHORTCODE,
    PhoneNumber:       phone,
    CallBackURL:       process.env.MPESA_CALLBACK_URL,
    AccountReference:  accountReference,
    TransactionDesc:   transactionDesc,
  };

  const { data } = await axios.post(
    `${SANDBOX_BASE}/mpesa/stkpush/v1/processrequest`,
    body,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data;
}
