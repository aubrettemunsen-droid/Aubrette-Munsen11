import { create } from 'zustand';
import { StoreSettings } from '../types';
import { INITIAL_SETTINGS } from '../data/mockData';

interface ShopState {
  settings: StoreSettings;
  setSettings: (settings: StoreSettings) => void;
  updateSettings: (settings: Partial<StoreSettings>) => void;
  isInitialized: boolean;
  setInitialized: (val: boolean) => void;
}

const getStoredSettings = (): StoreSettings => {
  const saved = localStorage.getItem('shopify_mock_settings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Automatically migrate from EUR to CNY to match the real data specification
      if (parsed.currency === 'EUR' || !parsed.currency) {
        parsed.currency = 'CNY';
        parsed.currencySymbol = '¥';
        parsed.timezone = 'GMT+8 (Beijing)';
        parsed.taxRate = 13.00;
        localStorage.setItem('shopify_mock_settings', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      // ignore
    }
  }
  return INITIAL_SETTINGS;
};

const getStoredInitialized = (): boolean => {
  return localStorage.getItem('corp_initialized') === 'true';
};

export const useShopStore = create<ShopState>((set, get) => ({
  settings: getStoredSettings(),
  setSettings: (settings) => {
    set({ settings });
    localStorage.setItem('shopify_mock_settings', JSON.stringify(settings));
  },
  updateSettings: (updated) => {
    const fresh = { ...get().settings, ...updated };
    set({ settings: fresh });
    localStorage.setItem('shopify_mock_settings', JSON.stringify(fresh));
  },
  isInitialized: getStoredInitialized(),
  setInitialized: (val) => {
    set({ isInitialized: val });
    localStorage.setItem('corp_initialized', val ? 'true' : 'false');
  },
}));

