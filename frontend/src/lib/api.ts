/// <reference types="vite/client" />
import axios from 'axios'

// ─── Bubble.io API Configuration ─────────────────────
export const BUBBLE_BASE = 'https://site2app.online/api/1.1'
export const BUBBLE_TOKEN = '59ef5eb57d786ff8eced03244342f32e'

// Workflow API (auth, actions)
const wfApi = axios.create({
    baseURL: `${BUBBLE_BASE}/wf`,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BUBBLE_TOKEN}`,
    },
})

// Data API (CRUD on App, User, etc.)
export const dataApi = axios.create({
    baseURL: `${BUBBLE_BASE}/obj`,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BUBBLE_TOKEN}`,
    },
})

// ─── Auth Functions ──────────────────────────────────
export async function bubbleRegister(name: string, email: string, password: string) {
    const res = await wfApi.post('/register', { name, email, password })
    return res.data // { response: { user_id, name, email, plan, token } }
}

export async function bubbleLogin(email: string, password: string) {
    const res = await wfApi.post('/login', { email, password })
    return res.data
}

// ─── Data API: Apps ──────────────────────────────────
export async function getAppsByUser(userId: string) {
    const constraints = JSON.stringify([{ key: 'owner', constraint_type: 'equals', value: userId }])
    const res = await dataApi.get(`/app?constraints=${encodeURIComponent(constraints)}&sort_field=Created%20Date&descending=true`)
    return res.data?.response?.results || []
}

export async function getAppById(appId: string) {
    const res = await dataApi.get(`/app/${appId}`)
    return res.data?.response || null
}

export async function createApp(appData: any) {
    const res = await dataApi.post('/app', appData)
    return res.data
}

export async function updateApp(appId: string, appData: any) {
    const res = await dataApi.patch(`/app/${appId}`, appData)
    return res.data
}

export async function deleteApp(appId: string) {
    const res = await dataApi.delete(`/app/${appId}`)
    return res.data
}

// ─── Data API: User ──────────────────────────────────
export async function getUserById(userId: string) {
    const res = await dataApi.get(`/user/${userId}`)
    return res.data?.response || null
}

export async function updateUser(userId: string, userData: any) {
    const res = await dataApi.patch(`/user/${userId}`, userData)
    return res.data
}

export async function getDevices(appId?: string, customBaseUrl?: string) {
    let url = '/device'
    if (appId) {
        const constraints = JSON.stringify([{ key: 'buildId', constraint_type: 'equals', value: appId }])
        url += `?constraints=${encodeURIComponent(constraints)}`
    }
    try {
        if (customBaseUrl) {
            // Use the user's own Bubble URL to fetch their app's devices
            const res = await axios.get(`${customBaseUrl}${url}`, {
                headers: { 'Content-Type': 'application/json' }
            })
            return res.data?.response?.results || []
        }
        const res = await dataApi.get(url)
        return res.data?.response?.results || []
    } catch {
        return []
    }
}

// ─── Node Backend API Configuration ─────────────────
// In development: proxied via vite.config.ts /api -> localhost:4000
// In production: targets /api 
const getBaseUrl = () => {
    // In local development, use the Vite proxy
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return window.location.origin + '/node'
    }
    // In production (GitHub Pages, site2app.online, or any other host),
    // always target the real Node backend on site2app.online
    return 'https://site2app.online/node'
}

export const nodeApi = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
})

export async function publishApp(appId: string) {
    const app = await getAppById(appId);
    if (!app) throw new Error('App not found in Bubble');
    if (app.status !== 'completed' || !app.apkFile) {
        throw new Error('App not completed or missing APK');
    }

    const payload = {
        publishedVersionCode: app.versionCode || 1,
        publishedVersionName: app.versionName || `1.${app.versionCode || 1}`,
        downloadUrl: app.apkFile
    };

    try {
        const res = await updateApp(appId, payload);
        return res;
    } catch (error: any) {
        if (error.response?.data?.body?.message?.includes("Unrecognized field")) {
            throw new Error(
                "ACTION REQUISE SUR BUBBLE : Veuillez créer les champs 'publishedVersionCode' (number), 'publishedVersionName' (text) et 'downloadUrl' (text) dans votre base de données Bubble (Data Type 'app') pour activer la publication manuelle."
            );
        }
        throw error;
    }
}

nodeApi.interceptors.request.use(config => {
    const token = localStorage.getItem('site2app_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// ─── Default Export: Bubble.io (Compatibility) ───────
// Keep this targeting Bubble to avoid breaking other pages
const api = dataApi;
export default api
