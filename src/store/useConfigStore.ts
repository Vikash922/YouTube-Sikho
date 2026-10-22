import { create } from 'zustand';
import {
  fetchRemoteConfig,
  subscribeToRemoteConfig,
  AppRemoteConfig,
} from '../services/configService';
import { clientConfig } from '../config/client.config';

interface ConfigState {
  config: AppRemoteConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  startLiveSync: () => () => void;
  isMaintenanceMode: boolean;
  isUpdateRequired: boolean;
}

// Compare semantic version strings
function isVersionLower(current: string, required: string): boolean {
  const c = current.split('.').map(Number);
  const r = required.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const curVal = c[i] || 0;
    const reqVal = r[i] || 0;
    if (curVal < reqVal) return true;
    if (curVal > reqVal) return false;
  }
  return false;
}

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,
  error: null,
  isMaintenanceMode: false,
  isUpdateRequired: false,

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await fetchRemoteConfig();
      const isMaintenance = Boolean(config.maintenanceMode);
      const isUpdate = isVersionLower(clientConfig.version, config.minVersion || '1.0.0');

      set({
        config,
        isMaintenanceMode: isMaintenance,
        isUpdateRequired: isUpdate,
        isLoading: false,
      });
    } catch (err: any) {
      set({
        isLoading: false,
        error: err.message || 'Failed to load app config',
      });
    }
  },

  startLiveSync: () => {
    return subscribeToRemoteConfig((config) => {
      const isMaintenance = Boolean(config.maintenanceMode);
      const isUpdate = isVersionLower(clientConfig.version, config.minVersion || '1.0.0');

      set({
        config,
        isMaintenanceMode: isMaintenance,
        isUpdateRequired: isUpdate,
        isLoading: false,
      });
    });
  },
}));
