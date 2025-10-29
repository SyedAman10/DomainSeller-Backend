const express = require('express');
const router = express.Router();

// Import route modules
const domainRoutes = require('./domains');
const userRoutes = require('./users');

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'DomainSeller API',
    version: '1.0.0',
    endpoints: {
      domains: '/api/domains',
      users: '/api/users'
    }
  });
});

// Mount route modules
router.use('/domains', domainRoutes);
router.use('/users', userRoutes);

module.exports = router;

