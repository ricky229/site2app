// ===== USER TYPES =====
export interface User {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
    role: 'user' | 'admin';
    emailVerified: boolean;
    createdAt: string;
    appsCount: number;
    downloadsCount: number;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

// ===== APP TYPES =====
export type BuildStatus = 'pending' | 'analyzing' | 'building' | 'signing' | 'uploading' | 'completed' | 'failed';
export type Platform = 'android' | 'ios' | 'both';
export type Theme = 'light' | 'dark' | 'auto';
export type Orientation = 'portrait' | 'landscape' | 'both';

export interface AppFeatures {
    pushNotifications: boolean;
    offlineMode: boolean;
    deepLinking: boolean;
    geolocation: boolean;
    camera: boolean;
    nativeShare: boolean;
    biometrics: boolean;
    fullscreen: boolean;
    pullToRefresh: boolean;
    progressBar: boolean;
    fileDownload: boolean;
    popupSupport: boolean;
    customCssJs: boolean;
    admob: boolean;
    analytics: boolean;
    otaUpdates: boolean;
}

export interface NavbarConfig {
    show: boolean;
    color: string;
    showBack: boolean;
    showHome: boolean;
    showRefresh: boolean;
    showShare: boolean;
}

export interface StatusBarConfig {
    color: string;
    style: 'light' | 'dark';
}

export interface AppConfig {
    url: string;
    name: string;
    packageName: string;
    icon?: string;
    splashScreen?: string;
    primaryColor: string;
    secondaryColor: string;
    theme: Theme;
    orientation: Orientation;
    navbar: NavbarConfig;
    statusBar: StatusBarConfig;
    features: AppFeatures;
    customCss?: string;
    customJs?: string;
    admobBannerId?: string;
    admobInterstitialId?: string;
    firebaseConfig?: FirebaseConfig;
}

export interface FirebaseConfig {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    measurementId?: string;
}

export interface SiteAnalysis {
    url: string;
    title: string;
    description: string;
    favicon?: string;
    screenshot?: string;
    colors: string[];
    pages: { url: string; title: string }[];
    ssl: boolean;
    responsive: boolean;
    performanceScore: number;
    loadTime: number;
}

export interface App {
    id: string;
    userId: string;
    name: string;
    packageName: string;
    url: string;
    icon?: string;
    config: AppConfig;
    status: BuildStatus;
    platform: Platform;
    version: string;
    buildNumber: number;
    apkUrl?: string;
    ipaUrl?: string;
    downloadCount: number;
    activeUsers: number;
    lastBuiltAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Build {
    id: string;
    appId: string;
    status: BuildStatus;
    platform: Platform;
    version: string;
    buildNumber: number;
    progress: number;
    currentStep: string;
    steps: BuildStep[];
    apkUrl?: string;
    ipaUrl?: string;
    errorMessage?: string;
    startedAt: string;
    completedAt?: string;
    estimatedDuration: number;
}

export interface BuildStep {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'done' | 'failed';
    progress: number;
    duration?: number;
    message?: string;
}

// ===== NOTIFICATION TYPES =====
export interface PushNotification {
    id: string;
    appId: string;
    title: string;
    body: string;
    image?: string;
    actionUrl?: string;
    actions?: NotificationAction[];
    segment: NotificationSegment;
    scheduledAt?: string;
    sentAt?: string;
    status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
    stats?: NotificationStats;
    createdAt: string;
}

export interface NotificationAction {
    label: string;
    url: string;
}

export interface NotificationSegment {
    target: 'all' | 'android' | 'ios' | 'custom';
    countries?: string[];
    lastActiveWithin?: number;
    customFilter?: string;
}

export interface NotificationStats {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
}

export interface NotificationTemplate {
    id: string;
    name: string;
    title: string;
    body: string;
    image?: string;
    actionUrl?: string;
}

// ===== ANALYTICS TYPES =====
export interface AnalyticsData {
    pageViews: TimeSeriesData[];
    uniqueUsers: TimeSeriesData[];
    sessions: TimeSeriesData[];
    avgSessionDuration: TimeSeriesData[];
    topPages: PageStats[];
    deviceStats: DeviceStats;
    countryStats: CountryStats[];
    retentionData: RetentionData;
}

export interface TimeSeriesData {
    date: string;
    value: number;
}

export interface PageStats {
    url: string;
    views: number;
    uniqueVisitors: number;
    avgTime: number;
    bounceRate: number;
}

export interface DeviceStats {
    android: number;
    ios: number;
}

export interface CountryStats {
    country: string;
    code: string;
    users: number;
    percentage: number;
}

export interface RetentionData {
    day1: number;
    day7: number;
    day30: number;
}

// ===== DASHBOARD TYPES =====
export interface DashboardStats {
    totalApps: number;
    totalDownloads: number;
    activeUsers: number;
    totalBuilds: number;
    pendingBuilds: number;
    storageUsed: number;
    storageLimit: number;
}

// ===== ADMIN TYPES =====
export interface AdminStats {
    totalUsers: number;
    totalApps: number;
    totalBuilds: number;
    activeBuilds: number;
    revenue: number;
    storageUsed: number;
}

// ===== PRICING TYPES =====
export interface PricingPlan {
    id: string;
    name: string;
    price: number;
    period: 'month' | 'year';
    description: string;
    features: string[];
    limitations: {
        apps: number;
        builds: number;
        storage: number;
        notifications: number;
    };
    highlighted?: boolean;
    badge?: string;
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// ===== FORM TYPES =====
export interface LoginForm {
    email: string;
    password: string;
}

export interface RegisterForm {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}

export interface CreateAppStep1 {
    url: string;
}

export interface CreateAppStep2 {
    name: string;
    packageName: string;
    icon?: File | string;
    splashScreen?: File | string;
    primaryColor: string;
    secondaryColor: string;
    theme: Theme;
    orientation: Orientation;
    navbar: NavbarConfig;
    statusBar: StatusBarConfig;
}

export interface CreateAppStep3 {
    features: AppFeatures;
    customCss?: string;
    customJs?: string;
    admobBannerId?: string;
    admobInterstitialId?: string;
}

export interface CreateAppStep5 {
    platform: Platform;
}

// ===== WIZARD STATE =====
export interface WizardState {
    currentStep: number;
    siteAnalysis?: SiteAnalysis;
    config: Partial<AppConfig>;
    platform: Platform;
}
