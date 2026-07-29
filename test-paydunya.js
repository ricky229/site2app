

const PAYDUNYA_MASTER_KEY = '9EP7O99O-7vgX-9Dat-n5Jm-mSL6O2rSJwyi';
const PAYDUNYA_PRIVATE_KEY = 'test_private_hvGifT44KLfDAJgF6ba5GQxol5g';
const PAYDUNYA_TOKEN = '6IhlkvOlNa79J5A7Ce5A';

async function test() {
  try {
    const payload = {
      invoice: { total_amount: 25000, description: 'Test invoice' },
      store: { name: 'Site2App' }
    };
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

    const data = await response.json();
    console.log('Invoice created:', data);
    
    if (data.response_code === '00' && data.token) {
        // test softpay wave
        const wavePayload = {
            wave_senegal_fullName: "Test User",
            wave_senegal_email: "test@site2app.online",
            wave_senegal_phone: "777777777",
            wave_senegal_payment_token: data.token
        };
        const softpayRes = await fetch('https://app.paydunya.com/api/v1/softpay/wave-senegal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'PAYDUNYA-MASTER-KEY': PAYDUNYA_MASTER_KEY,
                'PAYDUNYA-PRIVATE-KEY': PAYDUNYA_PRIVATE_KEY,
                'PAYDUNYA-TOKEN': PAYDUNYA_TOKEN,
                'PAYDUNYA-MODE': 'test'
            },
            body: JSON.stringify(wavePayload)
        });
        const softpayText = await softpayRes.text();
        console.log('Softpay Wave Status:', softpayRes.status);
        console.log('Softpay Wave Body:', softpayText.substring(0, 500));
    }
  } catch (err) {
    console.error(err);
  }
}
test();
