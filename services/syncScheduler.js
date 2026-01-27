/**
 * ============================================================
 * DOMAIN SYNC CRON JOB
 * ============================================================
 * 
 * Purpose: Continuously sync domains from registrar accounts
 * Schedule: Runs every hour (configurable)
 * 
 * Features:
 * - Auto-discover new domains
 * - Revoke verification for removed domains
 * - Keep ownership data fresh
 * - Prevent fraud and unauthorized sales
 * ============================================================
 */

const cron = require('node-cron');
const { domainSyncService } = require('./services/domainSyncService');

class RegistrarSyncScheduler {
  constructor() {
    this.jobs = [];
    this.isInitialized = false;
  }

  /**
   * Initialize and start all cron jobs
   */
  start() {
    if (this.isInitialized) {
      console.log('⚠️  Sync scheduler already initialized');
      return;
    }

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('🕐 INITIALIZING REGISTRAR SYNC SCHEDULER');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');

    // Get schedule from environment or use defaults
    const hourlySchedule = process.env.REGISTRAR_SYNC_HOURLY || '0 * * * *'; // Every hour at :00
    const dailySchedule = process.env.REGISTRAR_SYNC_DAILY || '0 2 * * *'; // Daily at 2 AM

    // JOB 1: Hourly Quick Sync (for active accounts)
    console.log('📅 Setting up hourly sync job...');
    console.log(`   Schedule: ${hourlySchedule}`);
    
    const hourlyJob = cron.schedule(hourlySchedule, async () => {
      console.log('');
      console.log('⏰ HOURLY SYNC TRIGGERED');
      console.log(`   Time: ${new Date().toISOString()}`);
      
      try {
        await domainSyncService.syncAllAccounts();
      } catch (error) {
        console.error('❌ Hourly sync failed:', error);
      }
    }, {
      scheduled: false, // Don't start immediately
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.jobs.push({ name: 'hourly-sync', job: hourlyJob, schedule: hourlySchedule });

    // JOB 2: Daily Deep Sync (all accounts, even inactive)
    console.log('📅 Setting up daily sync job...');
    console.log(`   Schedule: ${dailySchedule}`);
    
    const dailyJob = cron.schedule(dailySchedule, async () => {
      console.log('');
      console.log('⏰ DAILY DEEP SYNC TRIGGERED');
      console.log(`   Time: ${new Date().toISOString()}`);
      
      try {
        await domainSyncService.syncAllAccounts();
      } catch (error) {
        console.error('❌ Daily sync failed:', error);
      }
    }, {
      scheduled: false,
      timezone: process.env.TIMEZONE || 'UTC'
    });

    this.jobs.push({ name: 'daily-sync', job: dailyJob, schedule: dailySchedule });

    // Start all jobs
    this.jobs.forEach(({ name, job }) => {
      job.start();
      console.log(`✅ Started: ${name}`);
    });

    this.isInitialized = true;

    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('✅ REGISTRAR SYNC SCHEDULER ACTIVE');
    console.log(`   Jobs running: ${this.jobs.length}`);
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    console.log('');
    console.log('🛑 Stopping registrar sync scheduler...');
    
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      console.log(`   ✅ Stopped: ${name}`);
    });

    this.isInitialized = false;
    console.log('✅ Scheduler stopped');
    console.log('');
  }

  /**
   * Get status of all jobs
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      jobs: this.jobs.map(({ name, schedule }) => ({
        name,
        schedule,
        active: this.isInitialized
      }))
    };
  }

  /**
   * Manually trigger sync (for testing)
   */
  async triggerManualSync() {
    console.log('');
    console.log('🔧 MANUAL SYNC TRIGGERED');
    console.log(`   Time: ${new Date().toISOString()}`);
    console.log('');
    
    try {
      const results = await domainSyncService.syncAllAccounts();
      console.log('✅ Manual sync completed');
      return results;
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      throw error;
    }
  }
}

// Singleton instance
const syncScheduler = new RegistrarSyncScheduler();

module.exports = {
  RegistrarSyncScheduler,
  syncScheduler
};
