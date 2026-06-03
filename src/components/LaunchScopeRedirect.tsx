import { Redirect } from "expo-router";
import { isMusicPromoOnlyLaunch } from "@/lib/launchScope";

/** Blocks SPK / Show Flyer stacks when the app is in Music Promo–only launch mode. */
export function LaunchScopeRedirect() {
  if (!isMusicPromoOnlyLaunch()) return null;
  return <Redirect href="/(tabs)/create" />;
}
