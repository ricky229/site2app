const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

// 1. Remove bubble fallback in device syncing
content = content.replace(/\/\/ 2\. Sync to Bubble Data API \([\s\S]*?console\.error\(`\[API\] Bubble device sync failed.*?\r?\n/g, '');

// 2. Remove bubble token and custom URL parsing in device syncing
content = content.replace(/let customBubbleUrl = '';[\s\S]*?const customBubbleToken = process\.env\.BUBBLE_API_TOKEN;\r?\n/g, '');

// 3. Remove FETCH from Bubble in getDevices
content = content.replace(/\/\/ FETCH from Bubble to ensure we see everything[\s\S]*?console\.error\(`\[API\] Failed to fetch devices from Bubble.*?\r?\n/g, '');

// 4. Remove bubble fallback in group discovery (sendNotificationCore)
content = content.replace(/\/\/ ALWAYS also try to fetch from Bubble for group targets[\s\S]*?\} catch \(err: any\) \{ console\.error\(`\[CORE\] Bubble token fetch failed.*?\r?\n/g, '');

// 5. Remove Sync to Bubble (History)
content = content.replace(/\/\/ Sync to Bubble \(History\)[\s\S]*?console\.error\(`\[CORE\] Bubble History Sync Failed.*?\r?\n/g, '');

// 6. Remove getUserByEmail bubble fallback
content = content.replace(/\|\| await bubble\.getUserByEmail[\s\S]*?\.catch\(\(\) => null\)/g, '');

// 7. Remove createUser bubble fallback in register route
content = content.replace(/const existing = await bubble\.getUserByEmail[\s\S]*?const newUser = await bubble\.createUser\(\{[\s\S]*?\}\);\r?\n/g, '');
content = content.replace(/bubbleApiUrl: existingLocal\.bubbleApiUrl \|\| '',\r?\n/g, '');

// 8. Remove bubbleApiUrl from req.body destructuring and saving in /node/user/settings
content = content.replace(/, bubbleApiUrl /g, ' ');
content = content.replace(/if \(bubbleApiUrl !== undefined\) user\.bubbleApiUrl = bubbleApiUrl\r?\n/g, '');

fs.writeFileSync('src/server.ts', content, 'utf8');
console.log('Advanced cleanup done');
