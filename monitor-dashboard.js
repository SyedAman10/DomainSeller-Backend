/**
 * Campaign Monitoring Dashboard
 * Run this script to see real-time monitoring of your campaigns
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function formatTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function formatCountdown(seconds) {
  if (seconds < 0) return 'READY NOW';
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

async function displayDashboard() {
  try {
    console.clear();
    
    // Header
    console.log(colors.bold + colors.cyan);
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + 'CAMPAIGN MONITORING DASHBOARD' + ' '.repeat(29) + '║');
    console.log('║' + ' '.repeat(25) + formatTime(new Date()) + ' '.repeat(25) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log(colors.reset);

    // Fetch dashboard data
    const dashboard = await axios.get(`${BASE_URL}/api/monitoring/dashboard`);
    const data = dashboard.data;

    // Overall Stats
    console.log(colors.bold + '\n📊 OVERALL STATISTICS' + colors.reset);
    console.log('━'.repeat(80));
    console.log(`${colors.green}Active Campaigns:${colors.reset}      ${data.stats.active_campaigns}`);
    console.log(`${colors.yellow}Draft Campaigns:${colors.reset}       ${data.stats.draft_campaigns}`);
    console.log(`${colors.blue}Emails Sent (24h):${colors.reset}     ${data.stats.emails_sent_24h}`);
    console.log(`${colors.blue}Emails Sent (7d):${colors.reset}      ${data.stats.emails_sent_7d}`);
    console.log(`${colors.cyan}Emails Queued:${colors.reset}         ${data.stats.emails_queued}`);
    console.log(`${colors.magenta}Emails Opened (7d):${colors.reset}    ${data.stats.emails_opened_7d}`);
    console.log(`${colors.magenta}Emails Clicked (7d):${colors.reset}   ${data.stats.emails_clicked_7d}`);

    // Calculate rates
    if (data.stats.emails_sent_7d > 0) {
      const openRate = ((data.stats.emails_opened_7d / data.stats.emails_sent_7d) * 100).toFixed(1);
      const clickRate = ((data.stats.emails_clicked_7d / data.stats.emails_sent_7d) * 100).toFixed(1);
      console.log(`\n${colors.green}→ Open Rate:${colors.reset}  ${openRate}%`);
      console.log(`${colors.green}→ Click Rate:${colors.reset} ${clickRate}%`);
    }

    // Next Scheduled Email
    console.log(colors.bold + '\n⏰ NEXT SCHEDULED EMAIL' + colors.reset);
    console.log('━'.repeat(80));
    if (data.nextEmail) {
      const countdown = formatCountdown(data.nextEmail.seconds_until_send);
      console.log(`${colors.cyan}Campaign:${colors.reset}     ${data.nextEmail.campaign_name}`);
      console.log(`${colors.cyan}Domain:${colors.reset}       ${data.nextEmail.domain_name}`);
      console.log(`${colors.cyan}Recipient:${colors.reset}    ${data.nextEmail.buyer_email}`);
      console.log(`${colors.cyan}Scheduled:${colors.reset}    ${formatTime(data.nextEmail.scheduled_for)}`);
      console.log(`${colors.yellow}Countdown:${colors.reset}    ${countdown}`);
    } else {
      console.log(`${colors.yellow}No emails scheduled${colors.reset}`);
    }

    // Active Campaigns
    const activeCampaigns = await axios.get(`${BASE_URL}/api/monitoring/campaigns/active`);
    console.log(colors.bold + '\n🚀 ACTIVE CAMPAIGNS' + colors.reset);
    console.log('━'.repeat(80));
    
    if (activeCampaigns.data.campaigns.length > 0) {
      activeCampaigns.data.campaigns.slice(0, 5).forEach(campaign => {
        console.log(`\n${colors.bold}${campaign.campaign_name}${colors.reset} (${campaign.domain_name})`);
        console.log(`  Status: ${colors.green}${campaign.status}${colors.reset}`);
        console.log(`  Sent: ${campaign.emails_sent} | Queued: ${campaign.emails_queued}`);
        console.log(`  Opened: ${campaign.emails_opened} | Clicked: ${campaign.emails_clicked}`);
        if (campaign.next_email_at) {
          console.log(`  Next: ${formatTime(campaign.next_email_at)}`);
        }
      });
    } else {
      console.log(`${colors.yellow}No active campaigns${colors.reset}`);
    }

    // Recent Activity
    console.log(colors.bold + '\n📜 RECENT ACTIVITY' + colors.reset);
    console.log('━'.repeat(80));
    if (data.recentActivity.length > 0) {
      data.recentActivity.slice(0, 5).forEach(activity => {
        console.log(`${colors.blue}•${colors.reset} ${formatTime(activity.activity_time)} - Email sent to ${activity.buyer_email}`);
        console.log(`  Campaign: ${activity.campaign_name} (${activity.domain_name})`);
      });
    } else {
      console.log(`${colors.yellow}No recent activity${colors.reset}`);
    }

    // Queue Status
    const queueStatus = await axios.get(`${BASE_URL}/api/monitoring/queue/status`);
    console.log(colors.bold + '\n⚙️  EMAIL QUEUE STATUS' + colors.reset);
    console.log('━'.repeat(80));
    console.log(`${colors.green}Ready to Send:${colors.reset}  ${queueStatus.data.queue.ready_to_send}`);
    console.log(`${colors.yellow}Waiting:${colors.reset}        ${queueStatus.data.queue.waiting}`);
    console.log(`${colors.blue}Completed:${colors.reset}      ${queueStatus.data.queue.completed}`);
    console.log(`${colors.red}Failed:${colors.reset}         ${queueStatus.data.queue.failed}`);
    console.log(`${colors.cyan}Next Check:${colors.reset}     ${formatTime(queueStatus.data.nextCheck)}`);

    // Footer
    console.log('\n' + '━'.repeat(80));
    console.log(`${colors.cyan}Press Ctrl+C to exit | Auto-refresh: 30 seconds${colors.reset}`);
    
  } catch (error) {
    console.error(`${colors.red}Error fetching dashboard data:${colors.reset}`, error.message);
  }
}

// Run dashboard
console.log('Starting Campaign Monitoring Dashboard...\n');
displayDashboard();

// Auto-refresh every 30 seconds
setInterval(displayDashboard, 30000);

