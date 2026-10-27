import { create } from 'zustand';
import Constants from 'expo-constants';
import {
  fetchRemoteConfig,
  subscribeToRemoteConfig,
  AppRemoteConfig,
} from '../services/configService';
import { clientConfig } from '../config/client.config';
import { isVersionBelow } from '../utils/semver';

interface ConfigState {
  config: AppRemoteConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  startLiveSync: () => () => void;
  isMaintenanceMode: boolean;
  isUpdateRequired: boolean;
  isSoftUpdateAvailable: boolean;
  installedVersion: string;
}

const currentAppVersion = Constants.expoConfig?.version || clientConfig.version || '1.0.0';

export const useConfigStore = create<ConfigState>((set) => ({
  config: null,
  isLoading: false,
  error: null,
  isMaintenanceMode: false,
  isUpdateRequired: false,
  isSoftUpdateAvailable: false,
  installedVersion: currentAppVersion,

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await fetchRemoteConfig();
      const isMaintenance = Boolean(config.maintenanceMode);
      const isUpdate = isVersionBelow(currentAppVersion, config.minVersion || '1.0.0');
      const isSoft = Boolean(config.latestVersion) && isVersionBelow(currentAppVersion, config.latestVersion!) && !isUpdate;

      set({
        config,
        isMaintenanceMode: isMaintenance,
        isUpdateRequired: isUpdate,
        isSoftUpdateAvailable: isSoft,
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
      const isUpdate = isVersionBelow(currentAppVersion, config.minVersion || '1.0.0');
      const isSoft = Boolean(config.latestVersion) && isVersionBelow(currentAppVersion, config.latestVersion!) && !isUpdate;

      set({
        config,
        isMaintenanceMode: isMaintenance,
        isUpdateRequired: isUpdate,
        isSoftUpdateAvailable: isSoft,
        isLoading: false,
      });
    });
  },
}));
