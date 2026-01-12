const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { startEmailQueue } = require('./services/emailQueue');

// Import routes
const campaignRoutes = require('./routes/campaigns');
const webhookRoutes = require('./routes/webhooks');
const monitoringRoutes = require('./routes/monitoring');
const inboundRoutes = require('./routes/inbound');
const escrowRoutes = require('./routes/escrow');
const stripeRoutes = require('./routes/stripe');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const domainRoutes = require('./routes/domains');
const referralRoutes = require('./routes/referrals');
const leadRoutes = require('./routes/leads');
const chatbotRoutes = require('./routes/chatbot');
const adminRoutes = require('./routes/admin');
const buyerRoutes = require('./routes/buyer');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// HARDCODED allowed origins - no env issues!
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://3vltn.com',
  'http://3vltn.com',
  'https://api.3vltn.com',
  'https://3-vltn-dashboard.vercel.app'
];

console.log('🌐 CORS Allowed Origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️  CORS blocked origin: ${origin}`);
      console.warn(`   Allowed: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// CORS debugging middleware
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('🔍 CORS PREFLIGHT REQUEST DETECTED');
    console.log(`   Origin: ${req.headers.origin}`);
    console.log(`   Method: ${req.headers['access-control-request-method']}`);
    console.log(`   Headers: ${req.headers['access-control-request-headers']}`);
  }

  // Log response headers being sent
  const originalSend = res.send;
  res.send = function (data) {
    if (req.method === 'OPTIONS') {
      console.log('📤 CORS PREFLIGHT RESPONSE HEADERS:');
      console.log(`   Access-Control-Allow-Origin: ${res.getHeader('Access-Control-Allow-Origin')}`);
      console.log(`   Access-Control-Allow-Methods: ${res.getHeader('Access-Control-Allow-Methods')}`);
      console.log(`   Access-Control-Allow-Headers: ${res.getHeader('Access-Control-Allow-Headers')}`);
    }
    originalSend.call(this, data);
  };

  next();
});

// Stripe webhook route MUST be registered BEFORE body parser
// It needs raw body for signature verification
app.use('/backend/stripe/webhook', 
  express.raw({ type: 'application/json' }), 
  require('./routes/stripe')
);
app.use('/stripe/webhook', 
  express.raw({ type: 'application/json' }), 
  require('./routes/stripe')
);

// Body parser for all other routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log('\n' + '='.repeat(60));
  console.log(`📥 ${req.method} ${req.path}`);
  console.log(`⏰ ${timestamp}`);
  console.log(`🌍 Origin: ${req.headers.origin || 'No origin header'}`);
  console.log(`🔑 Host: ${req.headers.host}`);

  if (Object.keys(req.query).length > 0) {
    console.log('📋 Query:', JSON.stringify(req.query, null, 2));
  }

  if (Object.keys(req.params).length > 0) {
    console.log('🎯 Params:', JSON.stringify(req.params, null, 2));
  }

  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
  }

  console.log('='.repeat(60));
  next();
});

// Health check endpoints (both root and /backend for flexibility)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Campaign Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/backend/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Campaign Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes (with /backend prefix for Nginx)
app.use('/backend/campaigns', campaignRoutes);
app.use('/backend/webhooks', webhookRoutes);
app.use('/backend/monitoring', monitoringRoutes);
app.use('/backend/inbound', inboundRoutes);
app.use('/backend/escrow', escrowRoutes);
// Stripe routes registered below with special handling for webhooks
app.use('/backend/users', userRoutes);
app.use('/backend/analytics', analyticsRoutes);
app.use('/backend/domains', domainRoutes);
app.use('/backend/referrals', referralRoutes);
app.use('/backend/leads', leadRoutes);
app.use('/backend/chatbot', chatbotRoutes);
app.use('/backend/admin', adminRoutes);
app.use('/backend/buyer', buyerRoutes);

// Buyer routes without prefix (for email links)
app.use('/buyer', buyerRoutes);

// Mailgun webhook routes (must be accessible without prefix for webhooks)
app.use('/inbound', inboundRoutes);
app.use('/webhooks', webhookRoutes);

// Escrow webhook route (must be accessible without prefix)
app.use('/escrow', escrowRoutes);

// Stripe routes - webhook already registered above with raw body parser
// This handles all OTHER stripe routes (not /webhook)
app.use('/backend/stripe', stripeRoutes);
app.use('/stripe', stripeRoutes);

// 404 handler
app.use((req, res) => {
  console.error('❌ 404 NOT FOUND:');
  console.error(`   Path: ${req.method} ${req.path}`);
  console.error(`   Origin: ${req.headers.origin}`);
  console.error(`   Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);

  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'POST /backend/campaigns',
      'GET /backend/campaigns',
      'GET /backend/campaigns/:id',
      'PUT /backend/campaigns/:id',
      'DELETE /backend/campaigns/:id',
      'POST /backend/campaigns/send-batch',
      'GET /backend/health',
      'GET /backend/monitoring/dashboard',
      'GET /backend/monitoring/campaigns/active'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    // Start email queue processor
    startEmailQueue();
    console.log('✅ Email queue processor started');

    // Start listening
    app.listen(PORT,"127.0.0.1" , () => {
      console.log('');
      console.log('='.repeat(50));
      console.log(`🚀 Campaign Backend Server Running`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health Check: http://localhost:${PORT}/backend/health`);
      console.log(`📧 Mailgun Domain: ${process.env.MAILGUN_DOMAIN}`);
      console.log('='.repeat(50));
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
