

const PAYDUNYA_MASTER_KEY = '9EP7O99O-7vgX-9Dat-n5Jm-mSL6O2rSJwyi';
const PAYDUNYA_PRIVATE_KEY = 'test_private_hvGifT44KLfDAJgF6ba5GQxol5g';
const PAYDUNYA_TOKEN = '6IhlkvOlNa79J5A7Ce5A';

const payload = {
  invoice: {
    total_amount: 25000,
    description: 'Test invoice'
  },
  store: {
    name: 'Site2App'
  },
  custom_data: {
    userId: 'test_user',
    plan: 'yearly'
  },
  actions: {
    cancel_url: 'https://site2app.online/dashboard/pricing',
    return_url: 'https://site2app.online/dashboard',
    callback_url: 'https://us-central1-site2app-ba735.cloudfunctions.net/api/api/payment/webhook'
  }
};

async function test() {
  try {
    const response = await fetch('https://app.paydunya.com/sandbox-api/v1/checkout-invoice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
        'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
        'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
        'PAYDUNYA-MODE': 'test'
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (err) {
    console.error(err);
  }
}

test();
