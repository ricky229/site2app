import fetch from 'node-fetch';

const url = 'https://site2app-34905.bubbleapps.io/version-test/api/1.1/obj/user';
const token = '59ef5eb57d786ff8eced03244342f32e';

async function test() {
    try {
        console.log('Testing GET User...');
        const constraints = JSON.stringify([{ key: 'emailAddress', constraint_type: 'equals', value: 'test3@example.com' }]);
        const res = await fetch(`${url}?constraints=${encodeURIComponent(constraints)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log(res.status, await res.text());
        
        console.log('Testing POST User...');
        const res2 = await fetch(url, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: "test3@example.com",
                emailAddress: "test3@example.com",
                name: "Test 3",
                passwordHash: "dummyhash"
            })
        });
        console.log(res2.status, await res2.text());
    } catch (e) {
        console.error(e);
    }
}
test();
