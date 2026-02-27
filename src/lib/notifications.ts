import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

type UpsertPushTokenFn = (args: {
  expoPushToken: string;
  platform: "ios" | "android";
}) => Promise<unknown>;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  const easProjectId = Constants.easConfig?.projectId;
  if (easProjectId) return easProjectId;

  const configProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof configProjectId === "string" ? configProjectId : null;
}

function isExpoGo() {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

export async function requestPushPermissionAsync() {
  const current = await Notifications.getPermissionsAsync();
  if (
    current.granted ||
    current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function getExpoPushTokenAsync(options?: {
  requestPermission?: boolean;
}) {
  if (isExpoGo()) {
    console.warn(
      "Push registration skipped: use a development or EAS build (Expo Go is not supported)."
    );
    return null;
  }

  if (!Device.isDevice) {
    console.warn("Push registration skipped: physical device is required.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("general", {
      name: "General",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#000000",
    });
  }

  if (options?.requestPermission === false) {
    const permissions = await Notifications.getPermissionsAsync();
    const granted =
      permissions.granted ||
      permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) return null;
  } else {
    const granted = await requestPushPermissionAsync();
    if (!granted) return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn("Push registration skipped: missing EAS projectId in app config.");
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function registerPushTokenForCurrentUser(
  upsertPushToken: UpsertPushTokenFn
) {
  try {
    const expoPushToken = await getExpoPushTokenAsync({ requestPermission: true });
    if (!expoPushToken) return null;

    const platform: "ios" | "android" = Platform.OS === "ios" ? "ios" : "android";
    await upsertPushToken({ expoPushToken, platform });
    return expoPushToken;
  } catch (error) {
    console.warn("Push token registration failed:", error);
    return null;
  }
}

export async function handleInitialNotificationTap(
  onTapped: (response: Notifications.NotificationResponse) => void
) {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;

  try {
    onTapped(response);
  } finally {
    await Notifications.clearLastNotificationResponseAsync();
  }
}

export function registerNotificationListeners(options: {
  onReceived?: (notification: Notifications.Notification) => void;
  onTapped?: (response: Notifications.NotificationResponse) => void;
}) {
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      options.onReceived?.(notification);
    }
  );

  const tappedSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      options.onTapped?.(response);
    }
  );

  return () => {
    receivedSub.remove();
    tappedSub.remove();
  };
}
