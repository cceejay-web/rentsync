import 'dotenv/config';
import { initiateSTKPush } from '../src/services/daraja.js';

const result = await initiateSTKPush({
  phone:            '254708374149',
  amount:           1,
  accountReference: 'RentSync-Test',
  transactionDesc:  'Sprint 4 verification',
});

console.log(result);
