import fetch from 'node-fetch';

// Test exact same payload as Step5Build.tsx sends
const testApp = async () => {
    const BUBBLE_TOKEN = '59ef5eb57d786ff8eced03244342f32e';
    
    // This is exactly what Step5Build sends now (after fix)
    const appData = {
        appName: 'TestApp',
        url: 'https://example.com',
        platform: 'android',
        packageName: 'com.site2app.testapp.999999',
        themeColor: '#3461f5',
        splashBgColor: '#3461f5',
        orientation: 'portrait',
        enableFullscreen: false,
        status: 'building',
        versionCode: 1,
        versionName: '1.0',
        icon: ""
        // NO owner, NO splashScreen
    };

    console.log("=== TEST 1: POST (createApp) without owner ===");
    try {
        const res = await fetch('https://site2app.online/api/1.1/obj/app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BUBBLE_TOKEN}`,
            },
            body: JSON.stringify(appData)
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
        
        if (res.status === 201) {
            const data = JSON.parse(text);
            const newId = data.id;
            console.log(`\n=== TEST 2: PATCH (updateApp) same payload on ${newId} ===`);
            const patchRes = await fetch(`https://site2app.online/api/1.1/obj/app/${newId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${BUBBLE_TOKEN}`,
                },
                body: JSON.stringify(appData)
            });
            console.log(`Status: ${patchRes.status}`);
            console.log(`Response: ${await patchRes.text()}`);
            
            // Cleanup: delete test app
            console.log(`\n=== CLEANUP: DELETE ${newId} ===`);
            const delRes = await fetch(`https://site2app.online/api/1.1/obj/app/${newId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}` }
            });
            console.log(`Delete Status: ${delRes.status}`);
        }
    } catch(err) {
        console.error(err);
    }
    
    // Test with owner = real user ID from existing app
    console.log("\n=== TEST 3: POST with REAL owner (from existing app) ===");
    try {
        const realOwner = '1773303671790x329603089340145340'; // from BATHOS PRO
        const res = await fetch('https://site2app.online/api/1.1/obj/app', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${BUBBLE_TOKEN}`,
            },
            body: JSON.stringify({...appData, owner: realOwner})
        });
        const text = await res.text();
        console.log(`Status: ${res.status}`);
        console.log(`Response: ${text}`);
        if (res.status === 201) {
            const data = JSON.parse(text);
            // Cleanup
            await fetch(`https://site2app.online/api/1.1/obj/app/${data.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${BUBBLE_TOKEN}` }
            });
            console.log("Cleaned up.");
        }
    } catch(err) {
        console.error(err);
    }
};

testApp();
