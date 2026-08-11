const fs = require('fs');
let content = fs.readFileSync('src/services/Builder.js', 'utf8');

// 1. Remove bubble settings in constructor
content = content.replace(/this\.bubbleApiUrl = options\.bubbleApiUrl \|\| 'https:\/\/site2app\.online\/api\/1\.1\/obj'\r?\n/, '');
content = content.replace(/this\.bubbleApiToken = options\.bubbleApiToken \|\| '59ef5eb57d786ff8eced03244342f32e'\r?\n/, '');

// 2. Remove bubble comment
content = content.replace(/\/\/ Raw base64 string \(from downloadBase64\(\) in github-build-bubble\.js which returns raw base64 without data: prefix\)/g, '// Raw base64 string');

// 3. Remove "Enregistrement direct sur Bubble" block in MainActivity.java and PushJobService.java
content = content.replace(/\/\/ 1\. Enregistrement direct sur Bubble[\s\S]*?\/\/ 2\. Enregistrement sur Node\.js/g, '// 1. Enregistrement sur Node.js');

content = content.replace(/if \(!\"[^"]*?bubbleApiUrl[^"]*?\"\s*\.isEmpty\(\)\) \{[\s\S]*?android\.util\.Log\.d\("S2A_PUSH", "Searching Bubble for old token to update\.\.\."\);[\s\S]*?\} catch \(Exception e\) \{[\s\S]*?e\.printStackTrace\(\);[\s\S]*?\}[\s\S]*?\}/g, '');

fs.writeFileSync('src/services/Builder.js', content, 'utf8');
console.log('Builder.js cleanup done');
