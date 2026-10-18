import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAuth } from '@clerk/expo';
import {
  useRegisterPushToken,
  useUnregisterPushToken,
} from '@workspace/api-client-react';

const PUSH_TOKEN_KEY = '@digital-city/push-token:v1';

export type PushSetupIssue =
  | 'unsupported'
  | 'sign-in'
  | 'project-id'
  | 'permission'
  | 'permission-settings';

export class PushSetupError extends Error {
  constructor(readonly issue: PushSetupIssue, message: string) {
    super(message);
    this.name = 'PushSetupError';
  }
}

function getProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  );
}

export function usePushRegistration() {
  const { isLoaded, isSignedIn } = useAuth();
  const register = useRegisterPushToken();
  const unregister = useUnregisterPushToken();

  const enablePush = async (): Promise<string> => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      throw new PushSetupError('unsupported', 'Push xabarnomalar faqat iOS va Android ilovalarida ishlaydi.');
    }
    if (!isLoaded || !isSignedIn) {
      throw new PushSetupError('sign-in', 'Xabarnomalarni yoqish uchun avval hisobga kiring.');
    }
    const projectId = getProjectId();
    if (!projectId) {
      throw new PushSetupError('project-id', 'Push xabarnomalar uchun EAS loyiha identifikatori sozlanmagan.');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Bildirishnomalar',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      if (!permission.canAskAgain) {
        throw new PushSetupError('permission-settings', 'Xabarnoma ruxsatini qurilma sozlamalaridan yoqing.');
      }
      permission = await Notifications.requestPermissionsAsync();
    }
    if (permission.status !== 'granted') {
      throw new PushSetupError(
        permission.canAskAgain ? 'permission' : 'permission-settings',
        'Xabarnoma yuborish uchun ruxsat kerak.',
      );
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform = Platform.OS as 'ios' | 'android';
    await register.mutateAsync({
      data: { expoPushToken: token.data, platform },
    });
    try {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
    } catch (error) {
      // Avoid leaving a server registration behind if the device cannot persist
      // the token needed to revoke it later.
      await unregister.mutateAsync({ data: { expoPushToken: token.data } }).catch(() => undefined);
      throw error;
    }
    return token.data;
  };

  const disablePush = async (): Promise<void> => {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await unregister.mutateAsync({ data: { expoPushToken: token } });
    }
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  };

  return {
    enablePush,
    disablePush,
    isBusy: register.isPending || unregister.isPending,
  };
}
