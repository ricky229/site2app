/// <reference types="vite/client" />
import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
})

// Request interceptor: attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('site2app_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor: handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('site2app_token')
            localStorage.removeItem('site2app_user')
            localStorage.removeItem('site2app_auth')
            if (!window.location.pathname.startsWith('/auth')) {
                window.location.href = '/auth/login'
            }
        }
        return Promise.reject(error.response?.data || error)
    }
)

export default api
