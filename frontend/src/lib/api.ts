import axios from 'axios'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID

const getBaseUrl = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return `http://127.0.0.1:5001/${projectId}/us-central1/api/api`
    }
    return `https://us-central1-${projectId}.cloudfunctions.net/api/api`
}

export const api = axios.create({
    baseURL: getBaseUrl(),
    headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
    const token = localStorage.getItem('site2app_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// Auth Functions
export async function apiRegister(name: string, email: string, password: string) {
    const res = await api.post('/auth/register', { name, email, password })
    return res.data
}

export async function apiLogin(email: string, password: string) {
    const res = await api.post('/auth/login', { email, password })
    return res.data
}

export async function apiGetMe() {
    const res = await api.get('/auth/me')
    return res.data
}

export async function deleteAccount() {
    const res = await api.delete('/user')
    return res.data
}

// Builds
export async function getBuilds(userId?: string, grouped = false) {
    const res = await api.get('/builds')
    const data = res.data;
    if (grouped) return data;
    
    let buildsArray: any[] = [];
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        Object.values(data).forEach((group: any) => {
            if (Array.isArray(group) && group.length > 0) {
                buildsArray.push(group[0]); 
            }
        });
    } else if (Array.isArray(data)) {
        buildsArray = data;
    }
    return buildsArray;
}

export async function getBuildStatus(appId: string) {
    const res = await api.get(`/build/${appId}/status`)
    return res.data
}

export async function publishApp(buildId: string, publishedVersionCode: number) {
    const res = await api.post(`/apps/${buildId}/publish`, { publishedVersionCode });
    return res.data;
}

export async function deleteBuild(appId: string) {
    const res = await api.delete(`/build/${appId}`)
    return res.data
}


export async function startBuild(appData: any) {
    const res = await api.post('/build', appData)
    return res.data
}

// Notifications
export async function getNotifications(appId: string) {
    const res = await api.get(`/notifications?appId=${appId}`)
    return res.data
}

export async function sendNotification(appId: string, title: string, message: string, url?: string, target?: string | string[]) {
    const res = await api.post('/notifications/send', { appId, title, message, url, target })
    return res.data
}

export async function deleteAllNotifications(appId: string) {
    const res = await api.delete(`/notifications?appId=${appId}`)
    return res.data
}

export async function deleteNotification(id: string) {
    const res = await api.delete(`/notifications/${id}`)
    return res.data
}

export async function pollNotifications(appId: string) {
    const res = await api.get(`/notifications/poll?appId=${appId}`)
    return res.data
}

// Devices
export async function getDevices(appId?: string) {
    const res = await api.get(appId ? `/devices?appId=${appId}` : '/devices')
    return res.data
}

// Analytics
export async function getAnalytics(appId: string) {
    const res = await api.get(`/analytics?appId=${appId}`)
    return res.data
}

// Stats
export async function getStats() {
    const res = await api.get('/stats')
    return res.data
}

// Settings
export async function saveFirebaseConfig(appId: string, config: any) {
    const res = await api.post(`/auth/firebase-config`, config)
    return res.data
}

// App Setup
export async function analyzeUrl(url: string) {
    const res = await api.post('/analyze', { url })
    return res.data
}

export default api
