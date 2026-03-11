import fs from 'fs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });
const JWT_SECRET = process.env.JWT_SECRET || 'site2app_super_secret_key_2024';

const usersData = JSON.parse(fs.readFileSync('./storage/users.json', 'utf8'));
const userId = Object.keys(usersData)[0]; // Admin user
const user = usersData[userId];

const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '10y' });
fs.writeFileSync('token.txt', token, 'utf8');
