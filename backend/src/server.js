
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter       from './routes/auth.js';
import propertiesRouter from './routes/properties.js';
import unitsRouter      from './routes/units.js';
import tenantsRouter    from './routes/tenants.js';
import vacantUnitsRouter  from './routes/vacantUnits.js';
import dashboardRouter    from './routes/dashboard.js';
import reportsRouter      from './routes/reports.js';
import paymentsRouter     from './routes/payments.js';
import mpesaRouter        from './routes/mpesa.js';
import tenantRouter       from './routes/tenant.js';
import requestsRouter      from './routes/requests.js';
import applicationsRouter  from './routes/applications.js';

const app = express();
const PORT = process.env.PORT ?? 5000;

app.use(cors({
    origin: ['http://localhost:5173', process.env.FRONTEND_URL], // Allow both local and live frontend URLs
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true // Important if you are using cookies/sessions
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.use('/api/auth',       authRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/properties/:propertyId/units', unitsRouter);
app.use('/api/tenants',    tenantsRouter);
app.use('/api/units',      vacantUnitsRouter);
app.use('/api/dashboard',  dashboardRouter);
app.use('/api/reports',    reportsRouter);
app.use('/api/payments',   paymentsRouter);
app.use('/api/mpesa',      mpesaRouter);
app.use('/api/tenant',     tenantRouter);
app.use('/api/requests',      requestsRouter);
app.use('/api/applications',  applicationsRouter);



