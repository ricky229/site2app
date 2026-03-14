

export class BubbleService {
    private baseUrl: string;
    private token: string;

    constructor() {
        this.baseUrl = process.env.BUBBLE_API_URL || 'https://site2app.online/api/1.1/obj';
        this.token = process.env.BUBBLE_API_TOKEN || '59ef5eb57d786ff8eced03244342f32e';
    }

    private getHeaders(customToken?: string) {
        return {
            'Authorization': `Bearer ${customToken || this.token}`,
            'Content-Type': 'application/json'
        };
    }

    async getUserByEmail(email: string) {
        const constraints = JSON.stringify([{ key: 'emailAddress', constraint_type: 'equals', value: email }]);
        const res = await fetch(`${this.baseUrl}/user?constraints=${encodeURIComponent(constraints)}`, { headers: this.getHeaders() });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || 'Error fetching user');
        return data?.response?.results?.[0] || null;
    }

    async getUserById(id: string) {
        const res = await fetch(`${this.baseUrl}/user/${id}`, { headers: this.getHeaders() });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || 'Error fetching user');
        return data?.response || null;
    }

    async createUser(userData: any) {
        const res = await fetch(`${this.baseUrl}/user`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(userData)
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || 'Error creating user');
        return this.getUserById(data.id);
    }

    async getAppsByUser(userId: string) {
        const constraints = JSON.stringify([{ key: 'owner', constraint_type: 'equals', value: userId }]);
        const res = await fetch(`${this.baseUrl}/app?constraints=${encodeURIComponent(constraints)}&limit=100`, { headers: this.getHeaders() });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || 'Error fetching apps');
        return data?.response?.results || [];
    }

    async getAppById(appId: string) {
        const res = await fetch(`${this.baseUrl}/app/${appId}`, { headers: this.getHeaders() });
        const data = await res.json() as any;
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(data?.message || 'Error fetching app');
        return data?.response || null;
    }

    async createApp(appData: any) {
        const res = await fetch(`${this.baseUrl}/app`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(appData)
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || 'Error creating app');
        return this.getAppById(data.id);
    }

    async updateApp(appId: string, appData: any) {
        const res = await fetch(`${this.baseUrl}/app/${appId}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(appData)
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || 'Error updating app');
        return true;
    }

    async updateUser(userId: string, userData: any) {
        // Sanitize URLs in userData if they start with double https
        if (userData.bubbleApiUrl && typeof userData.bubbleApiUrl === 'string') {
            userData.bubbleApiUrl = userData.bubbleApiUrl.replace(/https?:\/\/https?:\/\//g, 'https://');
        }

        const res = await fetch(`${this.baseUrl}/user/${userId}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify(userData)
        });

        if (res.status === 404) throw new Error(`User ${userId} not found in Bubble`);
        
        const data = await res.json() as any;
        if (!res.ok) {
            console.error('[Bubble] PATCH Error:', JSON.stringify(data));
            throw new Error(data?.message || data?.error || 'Error updating user');
        }
        return true;
    }

    async deleteApp(appId: string) {
        const res = await fetch(`${this.baseUrl}/app/${appId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        if (!res.ok) throw new Error('Error deleting app');
        return true;
    }

    async getDevicesByApp(appId?: string, customUrl?: string, customToken?: string) {
        let url = `${customUrl || this.baseUrl}/device`;
        if (appId && appId !== 'all') {
            const constraints = JSON.stringify([{ key: 'buildId', constraint_type: 'equals', value: appId }]);
            url += `?constraints=${encodeURIComponent(constraints)}`;
        }
        const res = await fetch(url, { headers: this.getHeaders(customToken) });
        const data = await res.json() as any;
        return data?.response?.results || [];
    }

    async registerDevice(deviceData: any) {
        const res = await fetch(`${this.baseUrl}/device`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(deviceData)
        });
        return res.ok;
    }

    async findDevicesByToken(token: string, customUrl?: string, customToken?: string) {
        const constraints = JSON.stringify([{ key: 'pushToken', constraint_type: 'equals', value: token }]);
        const baseUrl = customUrl || this.baseUrl;
        const res = await fetch(`${baseUrl}/device?constraints=${encodeURIComponent(constraints)}`, { headers: this.getHeaders(customToken) });
        const data = await res.json() as any;
        return data?.response?.results || [];
    }

    async upsertDevice(deviceData: any, customUrl?: string, customToken?: string) {
        const baseUrl = customUrl || this.baseUrl;
        const existing = await this.findDevicesByToken(deviceData.pushToken, baseUrl, customToken);
        if (existing.length > 0) {
            const res = await fetch(`${baseUrl}/device/${existing[0]._id}`, {
                method: 'PATCH',
                headers: this.getHeaders(customToken),
                body: JSON.stringify({
                    buildId: deviceData.buildId,
                    os: deviceData.os,
                    lastSeen: new Date().toISOString()
                })
            });
            return res.ok;
        } else {
            const res = await fetch(`${baseUrl}/device`, {
                method: 'POST',
                headers: this.getHeaders(customToken),
                body: JSON.stringify(deviceData)
            });
            return res.ok;
        }
    }

    async getPendingNotifications() {
        const constraints = JSON.stringify([{ key: 'status', constraint_type: 'equals', value: 'Pending' }]);
        const res = await fetch(`${this.baseUrl}/notification?constraints=${encodeURIComponent(constraints)}`, { headers: this.getHeaders() });
        const data = await res.json() as any;
        return data?.response?.results || [];
    }

    async createNotification(notifData: any, customUrl?: string, customToken?: string) {
        const url = `${customUrl || this.baseUrl}/notification`;
        const res = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(customToken),
            body: JSON.stringify(notifData)
        });
        const data = await res.json() as any;
        if (!res.ok) throw new Error(data?.message || 'Error creating notification');
        return data;
    }

    async updateNotificationStatus(notifId: string, status: string, sentCount: number, deliveredCount: number, customUrl?: string, customToken?: string) {
        const url = `${customUrl || this.baseUrl}/notification/${notifId}`;
        const res = await fetch(url, {
            method: 'PATCH',
            headers: this.getHeaders(customToken),
            body: JSON.stringify({
                status,
                sentCount,
                deliveredCount
            })
        });
        return res.ok;
    }
}

export const bubble = new BubbleService();
