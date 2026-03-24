const isEnabled = () => {
  const value = String(process.env.PORTFOLIO_DEBUG || 'true').toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
};

const portfolioLog = (...args) => {
  if (!isEnabled()) return;
  console.log('[portfolio-debug]', ...args);
};

module.exports = {
  portfolioLog
};

