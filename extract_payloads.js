const fs = require('fs');
const content = fs.readFileSync('C:/Users/pc/.gemini/antigravity/brain/89145ff5-b5d0-4546-99dd-546e562242c9/.system_generated/steps/4156/content.md', 'utf8');

const blocks = content.split('Endpoints API ');
for (let i = 1; i < blocks.length; i++) {
  const block = blocks[i];
  const urlMatch = block.match(/https:.*?api\/v1\/softpay\/[^\s\<\"\'\\]+/);
  if (!urlMatch) continue;
  const url = urlMatch[0];
  
  const payloadMatch = block.match(/Requ.*?POST HTTP.*?```javascript\s*(\{.*?\})\s*```/is);
  if (payloadMatch) {
    console.log('URL:', url);
    console.log('Payload:', payloadMatch[1]);
    console.log('----------------');
  }
}
