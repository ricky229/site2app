/// <reference types="vite/client" />
import axios from 'axios'

// ─── Bubble.io API Configuration ─────────────────────
const BUBBLE_BASE = 'https://site2app.online/api/1.1'
const BUBBLE_TOKEN = '59ef5eb57d786ff8eced03244342f32e'

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

export async function getDevices(appId?: string) {
    let url = '/device'
    if (appId) {
        const constraints = JSON.stringify([{ key: 'buildId', constraint_type: 'equals', value: appId }])
        url += `?constraints=${encodeURIComponent(constraints)}`
    }
    try {
        const res = await dataApi.get(url)
        return res.data?.response?.results || []
    } catch {
        return []
    }
}

// ─── Backend API Configuration ──────────────────────
// Locally proxied via vite.config.ts to localhost:4000
// In production, uses the same domain /api
const BACKEND_URL = '/api'

const api = axios.create({
    baseURL: BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add interceptor to include token
api.interceptors.request.use(config => {
    const token = localStorage.getItem('site2app_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

export default api
