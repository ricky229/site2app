import { create } from 'zustand'
import type { WizardState, AppConfig, SiteAnalysis } from '../types'

interface WizardStore {
    state: WizardState
    setStep: (step: number) => void
    nextStep: () => void
    prevStep: () => void
    setSiteAnalysis: (analysis: SiteAnalysis) => void
    updateConfig: (updates: Partial<AppConfig>) => void
    setPlatform: (platform: 'android' | 'ios' | 'both') => void
    setState: (newState: Partial<WizardState>) => void
    reset: () => void
}

const defaultConfig: Partial<AppConfig> = {
    primaryColor: '#3461f5',
    secondaryColor: '#7c3aed',
    theme: 'auto',
    orientation: 'portrait',
    navbar: {
        show: true,
        color: '#ffffff',
        showBack: true,
        showHome: true,
        showRefresh: true,
        showShare: true,
    },
    statusBar: {
        color: '#ffffff',
        style: 'dark',
    },
    features: {
        pushNotifications: true,
        offlineMode: true,
        deepLinking: true,
        geolocation: false,
        camera: false,
        nativeShare: true,
        biometrics: false,
        fullscreen: false,
        pullToRefresh: true,
        progressBar: true,
        fileDownload: true,
        popupSupport: true,
        customCssJs: false,
        admob: false,
        analytics: true,
        otaUpdates: true,
    },
}

const initialState: WizardState = {
    currentStep: 1,
    config: defaultConfig,
    platform: 'android',
}

export const useWizardStore = create<WizardStore>((set) => ({
    state: initialState,

    setStep: (step) => set((s) => ({ state: { ...s.state, currentStep: step } })),

    nextStep: () => set((s) => ({
        state: { ...s.state, currentStep: Math.min(s.state.currentStep + 1, 5) },
    })),

    prevStep: () => set((s) => ({
        state: { ...s.state, currentStep: Math.max(s.state.currentStep - 1, 1) },
    })),

    setSiteAnalysis: (analysis) => set((s) => ({
        state: {
            ...s.state,
            siteAnalysis: analysis,
            config: {
                ...s.state.config,
                url: analysis.url,
                name: analysis.title,
                primaryColor: analysis.colors[0] || '#3461f5',
                secondaryColor: analysis.colors[1] || '#7c3aed',
                icon: analysis.favicon,
            },
        },
    })),

    updateConfig: (updates) => set((s) => ({
        state: {
            ...s.state,
            config: { ...s.state.config, ...updates },
        },
    })),

    setPlatform: (platform) => set((s) => ({
        state: { ...s.state, platform },
    })),

    setState: (newState) => set((s) => ({
        state: { ...s.state, ...newState },
    })),

    reset: () => set({ state: initialState }),
}))
