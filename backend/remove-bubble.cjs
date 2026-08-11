const fs = require('fs');

let content = fs.readFileSync('src/server.ts', 'utf8');

// 1. Remove Bubble import
content = content.replace(/import \{ bubble \} from '\.\/services\/BubbleService\.js'\r?\n/, '');

// 2. Remove PROCESSED_BUBBLE_JSON
content = content.replace(/const PROCESSED_BUBBLE_JSON = .*\r?\n/, '');
content = content.replace(/const processedBubbleNotifs = new Set<string>\(\)\r?\n/, '');

// 3. Remove saveProcessedBubble function and usage
content = content.replace(/function saveProcessedBubble\(\) \{[\s\S]*?\}\r?\n/, '');
content = content.replace(/if \(fsSync\.existsSync\(PROCESSED_BUBBLE_JSON\)\) \{[\s\S]*?\}\r?\n/, '');

// 4. In authMiddleware, remove bubbleUser logic
content = content.replace(/let bubbleUser = null;\r?\n\s*try \{[\s\S]*?\} catch \(\w+\) \{[\s\S]*?\}\r?\n/, '');
content = content.replace(/if \(!bubbleUser && !localUser\) \{\r?\n\s*return res\.status\(401\).*?;\r?\n\s*\}/g, 'if (!localUser) { return res.status(401).json({ error: "Invalid token" }); }');
content = content.replace(/bubbleUser = bubbleUser \|\| \{\};\r?\n/g, '');

content = content.replace(/email: localUserSafe\.email \|\| bubbleUser\.email \|\| bubbleUser\.emailAddress,/g, 'email: localUserSafe.email,');
content = content.replace(/name: localUserSafe\.name \|\| bubbleUser\.name,/g, 'name: localUserSafe.name,');
content = content.replace(/plan: localUserSafe\.plan \|\| bubbleUser\.plan \|\| 'free',/g, 'plan: localUserSafe.plan || \'free\',');
content = content.replace(/role: localUserSafe\.role \|\| bubbleUser\.role \|\| 'user',/g, 'role: localUserSafe.role || \'user\',');
content = content.replace(/bubbleApiUrl: localUserSafe\.bubbleApiUrl \|\| '',\r?\n/g, '');

// 5. In /node/builds GET, remove Bubble fallback
content = content.replace(/let bubbleApp = null;\r?\n\s*try \{\r?\n\s*bubbleApp = await bubble\.getAppById[\s\S]*?if \(bubbleApp\.apkFile\) build\.downloadUrl = bubbleApp\.apkFile; \/\/ store the Bubble URL for downloading\r?\n/g, '');
content = content.replace(/if \(!build\) \{\r?\n\s*return res\.status\(404\)\.json\(\{ error: 'Build not found' \}\);\r?\n\s*\}/g, 'if (!build) return res.status(404).json({ error: "Build not found" });');

// 6. Start polling: remove the whole startPolling block
content = content.replace(/function startPolling\(\) \{[\s\S]*?setInterval\(async \(\) => \{[\s\S]*?\}\);[\s\S]*?\}\r?\n\r?\nstartPolling\(\);\r?\n/g, '');

// 7. Bubble endpoints: /node/user/bubble, /node/app/bubble_webhook, /node/build/bubble_webhook, /node/notifications/webhook
content = content.replace(/app\.post\('\/node\/user\/bubble'[\s\S]*?\}\);\r?\n/g, '');
content = content.replace(/app\.post\('\/node\/app\/bubble_webhook'[\s\S]*?\}\);\r?\n/g, '');
content = content.replace(/app\.post\('\/node\/build\/bubble_webhook'[\s\S]*?\}\);\r?\n/g, '');
content = content.replace(/const handleWebhook = async[\s\S]*?\}\r?\n\r?\napp\.all\(\['\/node\/notifications\/webhook', '\/notifications\/webhook'\], handleWebhook\);\r?\n/g, '');

fs.writeFileSync('src/server.ts', content, 'utf8');
console.log('Cleanup done');
