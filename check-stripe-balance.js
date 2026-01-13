// Check Stripe balance (available vs pending)
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkBalance() {
  console.log('\n💰 STRIPE BALANCE CHECK\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const balance = await stripe.balance.retrieve();
    
    console.log('📊 YOUR STRIPE ACCOUNT BALANCE:\n');
    
    console.log('✅ AVAILABLE (can be used for transfers):');
    if (balance.available.length === 0) {
      console.log('   ❌ $0.00 - No available balance!');
    } else {
      balance.available.forEach(bal => {
        const amount = (bal.amount / 100).toFixed(2);
        console.log(`   💵 $${amount} ${bal.currency.toUpperCase()}`);
      });
    }
    
    console.log('\n⏳ PENDING (scheduled for payout):');
    if (balance.pending.length === 0) {
      console.log('   $0.00');
    } else {
      balance.pending.forEach(bal => {
        const amount = (bal.amount / 100).toFixed(2);
        console.log(`   💵 $${amount} ${bal.currency.toUpperCase()}`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    
    // Check if we have enough for pending transactions
    const { query } = require('./config/database');
    const pendingTx = await query(`
      SELECT SUM(seller_payout_amount) as total_needed
      FROM transactions
      WHERE verification_status IN ('payment_received', 'buyer_confirmed', 'pending_manual_transfer')
        AND payment_status = 'paid'
        AND transfer_status IS NULL
    `);
    
    const totalNeeded = pendingTx.rows[0].total_needed || 0;
    
    if (totalNeeded > 0) {
      console.log('\n💼 PENDING ESCROW TRANSFERS:\n');
      console.log(`   Total seller payouts needed: $${parseFloat(totalNeeded).toFixed(2)}`);
      
      const availableAmount = balance.available[0]?.amount || 0;
      const availableUSD = availableAmount / 100;
      
      if (availableUSD >= totalNeeded) {
        console.log(`   ✅ Sufficient balance available!`);
      } else {
        const shortfall = totalNeeded - availableUSD;
        console.log(`   ❌ Insufficient balance!`);
        console.log(`   Need additional: $${shortfall.toFixed(2)}`);
        console.log('\n💡 SOLUTION:');
        console.log('   Use test card: 4000000000000077');
        console.log('   Amount to add: $' + Math.ceil(shortfall + 100));
      }
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('\n📝 TO ADD TEST FUNDS:\n');
    console.log('   1. Go to: https://dashboard.stripe.com/test/payments');
    console.log('   2. Create payment');
    console.log('   3. Use card: 4000000000000077');
    console.log('   4. Amount: $5,000.00 (recommended)\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkBalance();

