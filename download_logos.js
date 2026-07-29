const fs = require('fs');
const https = require('https');
const path = require('path');

const download = (url, dest) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        };
        https.get(url, options, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 308) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
};

const logos = [
    { url: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/MTN_Logo.svg', file: 'mtn.svg' },
    { url: 'https://upload.wikimedia.org/wikipedia/fr/a/a3/Moov_Africa_logo.png', file: 'moov.png' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Orange_logo.svg', file: 'orange.svg' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Free_logo_2019.svg', file: 'free.svg' },
    { url: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Expresso_Telecom_Logo.png', file: 'expresso.png' }
];

const downloadClearbit = (domain, dest) => {
    return download(`https://logo.clearbit.com/${domain}`, dest);
}

async function main() {
    const dir = path.join(__dirname, 'frontend', 'public', 'logos');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    for (const logo of logos) {
        console.log(`Downloading ${logo.file}...`);
        try {
            await download(logo.url, path.join(dir, logo.file));
        } catch (e) {
            console.error(`Failed ${logo.file}:`, e.message);
        }
    }

    try {
        console.log(`Downloading wave.png...`);
        await downloadClearbit('wave.com', path.join(dir, 'wave.png'));
    } catch(e) { console.error('Wave failed', e.message) }

    try {
        console.log(`Downloading celtiis.png...`);
        await downloadClearbit('celtiis.bj', path.join(dir, 'celtiis.png'));
    } catch(e) { console.error('Celtiis failed', e.message) }

    console.log('Done!');
}

main();
