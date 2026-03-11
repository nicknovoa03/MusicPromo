import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  useColorScheme,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  useWindowDimensions,
  Modal,
  Animated,
  Easing,
  PanResponder,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import * as ExpoSwiftUI from "@expo/ui/swift-ui";
import { usePostHog } from "posthog-react-native";
import { api } from "../../convex/_generated/api";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import {
  DEFAULT_LOCAL_ARTIST_PROFILE,
  DEFAULT_LOCAL_PROFILE_PREFERENCES,
  PROFILE_LINK_PLATFORMS,
  getLocalArtistProfile,
  getLocalProfilePreferences,
  setLocalArtistProfile,
  setLocalProfilePreferences,
  type ProfileLink,
  type ProfileLinkPlatform,
} from "@/lib/localProfile";
import { clearLocalOnboardingCompleted } from "@/lib/onboarding";
import { getExpoPushTokenAsync } from "@/lib/notifications";
import type { EventName } from "@/lib/analytics";
import { useLocalSession } from "@/providers/localSession";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
import {
  getIOSNativeUIPhase5Availability,
  type ExpoSwiftUIModule,
} from "@/lib/iosNativeUi";
import { sleep } from "@/lib/utils";

const PLATFORM_LABELS: Record<ProfileLinkPlatform, string> = {
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  "apple-music": "Apple Music",
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  website: "Website",
};

type DraftProfileLink = {
  platform: ProfileLinkPlatform;
  url: string;
  sortOrder: number;
};

type AspectRatioPreference = "9:16" | "1:1";
type VideoLengthPreference = 15 | 30 | 60;

const ASPECT_RATIO_OPTIONS: AspectRatioPreference[] = ["9:16", "1:1"];
const VIDEO_LENGTH_OPTIONS: VideoLengthPreference[] = [15, 30, 60];
const VIDEO_LENGTH_LABELS = VIDEO_LENGTH_OPTIONS.map((seconds) => `${seconds} sec`);

function normalizeProfileLinkPlatform(value: unknown): ProfileLinkPlatform | null {
  if (typeof value !== "string") return null;
  if ((PROFILE_LINK_PLATFORMS as readonly string[]).includes(value)) {
    return value as ProfileLinkPlatform;
  }
  return null;
}

function normalizeDraftLinks(value: unknown): DraftProfileLink[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<ProfileLinkPlatform>();
  const links: DraftProfileLink[] = [];

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const input = entry as Record<string, unknown>;
    const platform = normalizeProfileLinkPlatform(input.platform);
    if (!platform || seen.has(platform)) return;

    const url = typeof input.url === "string" ? input.url : "";
    const sortOrder =
      typeof input.sortOrder === "number" && Number.isFinite(input.sortOrder)
        ? input.sortOrder
        : index;

    seen.add(platform);
    links.push({
      platform,
      url,
      sortOrder,
    });
  });

  return links.sort((a, b) => a.sortOrder - b.sortOrder);
}

function normalizeProfileUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export default function ProfileScreen() {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, getToken, userId, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const { isLocalGuest, clearLocalSession } = useLocalSession();
  const posthog = usePostHog();
  const convexUser = useQuery(api.users.current);
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const updateProfile = useMutation(api.users.updateProfile);
  const softDeleteCurrent = useMutation(api.users.softDeleteCurrent);
  const removePushToken = useMutation(api.pushTokens.removeForCurrentUser);

  const [isBootstrappingUser, setIsBootstrappingUser] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [isPickingHero, setIsPickingHero] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [localArtistProfile, setLocalArtistProfileState] = useState(
    DEFAULT_LOCAL_ARTIST_PROFILE,
  );
  const [isLocalArtistProfileReady, setIsLocalArtistProfileReady] =
    useState(false);
  const [localProfilePreferences, setLocalProfilePreferencesState] = useState(
    DEFAULT_LOCAL_PROFILE_PREFERENCES,
  );
  const [isLocalProfilePreferencesReady, setIsLocalProfilePreferencesReady] =
    useState(false);

  const [artistNameDraft, setArtistNameDraft] = useState("");
  const [heroImageUrlDraft, setHeroImageUrlDraft] = useState<string | null>(null);
  const [avatarImageUrlDraft, setAvatarImageUrlDraft] = useState<string | null>(
    null,
  );
  const [defaultAspectRatioDraft, setDefaultAspectRatioDraft] =
    useState<AspectRatioPreference>("9:16");
  const [defaultVideoLengthDraft, setDefaultVideoLengthDraft] =
    useState<VideoLengthPreference>(15);
  const [linksDraft, setLinksDraft] = useState<DraftProfileLink[]>([]);
  const [nativeFieldSeed, setNativeFieldSeed] = useState(0);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isClosingProfileSettings, setIsClosingProfileSettings] = useState(false);
  const profileSettingsTranslateX = useRef(new Animated.Value(windowWidth)).current;
  const profileScrollY = useRef(new Animated.Value(0)).current;
  const isDarkMode = colorScheme === "dark";
  const profileBackgroundColor = isDarkMode ? colors.dark.background : colors.light.background;
  const profileSurfaceColor = isDarkMode ? colors.dark.surface : colors.light.surface;
  const profileSurfaceMutedColor = isDarkMode
    ? colors.dark.surfaceMuted
    : colors.light.surfaceMuted;
  const profileTextColor = isDarkMode ? colors.dark.text : colors.light.text;
  const profileTextSecondaryColor = isDarkMode
    ? colors.dark.textSecondary
    : colors.light.textSecondary;
  const profileBorderColor = isDarkMode ? "rgba(255,255,255,0.15)" : colors.light.border;
  const profileTopBorderColor = isDarkMode
    ? "rgba(255,255,255,0.12)"
    : "rgba(16,35,23,0.14)";
  const profileStatusBarStyle = isDarkMode ? "light" : "dark";

  useEffect(() => {
    let isActive = true;
    setIsLocalArtistProfileReady(false);

    (async () => {
      const profile = await getLocalArtistProfile();
      if (!isActive) return;
      setLocalArtistProfileState(profile);
      setIsLocalArtistProfileReady(true);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    setIsLocalProfilePreferencesReady(false);

    (async () => {
      const preferences = await getLocalProfilePreferences();
      if (!isActive) return;
      setLocalProfilePreferencesState(preferences);
      setIsLocalProfilePreferencesReady(true);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const usesLocalProfile = isLocalGuest || !isSignedIn;
  const isConvexUnavailableForSignedIn = Boolean(isSignedIn) && !isAuthenticated;

  const isProfileLoading = usesLocalProfile
    ? !isLocalArtistProfileReady || !isLocalProfilePreferencesReady
    : isConvexUnavailableForSignedIn
      ? false
      : convexUser === undefined || isBootstrappingUser || isConvexAuthLoading;

  const isGuest = usesLocalProfile
    ? true
    : convexUser?.isGuest ?? !clerkUser?.primaryEmailAddress;

  const displayName = usesLocalProfile
    ? "Guest"
    : convexUser?.name ?? clerkUser?.fullName ?? "Guest";

  const sourceArtistName = usesLocalProfile
    ? localArtistProfile.artistName
    : convexUser?.artistName ?? convexUser?.name ?? localArtistProfile.artistName ?? "";

  const sourceAvatarImageUrl = usesLocalProfile
    ? localArtistProfile.avatarImageUrl
    : convexUser?.avatarImageUrl ?? convexUser?.avatarUrl ?? localArtistProfile.avatarImageUrl ?? null;
  const sourceHeroImageUrl = usesLocalProfile
    ? localArtistProfile.heroImageUrl
    : convexUser?.heroImageUrl ?? localArtistProfile.heroImageUrl ?? null;

  const sourceLinks = useMemo(
    () =>
      normalizeDraftLinks(
        usesLocalProfile
          ? localArtistProfile.links
          : (convexUser?.links ?? localArtistProfile.links ?? []),
      ),
    [usesLocalProfile, localArtistProfile.links, convexUser?.links],
  );
  const sourceDefaultAspectRatio = usesLocalProfile
    ? localProfilePreferences.defaultAspectRatio
    : convexUser?.preferences?.defaultAspectRatio ??
      localProfilePreferences.defaultAspectRatio;
  const sourceDefaultVideoLength = usesLocalProfile
    ? localProfilePreferences.defaultVideoLength
    : convexUser?.preferences?.defaultVideoLength ??
      localProfilePreferences.defaultVideoLength;

  useEffect(() => {
    if (isProfileLoading) return;
    setArtistNameDraft(sourceArtistName);
    setHeroImageUrlDraft(sourceHeroImageUrl);
    setAvatarImageUrlDraft(sourceAvatarImageUrl);
    setDefaultAspectRatioDraft(sourceDefaultAspectRatio);
    setDefaultVideoLengthDraft(sourceDefaultVideoLength);
    setLinksDraft(sourceLinks);
    setNativeFieldSeed((prev) => prev + 1);
  }, [
    isProfileLoading,
    sourceArtistName,
    sourceHeroImageUrl,
    sourceAvatarImageUrl,
    sourceDefaultAspectRatio,
    sourceDefaultVideoLength,
    sourceLinks,
  ]);

  const track = useCallback(
    (event: EventName, props?: Record<string, string>) => {
      posthog?.capture(event, props);
    },
    [posthog],
  );

  const removePushTokenForCurrentDevice = useCallback(async () => {
    try {
      const expoPushToken = await getExpoPushTokenAsync({
        requestPermission: false,
      });
      if (!expoPushToken) return;
      await removePushToken({ expoPushToken });
    } catch (error) {
      console.warn("Failed to remove push token:", error);
    }
  }, [removePushToken]);

  const isUnauthenticatedError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    return message.includes("Unauthenticated");
  }, []);

  const isMissingConvexTemplateError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    return (
      message.includes("MissingConvexTemplate") ||
      message.includes("No JWT template exists with name: convex")
    );
  }, []);

  const ensureUserRecord = useCallback(
    async (currentConvexUser: typeof convexUser) => {
      const convexToken = await getToken({ template: "convex" });
      if (!convexToken) {
        throw new Error("MissingConvexTemplate");
      }

      if (currentConvexUser) return;

      setIsBootstrappingUser(true);
      try {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await getOrCreateUser({});
            return;
          } catch (error) {
            lastError = error;
            if (isUnauthenticatedError(error) && attempt < 2) {
              await sleep(350);
              continue;
            }
            throw error;
          }
        }
        if (lastError) throw lastError;
      } finally {
        setIsBootstrappingUser(false);
      }
    },
    [getOrCreateUser, getToken, isUnauthenticatedError],
  );

  const handleAddLink = useCallback((platform: ProfileLinkPlatform) => {
    setLinksDraft((prev) => {
      if (prev.some((link) => link.platform === platform)) return prev;
      return [
        ...prev,
        {
          platform,
          url: "",
          sortOrder: prev.length,
        },
      ];
    });
  }, []);

  const handleUpdateLinkUrl = useCallback(
    (platform: ProfileLinkPlatform, url: string) => {
      setLinksDraft((prev) => {
        const existingIndex = prev.findIndex((link) => link.platform === platform);
        if (existingIndex === -1) {
          return [
            ...prev,
            {
              platform,
              url,
              sortOrder: prev.length,
            },
          ];
        }

        return prev.map((link) =>
          link.platform === platform
            ? {
                ...link,
                url,
              }
            : link,
        );
      });
    },
    [],
  );

  const handleRemoveLink = useCallback((platform: ProfileLinkPlatform) => {
    setLinksDraft((prev) =>
      prev
        .filter((link) => link.platform !== platform)
        .map((link, index) => ({ ...link, sortOrder: index })),
    );
  }, []);

  type SaveProfileOptions = {
    includeLinks?: boolean;
    overrideArtistName?: string;
    overrideHeroImageUrl?: string | null;
    overrideAvatarImageUrl?: string | null;
  };

  const saveProfile = useCallback(
    async (options: SaveProfileOptions = {}) => {
      if (isSavingProfile || isSavingPreferences || isSigningOut || isDeleting) return;
      const includeLinks = options.includeLinks ?? true;

      setErrorText(null);
      setIsSavingProfile(true);

      try {
        const artistName = (options.overrideArtistName ?? artistNameDraft).trim();
        const nextHeroImageUrl = options.overrideHeroImageUrl ?? heroImageUrlDraft;
        const nextAvatarImageUrl = options.overrideAvatarImageUrl ?? avatarImageUrlDraft;
        const heroImageUrl = nextHeroImageUrl?.trim() ? nextHeroImageUrl.trim() : null;
        const avatarImageUrl = nextAvatarImageUrl?.trim()
          ? nextAvatarImageUrl.trim()
          : null;

        const normalizedLinks: ProfileLink[] = [];
        const invalidLinkLabels: string[] = [];
        if (includeLinks) {
          for (const link of linksDraft) {
            const trimmedUrl = link.url.trim();
            if (!trimmedUrl) continue;

            const normalizedUrl = normalizeProfileUrl(trimmedUrl);
            if (!normalizedUrl) {
              invalidLinkLabels.push(PLATFORM_LABELS[link.platform]);
              continue;
            }

            normalizedLinks.push({
              platform: link.platform,
              url: normalizedUrl,
              sortOrder: normalizedLinks.length,
            });
          }
        }

        const cached = await setLocalArtistProfile({
          artistName,
          heroImageUrl,
          avatarImageUrl,
          ...(includeLinks ? { links: normalizedLinks } : {}),
        });
        setLocalArtistProfileState(cached);

        if (usesLocalProfile) {
          // Local-only sessions persist solely to device storage.
        } else {
          await ensureUserRecord(convexUser);
          await updateProfile({
            artistName: artistName || null,
            heroImageUrl,
            avatarImageUrl,
            ...(includeLinks ? { links: normalizedLinks } : {}),
          });
        }

        if (includeLinks && invalidLinkLabels.length > 0) {
          setErrorText(
            `Saved profile, but skipped invalid link${
              invalidLinkLabels.length > 1 ? "s" : ""
            }: ${invalidLinkLabels.join(", ")}.`,
          );
        }
      } catch (error) {
        const saveError = isMissingConvexTemplateError(error)
          ? "Clerk JWT template 'convex' is missing. Configure it in Clerk, then sign out/in."
        : isUnauthenticatedError(error)
            ? "Session isn't ready yet. Please wait a moment and try again."
            : "Couldn't update profile. Please try again.";
        setErrorText(saveError);
        console.warn("Failed to save profile:", error);
      } finally {
        setIsSavingProfile(false);
      }
    },
    [
      artistNameDraft,
      heroImageUrlDraft,
      avatarImageUrlDraft,
      convexUser,
      ensureUserRecord,
      isDeleting,
      isMissingConvexTemplateError,
      isSavingProfile,
      isSavingPreferences,
      isSigningOut,
      isUnauthenticatedError,
      linksDraft,
      updateProfile,
      usesLocalProfile,
    ],
  );

  const savePreferences = useCallback(
    async (updates: Partial<{
      defaultAspectRatio: AspectRatioPreference;
      defaultVideoLength: VideoLengthPreference;
    }>) => {
      if (
        isProfileLoading ||
        isSavingPreferences ||
        isSavingProfile ||
        isSigningOut ||
        isDeleting
      ) {
        return;
      }

      setErrorText(null);
      setIsSavingPreferences(true);
      const nextPreferences = {
        defaultAspectRatio: updates.defaultAspectRatio ?? defaultAspectRatioDraft,
        defaultVideoLength: updates.defaultVideoLength ?? defaultVideoLengthDraft,
      };

      try {
        const cached = await setLocalProfilePreferences(nextPreferences);
        setLocalProfilePreferencesState(cached);

        if (!usesLocalProfile) {
          await ensureUserRecord(convexUser);
          await updateProfile({
            preferences: nextPreferences,
          });
        }

        const changedKey =
          updates.defaultAspectRatio !== undefined
            ? "default_aspect_ratio"
            : updates.defaultVideoLength !== undefined
              ? "default_video_length"
              : "multiple";
        const changedValue =
          updates.defaultAspectRatio !== undefined
            ? updates.defaultAspectRatio
            : updates.defaultVideoLength !== undefined
              ? String(updates.defaultVideoLength)
              : `${nextPreferences.defaultAspectRatio}|${nextPreferences.defaultVideoLength}`;

        track("profile_preference_updated", {
          key: changedKey,
          value: changedValue,
          mode: usesLocalProfile ? "local" : "convex",
        });
      } catch (error) {
        const preferenceError = isMissingConvexTemplateError(error)
          ? "Clerk JWT template 'convex' is missing. Configure it in Clerk, then sign out/in."
          : isUnauthenticatedError(error)
            ? "Session isn't ready yet. Please wait a moment and try again."
            : "Couldn't update preferences. Please try again.";
        setErrorText(preferenceError);
        console.warn("Failed to save preferences:", error);
      } finally {
        setIsSavingPreferences(false);
      }
    },
    [
      convexUser,
      defaultAspectRatioDraft,
      defaultVideoLengthDraft,
      ensureUserRecord,
      isDeleting,
      isMissingConvexTemplateError,
      isProfileLoading,
      isSavingPreferences,
      isSavingProfile,
      isSigningOut,
      isUnauthenticatedError,
      track,
      updateProfile,
      usesLocalProfile,
    ],
  );

  const handleNativeAspectRatioSelect = useCallback(
    (index: number) => {
      if (isProfileLoading || isSavingPreferences || isSavingProfile) return;
      const nextAspectRatio = ASPECT_RATIO_OPTIONS[index] ?? ASPECT_RATIO_OPTIONS[0];
      if (nextAspectRatio === defaultAspectRatioDraft) return;
      setDefaultAspectRatioDraft(nextAspectRatio);
      void savePreferences({ defaultAspectRatio: nextAspectRatio });
    },
    [
      defaultAspectRatioDraft,
      isProfileLoading,
      isSavingPreferences,
      isSavingProfile,
      savePreferences,
    ],
  );

  const handleNativeVideoLengthSelect = useCallback(
    (index: number) => {
      if (isProfileLoading || isSavingPreferences || isSavingProfile) return;
      const nextVideoLength = VIDEO_LENGTH_OPTIONS[index] ?? VIDEO_LENGTH_OPTIONS[0];
      if (nextVideoLength === defaultVideoLengthDraft) return;
      setDefaultVideoLengthDraft(nextVideoLength);
      void savePreferences({ defaultVideoLength: nextVideoLength });
    },
    [
      defaultVideoLengthDraft,
      isProfileLoading,
      isSavingPreferences,
      isSavingProfile,
      savePreferences,
    ],
  );

  const pickAndPersistImage = useCallback(async (fileNameFallback: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: false,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    });
    if (result.canceled || !result.assets[0]) return null;

    const picked = result.assets[0];
    return await persistPickedMediaFile({
      sourceUri: picked.uri,
      fileNameHint: picked.fileName ?? picked.uri.split("/").pop() ?? fileNameFallback,
    });
  }, []);

  const handlePickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to use an artist profile image.",
      );
      return;
    }

    setIsPickingAvatar(true);
    try {
      const persistedUri = await pickAndPersistImage("artist-avatar.jpg");
      if (!persistedUri) return;
      setAvatarImageUrlDraft(persistedUri);
      void saveProfile({ includeLinks: false, overrideAvatarImageUrl: persistedUri });
    } catch {
      Alert.alert(
        "Profile image not saved",
        "Could not load that image. Please try another one.",
      );
    } finally {
      setIsPickingAvatar(false);
    }
  }, [pickAndPersistImage, saveProfile]);

  const handlePickHero = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to use a banner image.",
      );
      return;
    }

    setIsPickingHero(true);
    try {
      const persistedUri = await pickAndPersistImage("artist-hero.jpg");
      if (!persistedUri) return;
      setHeroImageUrlDraft(persistedUri);
      void saveProfile({ includeLinks: false, overrideHeroImageUrl: persistedUri });
    } catch {
      Alert.alert(
        "Banner image not saved",
        "Could not load that image. Please try another one.",
      );
    } finally {
      setIsPickingHero(false);
    }
  }, [pickAndPersistImage, saveProfile]);

  const runSignOut = useCallback(async () => {
    setIsSigningOut(true);
    setErrorText(null);
    try {
      if (isLocalGuest) {
        await clearLocalSession();
        track("sign_out_completed", { method: "local", isGuest: "true" });
        router.replace("/(auth)/sign-in");
        return;
      }
      await removePushTokenForCurrentDevice();
      await clearLocalSession();
      await signOut();
      track("sign_out_completed", { method: "auth", isGuest: String(isGuest) });
    } catch (error) {
      console.warn("Failed to sign out:", error);
      setErrorText("Sign out failed. Please try again.");
      Alert.alert("Error", "Failed to sign out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }, [
    isLocalGuest,
    clearLocalSession,
    router,
    removePushTokenForCurrentDevice,
    signOut,
    track,
    isGuest,
  ]);

  const handleSignOut = useCallback(() => {
    track("sign_out_tapped", { isGuest: String(isGuest) });
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          void runSignOut();
        },
      },
    ]);
  }, [track, isGuest, runSignOut]);

  const runDeleteAccount = useCallback(async () => {
    setIsDeleting(true);
    setErrorText(null);
    track("account_delete_started", { isGuest: String(isGuest) });

    try {
      await removePushTokenForCurrentDevice();
      await ensureUserRecord(convexUser);
      await softDeleteCurrent({});
      await clearLocalOnboardingCompleted(userId);
      track("account_deleted", { isGuest: String(isGuest) });
      await clearLocalSession();
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error) {
      console.warn("Failed to delete account:", error);
      const deleteError = isUnauthenticatedError(error)
        ? "Session isn't ready yet. Please wait a moment and try again."
        : isMissingConvexTemplateError(error)
          ? "Clerk JWT template 'convex' is missing. Configure it in Clerk, then sign out/in."
          : "Account deletion failed. Please try again.";
      setErrorText(deleteError);
      Alert.alert("Delete failed", "We couldn't delete your account right now.");
    } finally {
      setIsDeleting(false);
    }
  }, [
    track,
    isGuest,
    convexUser,
    removePushTokenForCurrentDevice,
    ensureUserRecord,
    softDeleteCurrent,
    userId,
    clearLocalSession,
    signOut,
    router,
    isUnauthenticatedError,
    isMissingConvexTemplateError,
  ]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "Delete Account",
      "This will deactivate your account. Your project history stays recoverable for v1 support.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void runDeleteAccount();
          },
        },
      ],
    );
  }, [runDeleteAccount]);

  const linksDraftByPlatform = useMemo(() => {
    const mapping = {} as Record<ProfileLinkPlatform, string>;
    for (const platform of PROFILE_LINK_PLATFORMS) {
      mapping[platform] = "";
    }
    for (const link of linksDraft) {
      mapping[link.platform] = link.url;
    }
    return mapping;
  }, [linksDraft]);
  const nativeProfileAvailability = getIOSNativeUIPhase5Availability({
    minIOSVersion: 16,
  });
  const nativeProfileEnabledByContract = nativeProfileAvailability.enabled;
  const expoSwiftUI = nativeProfileEnabledByContract
    ? (ExpoSwiftUI as ExpoSwiftUIModule)
    : null;
  const expoSwiftUIAny = expoSwiftUI as Record<string, unknown> | null;
  const hasNativeProfileComponents = Boolean(
    expoSwiftUIAny &&
      "Host" in expoSwiftUIAny &&
      "Form" in expoSwiftUIAny &&
      "Section" in expoSwiftUIAny &&
      "LabeledContent" in expoSwiftUIAny &&
      "TextField" in expoSwiftUIAny &&
      "Picker" in expoSwiftUIAny &&
      "Button" in expoSwiftUIAny &&
      "Text" in expoSwiftUIAny,
  );
  const canUseNativeProfileSettings = false;
  const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? null;

  const heroHeight = Math.max(380, Math.min(Math.round(windowHeight * 0.5), 560));
  const heroBannerHeight = Math.max(
    240,
    Math.min(Math.round(windowWidth * 0.72), Math.round(heroHeight * 0.76)),
  );
  const heroPullDistance = profileScrollY.interpolate({
    inputRange: [-1, 0],
    outputRange: [1, 0],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const heroBannerAnimatedHeight = profileScrollY.interpolate({
    inputRange: [-1, 0],
    outputRange: [heroBannerHeight + 1, heroBannerHeight],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const heroBannerPullScale = profileScrollY.interpolate({
    inputRange: [-120, 0],
    outputRange: [1.24, 1.16],
    extrapolate: "clamp",
  });
  const heroBannerPullTranslateY = profileScrollY.interpolate({
    inputRange: [-120, 0],
    outputRange: [-8, 18],
    extrapolate: "clamp",
  });
  const heroArtistName = artistNameDraft.trim() || "Tap to add artist name";
  const actionsDisabled = isSigningOut || isDeleting;
  const profileMutationDisabled =
    isProfileLoading ||
    isSavingProfile ||
    isSavingPreferences ||
    isSigningOut ||
    isDeleting;
  const profileInputsDisabled =
    profileMutationDisabled || isPickingAvatar || isPickingHero;
  const profileSettingsDisabled = profileInputsDisabled;
  const avatarPickerVisualDisabled = profileMutationDisabled || isPickingAvatar;
  const heroPickerVisualDisabled = profileMutationDisabled || isPickingHero;
  const modalTopInset = Platform.OS === "ios" ? (insets.top > 0 ? insets.top : 44) : 0;
  const heroTopInsetOffset = 0;
  const shouldUseRNSettingsGesture = !canUseNativeProfileSettings;

  const handleOpenProfileSettings = useCallback(() => {
    if (isProfileSettingsOpen || isClosingProfileSettings) return;
    profileSettingsTranslateX.setValue(windowWidth);
    setIsProfileSettingsOpen(true);
    requestAnimationFrame(() => {
      Animated.timing(profileSettingsTranslateX, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }, [
    isProfileSettingsOpen,
    isClosingProfileSettings,
    profileSettingsTranslateX,
    windowWidth,
  ]);

  const closeProfileSettings = useCallback(() => {
    if (!isProfileSettingsOpen || isClosingProfileSettings) return;
    setIsClosingProfileSettings(true);
    Animated.timing(profileSettingsTranslateX, {
      toValue: windowWidth,
      duration: 230,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsClosingProfileSettings(false);
      setIsProfileSettingsOpen(false);
      void saveProfile({ includeLinks: canUseNativeProfileSettings });
    });
  }, [
    canUseNativeProfileSettings,
    isProfileSettingsOpen,
    isClosingProfileSettings,
    profileSettingsTranslateX,
    saveProfile,
    windowWidth,
  ]);

  const handleCloseProfileSettings = useCallback(() => {
    closeProfileSettings();
  }, [closeProfileSettings]);

  const profileSettingsPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!isProfileSettingsOpen || isClosingProfileSettings) return false;
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return (
            gestureState.dx > 6 &&
            horizontalDistance > 10 &&
            horizontalDistance > verticalDistance * 0.8
          );
        },
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          if (!isProfileSettingsOpen || isClosingProfileSettings) return false;
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return (
            gestureState.dx > 6 &&
            horizontalDistance > 10 &&
            horizontalDistance > verticalDistance * 0.8
          );
        },
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderStart: () => {
          if (!isProfileSettingsOpen || isClosingProfileSettings) return;
          profileSettingsTranslateX.stopAnimation();
        },
        onPanResponderGrant: () => {
          profileSettingsTranslateX.stopAnimation();
        },
        onPanResponderMove: (_, gestureState) => {
          const nextTranslate = Math.min(windowWidth, Math.max(0, gestureState.dx));
          profileSettingsTranslateX.setValue(nextTranslate);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (!isProfileSettingsOpen || isClosingProfileSettings) return;
          const closeDistance = Math.max(96, windowWidth * 0.24);
          if (gestureState.dx > closeDistance || gestureState.vx > 0.65) {
            closeProfileSettings();
            return;
          }
          Animated.timing(profileSettingsTranslateX, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          if (!isProfileSettingsOpen || isClosingProfileSettings) return;
          Animated.timing(profileSettingsTranslateX, {
            toValue: 0,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start();
        },
      }),
    [
      closeProfileSettings,
      isClosingProfileSettings,
      isProfileSettingsOpen,
      profileSettingsTranslateX,
      windowWidth,
    ],
  );

  useEffect(() => {
    if (!isProfileSettingsOpen) {
      profileSettingsTranslateX.setValue(windowWidth);
    }
  }, [isProfileSettingsOpen, profileSettingsTranslateX, windowWidth]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: profileBackgroundColor }]} edges={["left", "right"]}>
      {isFocused && !isProfileSettingsOpen ? <StatusBar style={profileStatusBarStyle} /> : null}
      {isProfileSettingsOpen ? (
        <Modal
          visible
          animationType="none"
          transparent
          presentationStyle="overFullScreen"
          onRequestClose={handleCloseProfileSettings}
        >
          <SafeAreaProvider>
            <View style={styles.profileSettingsModalRoot}>
              <Animated.View
                style={[
                  styles.profileSettingsAnimatedLayer,
                  { transform: [{ translateX: profileSettingsTranslateX }] },
                ]}
              >
                <SafeAreaView
                  style={[styles.profileSettingsScreen, { paddingTop: modalTopInset }]}
                  edges={[]}
                >
                  <StatusBar style={profileStatusBarStyle} />
                  <View
                    style={styles.profileSettingsHeader}
                    {...(shouldUseRNSettingsGesture
                      ? profileSettingsPanResponder.panHandlers
                      : {})}
                  >
                    <Pressable
                      onPress={handleCloseProfileSettings}
                      style={({ pressed }) => [
                        styles.profileSettingsBackButton,
                        pressed && styles.profileSettingsBackButtonPressed,
                      ]}
                      accessibilityLabel="Close edit profile"
                      accessibilityRole="button"
                    >
                      <Ionicons name="chevron-back" size={22} color={profileTextColor} />
                    </Pressable>
                    <Text style={styles.profileSettingsHeaderTitle}>Edit profile</Text>
                    <Pressable
                      onPress={handleCloseProfileSettings}
                      style={({ pressed }) => [
                        styles.profileSettingsDoneButton,
                        pressed && styles.profileSettingsDoneButtonPressed,
                      ]}
                      accessibilityLabel="Done editing profile"
                      accessibilityRole="button"
                    >
                      <Text style={styles.profileSettingsDoneText}>Done</Text>
                    </Pressable>
                  </View>
                  {canUseNativeProfileSettings && expoSwiftUI ? (
                    <expoSwiftUI.Host
                      style={styles.nativeSettingsHost}
                      useViewportSizeMeasurement
                      colorScheme={isDarkMode ? "dark" : "light"}
                    >
                      <expoSwiftUI.Form>
                        <expoSwiftUI.Section title="Identity">
                          <expoSwiftUI.LabeledContent label="Account">
                            <expoSwiftUI.Text>{displayName}</expoSwiftUI.Text>
                          </expoSwiftUI.LabeledContent>
                          {primaryEmail ? (
                            <expoSwiftUI.LabeledContent label="Email">
                              <expoSwiftUI.Text>{primaryEmail}</expoSwiftUI.Text>
                            </expoSwiftUI.LabeledContent>
                          ) : null}
                          <expoSwiftUI.LabeledContent label="Artist name">
                            <expoSwiftUI.TextField
                              key={`native-artist-name-${nativeFieldSeed}`}
                              defaultValue={artistNameDraft}
                              placeholder="Add name"
                              autocorrection={false}
                              onChangeText={setArtistNameDraft}
                            />
                          </expoSwiftUI.LabeledContent>
                          <expoSwiftUI.Button
                            disabled={profileSettingsDisabled}
                            systemImage="person.crop.circle.badge.plus"
                            onPress={() => {
                              void handlePickAvatar();
                            }}
                          >
                            {isPickingAvatar ? "Updating avatar..." : "Change avatar photo"}
                          </expoSwiftUI.Button>
                          <expoSwiftUI.Button
                            disabled={profileSettingsDisabled}
                            systemImage="photo.badge.plus"
                            onPress={() => {
                              void handlePickHero();
                            }}
                          >
                            {isPickingHero ? "Updating banner..." : "Change banner photo"}
                          </expoSwiftUI.Button>
                          <expoSwiftUI.Button
                            variant="borderedProminent"
                            disabled={profileSettingsDisabled}
                            systemImage="checkmark"
                            onPress={() => {
                              void saveProfile();
                            }}
                          >
                            {isSavingProfile ? "Saving profile..." : "Save profile changes"}
                          </expoSwiftUI.Button>
                        </expoSwiftUI.Section>

                        <expoSwiftUI.Section title="Preferences">
                          <expoSwiftUI.Picker
                            options={ASPECT_RATIO_OPTIONS}
                            selectedIndex={Math.max(
                              0,
                              ASPECT_RATIO_OPTIONS.indexOf(defaultAspectRatioDraft),
                            )}
                            label="Default aspect ratio"
                            variant="menu"
                            onOptionSelected={(event) => {
                              handleNativeAspectRatioSelect(event.nativeEvent.index);
                            }}
                          />
                          <expoSwiftUI.Picker
                            options={VIDEO_LENGTH_LABELS}
                            selectedIndex={Math.max(
                              0,
                              VIDEO_LENGTH_OPTIONS.indexOf(defaultVideoLengthDraft),
                            )}
                            label="Default video length"
                            variant="menu"
                            onOptionSelected={(event) => {
                              handleNativeVideoLengthSelect(event.nativeEvent.index);
                            }}
                          />
                        </expoSwiftUI.Section>

                        <expoSwiftUI.Section title="Profile Links">
                          {PROFILE_LINK_PLATFORMS.map((platform) => (
                            <expoSwiftUI.LabeledContent
                              key={platform}
                              label={PLATFORM_LABELS[platform]}
                            >
                              <expoSwiftUI.TextField
                                key={`native-link-${platform}-${nativeFieldSeed}`}
                                defaultValue={linksDraftByPlatform[platform] ?? ""}
                                placeholder="https://"
                                autocorrection={false}
                                keyboardType="url"
                                onChangeText={(value) => {
                                  handleUpdateLinkUrl(platform, value);
                                }}
                              />
                            </expoSwiftUI.LabeledContent>
                          ))}
                        </expoSwiftUI.Section>

                        <expoSwiftUI.Section title="Account Actions">
                          <expoSwiftUI.Button
                            disabled={actionsDisabled}
                            systemImage="rectangle.portrait.and.arrow.right"
                            onPress={handleSignOut}
                          >
                            {isSigningOut
                              ? "Signing out..."
                              : isLocalGuest
                                ? "Exit guest mode"
                                : "Sign out"}
                          </expoSwiftUI.Button>
                          {!isLocalGuest ? (
                            <expoSwiftUI.Button
                              role="destructive"
                              disabled={actionsDisabled}
                              systemImage="trash"
                              onPress={handleDeleteAccount}
                            >
                              {isDeleting ? "Deleting account..." : "Delete account"}
                            </expoSwiftUI.Button>
                          ) : null}
                        </expoSwiftUI.Section>

                        {errorText ? (
                          <expoSwiftUI.Section title="Status">
                            <expoSwiftUI.Text color={colors.accent.error}>{errorText}</expoSwiftUI.Text>
                          </expoSwiftUI.Section>
                        ) : null}
                      </expoSwiftUI.Form>
                    </expoSwiftUI.Host>
                  ) : (
                    <ScrollView
                      contentContainerStyle={styles.profileSettingsContent}
                      keyboardShouldPersistTaps="handled"
                    >
                      <View style={styles.profileSettingsIdentitySection}>
                        <View style={styles.profileSettingsAvatarRow}>
                          <View style={styles.profileSettingsAvatarOption}>
                            <Pressable
                              onPress={() => {
                                void handlePickAvatar();
                              }}
                              disabled={profileSettingsDisabled}
                              style={({ pressed }) => [
                                styles.profileSettingsAvatarButton,
                                avatarPickerVisualDisabled && styles.heroActionDisabled,
                                pressed && !profileSettingsDisabled && styles.optionChipPressed,
                              ]}
                              accessibilityLabel="Edit profile picture"
                              accessibilityRole="button"
                            >
                              {avatarImageUrlDraft ? (
                                <Image
                                  source={{ uri: avatarImageUrlDraft }}
                                  style={styles.profileSettingsMediaImage}
                                />
                              ) : (
                                <Ionicons name="person" size={42} color={colors.light.textSecondary} />
                              )}
                            </Pressable>
                            <Text style={styles.profileSettingsAvatarLabel}>Profile</Text>
                          </View>

                          <View style={styles.profileSettingsAvatarOption}>
                            <Pressable
                              onPress={() => {
                                void handlePickHero();
                              }}
                              disabled={profileSettingsDisabled}
                              style={({ pressed }) => [
                                styles.profileSettingsAvatarButton,
                                styles.profileSettingsAvatarButtonSecondary,
                                heroPickerVisualDisabled && styles.heroActionDisabled,
                                pressed && !profileSettingsDisabled && styles.optionChipPressed,
                              ]}
                              accessibilityLabel="Edit banner picture"
                              accessibilityRole="button"
                            >
                              {heroImageUrlDraft ? (
                                <Image
                                  source={{ uri: heroImageUrlDraft }}
                                  style={styles.profileSettingsMediaImage}
                                />
                              ) : (
                                <Ionicons name="image-outline" size={34} color={colors.light.textSecondary} />
                              )}
                            </Pressable>
                            <Text style={styles.profileSettingsAvatarLabel}>Banner</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.profileSettingsList}>
                        <View style={styles.profileSettingsListRow}>
                          <Text style={styles.profileSettingsListLabel}>Name</Text>
                          <TextInput
                            value={artistNameDraft}
                            onChangeText={setArtistNameDraft}
                            placeholder="Add name"
                            placeholderTextColor={colors.light.textSecondary}
                            editable={!profileSettingsDisabled}
                            onSubmitEditing={() => {
                              void saveProfile({ includeLinks: false });
                            }}
                            onBlur={() => {
                              void saveProfile({ includeLinks: false });
                            }}
                            style={styles.profileSettingsListValueInput}
                            autoCapitalize="words"
                            autoCorrect={false}
                            returnKeyType="done"
                          />
                        </View>
                      </View>
                    </ScrollView>
                  )}
              </SafeAreaView>
            </Animated.View>
            </View>
          </SafeAreaProvider>
        </Modal>
      ) : null}
        <Animated.ScrollView
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          automaticallyAdjustsScrollIndicatorInsets={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: profileScrollY } } }],
            { useNativeDriver: false },
          )}
        >
        <Animated.View
          style={[
            styles.heroShell,
            { backgroundColor: profileBackgroundColor },
            {
              minHeight: heroHeight,
              marginTop: heroTopInsetOffset,
              transform: [{ translateY: Animated.multiply(heroPullDistance, -1) }],
            },
          ]}
        >
          <Animated.View style={[styles.heroBanner, { height: heroBannerAnimatedHeight }]}>
            {heroImageUrlDraft ? (
              <Animated.Image
                source={{ uri: heroImageUrlDraft }}
                style={[
                  styles.heroBannerImage,
                  {
                    transform: [
                      { scale: heroBannerPullScale },
                      { translateY: heroBannerPullTranslateY },
                    ],
                  },
                ]}
                resizeMode="cover"
              />
            ) : (
              <Animated.View
                style={[
                  styles.heroBannerFallback,
                  { backgroundColor: profileSurfaceColor },
                  {
                    transform: [
                      { scale: heroBannerPullScale },
                      { translateY: heroBannerPullTranslateY },
                    ],
                  },
                ]}
              />
            )}
          </Animated.View>

          <View
            style={[
              styles.heroIdentityBlock,
              {
                backgroundColor: profileBackgroundColor,
                borderTopColor: profileTopBorderColor,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                void handlePickAvatar();
              }}
              disabled={profileInputsDisabled}
              style={({ pressed }) => [
                styles.heroAvatarPressable,
                profileInputsDisabled && styles.heroActionDisabled,
                pressed && !profileInputsDisabled && styles.optionChipPressed,
              ]}
              accessibilityLabel="Edit profile picture"
              accessibilityRole="button"
            >
              <View style={styles.heroAvatarFrame}>
                <View style={styles.heroAvatar}>
                  {avatarImageUrlDraft ? (
                    <Image source={{ uri: avatarImageUrlDraft }} style={styles.heroAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={52} color={profileTextSecondaryColor} />
                  )}
                </View>
                <View style={styles.heroAvatarPlaceholder}>
                  <Ionicons name="camera-outline" size={14} color={colors.dark.text} />
                </View>
              </View>
            </Pressable>

            <View style={styles.heroEditProfileActionRow}>
              <Pressable
                onPress={() => {
                  handleOpenProfileSettings();
                }}
                disabled={profileInputsDisabled}
                style={({ pressed }) => [
                  styles.heroEditProfileButton,
                  { backgroundColor: profileSurfaceMutedColor },
                  profileInputsDisabled && styles.heroActionDisabled,
                  pressed && !profileInputsDisabled && styles.optionChipPressed,
                ]}
                accessibilityLabel="Edit profile"
                accessibilityRole="button"
              >
                {isPickingAvatar ? (
                  <ActivityIndicator size="small" color={profileTextColor} />
                ) : (
                  <>
                    <Ionicons name="pencil-outline" size={15} color={profileTextColor} />
                    <Text
                      style={[styles.heroEditProfileButtonText, { color: profileTextColor }]}
                      numberOfLines={1}
                    >
                      Edit Profile
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={styles.heroIdentityTextWrap}>
              <Text
                style={[
                  styles.heroArtistName,
                  { color: profileTextColor },
                  !artistNameDraft.trim() && [
                    styles.heroArtistNamePlaceholder,
                    { color: profileTextSecondaryColor },
                  ],
                ]}
              >
                {heroArtistName}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.mainContent,
            { transform: [{ translateY: Animated.multiply(heroPullDistance, -1) }] },
          ]}
        >
          {errorText ? (
            <View style={styles.errorPanel}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.accent.error} />
              <Text style={styles.errorPanelText}>{errorText}</Text>
            </View>
          ) : null}

          {isProfileLoading ? (
            <View
              style={[
                styles.loadingCard,
                { backgroundColor: profileSurfaceColor, borderColor: profileBorderColor },
              ]}
            >
              <ActivityIndicator color={profileTextColor} />
              <Text style={[styles.loadingText, { color: profileTextSecondaryColor }]}>
                Loading profile...
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.accountSection,
              { backgroundColor: profileSurfaceColor, borderColor: profileBorderColor },
            ]}
          >
            <Text style={[styles.sectionEyebrow, { color: profileTextSecondaryColor }]}>
              Account Actions
            </Text>
            <Text style={[styles.sectionTitle, { color: profileTextColor }]}>
              Security & Session
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.actionRow,
                { backgroundColor: profileSurfaceMutedColor, borderColor: profileBorderColor },
                pressed && !actionsDisabled && styles.actionRowPressed,
              ]}
              onPress={handleSignOut}
              disabled={actionsDisabled}
              accessibilityLabel="Sign out"
              accessibilityRole="button"
            >
              <View style={styles.actionRowLeft}>
                <Ionicons name="log-out-outline" size={20} color={profileTextColor} />
                <Text style={[styles.actionText, { color: profileTextColor }]}>
                  {isLocalGuest ? "Exit Guest Mode" : "Sign Out"}
                </Text>
              </View>
              {isSigningOut ? (
                <ActivityIndicator size="small" color={profileTextSecondaryColor} />
              ) : (
                <Ionicons name="chevron-forward" size={16} color={profileTextSecondaryColor} />
              )}
            </Pressable>

            {!isLocalGuest ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionRow,
                    { backgroundColor: profileSurfaceMutedColor, borderColor: profileBorderColor },
                    pressed && !actionsDisabled && styles.deleteRowPressed,
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={actionsDisabled}
                  accessibilityLabel="Delete account"
                  accessibilityRole="button"
                >
                  <View style={styles.actionRowLeft}>
                    <Ionicons name="trash-outline" size={20} color={profileTextColor} />
                    <Text style={[styles.deleteText, { color: profileTextColor }]}>
                      Delete Account
                    </Text>
                  </View>
                  {isDeleting ? (
                    <ActivityIndicator size="small" color={profileTextColor} />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={profileTextSecondaryColor} />
                  )}
                </Pressable>

                <Text style={[styles.warningText, { color: profileTextSecondaryColor }]}>
                  Deleting deactivates your account for v1 while keeping records recoverable.
                </Text>
              </>
            ) : null}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  content: {
    paddingTop: 0,
    paddingBottom: Platform.select({ ios: 112, android: 96, default: 96 }),
  },
  profileSettingsModalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  profileSettingsScreen: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  nativeSettingsHost: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  profileSettingsAnimatedLayer: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  profileSettingsHeader: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    justifyContent: "space-between",
  },
  profileSettingsBackButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSettingsBackButtonPressed: {
    backgroundColor: colors.light.surface,
  },
  profileSettingsDoneButton: {
    minHeight: 34,
    minWidth: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  profileSettingsDoneButtonPressed: {
    backgroundColor: colors.light.surface,
  },
  profileSettingsDoneText: {
    ...typography.body,
    color: colors.light.text,
    fontWeight: "600",
  },
  profileSettingsHeaderTitle: {
    ...typography.h2,
    color: colors.light.text,
    textAlign: "center",
    position: "absolute",
    left: 56,
    right: 56,
  },
  profileSettingsContent: {
    paddingBottom: spacing.xl,
    backgroundColor: colors.light.background,
  },
  profileSettingsIdentitySection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  profileSettingsAvatarRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  profileSettingsAvatarOption: {
    alignItems: "center",
    gap: spacing.xs,
  },
  profileSettingsAvatarButton: {
    width: 78,
    height: 78,
    borderRadius: radius.full,
    backgroundColor: colors.light.surface,
    borderWidth: 1,
    borderColor: colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileSettingsAvatarButtonSecondary: {
    backgroundColor: colors.light.background,
  },
  profileSettingsMediaImage: {
    width: "100%",
    height: "100%",
  },
  profileSettingsAvatarLabel: {
    ...typography.caption,
    color: colors.light.textSecondary,
    fontWeight: "600",
  },
  profileSettingsList: {
    marginTop: spacing.sm,
    backgroundColor: colors.light.background,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.light.border,
  },
  profileSettingsListRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  profileSettingsListLabel: {
    ...typography.body,
    color: colors.light.text,
    flexShrink: 0,
  },
  profileSettingsListValueInput: {
    ...typography.body,
    color: colors.light.text,
    textAlign: "right",
    flex: 1,
    minHeight: 36,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  heroShell: {
    width: "100%",
    backgroundColor: colors.dark.background,
  },
  heroBanner: {
    width: "100%",
    overflow: "hidden",
  },
  heroBannerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroBannerFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.dark.surface,
  },
  heroEditProfileActionRow: {
    marginLeft: 156,
    marginRight: spacing.xs,
    marginTop: -56,
    marginBottom: spacing.sm,
    alignItems: "stretch",
    transform: [{ translateY: -8 }],
  },
  heroEditProfileButton: {
    minHeight: 38,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.light.surfaceMuted,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  heroEditProfileButtonText: {
    ...typography.caption,
    color: colors.dark.background,
    fontWeight: "700",
  },
  heroActionDisabled: {
    opacity: 0.5,
  },
  heroIdentityBlock: {
    position: "relative",
    backgroundColor: colors.dark.background,
    paddingHorizontal: spacing.lg,
    paddingTop: 90,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  heroAvatarPressable: {
    position: "absolute",
    left: spacing.lg,
    top: -74,
    zIndex: 3,
    alignItems: "center",
  },
  heroAvatarFrame: {
    width: 140,
    height: 140,
    borderRadius: 72,
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.8)",
    shadowColor: colors.dark.background,
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
    position: "relative",
  },
  heroAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 68,
    backgroundColor: colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroAvatarImage: {
    width: "100%",
    height: "100%",
  },
  heroAvatarPlaceholder: {
    position: "absolute",
    left: 6,
    bottom: 6,
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.38)",
    backgroundColor: "rgba(0,0,0,0.68)",
  },
  heroIdentityTextWrap: {
    gap: spacing.xs,
  },
  heroArtistName: {
    ...typography.h1,
    color: colors.dark.text,
    fontSize: 42,
    lineHeight: 46,
    letterSpacing: 0.3,
    maxWidth: "88%",
  },
  heroArtistNamePlaceholder: {
    color: colors.dark.textSecondary,
  },
  mainContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  errorPanel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 82, 94, 0.4)",
    backgroundColor: "rgba(57, 18, 24, 0.72)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorPanelText: {
    ...typography.caption,
    color: colors.accent.error,
    flex: 1,
  },
  loadingCard: {
    minHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.dark.textSecondary,
  },
  sectionCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h2,
    color: colors.dark.text,
    marginBottom: spacing.md,
  },
  optionChipPressed: {
    opacity: 0.85,
  },
  platformChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  addPlatformChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: colors.dark.surfaceMuted,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  addPlatformChipText: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "600",
  },
  emptyLinksText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    marginBottom: spacing.sm,
  },
  linkRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: colors.dark.surface,
    padding: spacing.sm,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  linkHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkPlatform: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "600",
  },
  linkInput: {
    ...typography.body,
    color: colors.dark.text,
    flex: 1,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: colors.dark.surfaceMuted,
  },
  linkRemoveButton: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    width: "100%",
    minHeight: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.primary,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    marginBottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
    fontWeight: "700",
  },
  accountSection: {
    borderRadius: radius.lg,
    backgroundColor: colors.dark.surface,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  actionRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dark.surfaceMuted,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: spacing.sm,
  },
  actionRowPressed: {
    opacity: 0.86,
  },
  deleteRowPressed: {
    backgroundColor: "rgba(95,29,39,0.72)",
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionText: {
    ...typography.body,
    color: colors.dark.text,
    fontWeight: "600",
  },
  deleteText: {
    ...typography.body,
    color: colors.accent.error,
    fontWeight: "600",
  },
  warningText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
