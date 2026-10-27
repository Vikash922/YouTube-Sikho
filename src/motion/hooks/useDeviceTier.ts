import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { DeviceTier } from '../context/MotionContext';

export interface DeviceTierResult {
  tier: DeviceTier;
  isPowerSaver: boolean;
}

function detectInitialTier(): DeviceTier {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    const nav = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
    const memory = nav.deviceMemory;
    const cores = nav.hardwareConcurrency;

    if (typeof memory === 'number' && memory < 3) {
      return 'low';
    }
    if (typeof cores === 'number' && cores <= 2) {
      return 'low';
    }
    if ((typeof memory === 'number' && memory < 4) || (typeof cores === 'number' && cores <= 4)) {
      return 'medium';
    }
  }
  return 'high';
}

export function useDeviceTier(): DeviceTierResult {
  const [tier, setTier] = useState<DeviceTier>(detectInitialTier);
  const [isPowerSaver, setIsPowerSaver] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
      const nav = navigator as unknown as {
        getBattery?: () => Promise<{
          charging: boolean;
          level: number;
          addEventListener: (type: string, listener: () => void) => void;
          removeEventListener: (type: string, listener: () => void) => void;
        }>;
      };

      if (typeof nav.getBattery === 'function') {
        let isMounted = true;
        nav
          .getBattery()
          .then((battery) => {
            if (!isMounted) return;
            const updateBatteryStatus = () => {
              const lowBattery = !battery.charging && battery.level <= 0.2;
              setIsPowerSaver(lowBattery);
              if (lowBattery) {
                setTier('low');
              }
            };

            updateBatteryStatus();
            battery.addEventListener('chargingchange', updateBatteryStatus);
            battery.addEventListener('levelchange', updateBatteryStatus);
          })
          .catch(() => {
            // Ignore unsupported battery API
          });

        return () => {
          isMounted = false;
        };
      }
    }
  }, []);

  return { tier, isPowerSaver };
}
