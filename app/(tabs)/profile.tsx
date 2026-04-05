import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
  useWindowDimensions,
  useColorScheme,
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
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { usePostHog } from "posthog-react-native";
import { api } from "../../convex/_generated/api";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import {
  DEFAULT_LOCAL_ARTIST_PROFILE,
  PROFILE_LINK_PLATFORMS,
  getLocalArtistProfile,
  setLocalArtistProfile,
  type ProfileLink,
  type ProfileLinkPlatform,
} from "@/lib/localProfile";
import { clearLocalOnboardingCompleted } from "@/lib/onboarding";
import { getExpoPushTokenAsync } from "@/lib/notifications";
import type { EventName } from "@/lib/analytics";
import { useLocalSession } from "@/providers/localSession";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
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
  const isDarkMode = colorScheme === "dark";

  // Dynamic colors based on color scheme
  const profileBackgroundColor = isDarkMode ? "#03050A" : colors.light.background;
  const profileBannerFallbackColor = isDarkMode ? "#0F172D" : colors.light.surface;
  const profileTextColor = isDarkMode ? "#F8FAFF" : colors.light.text;
  const profileTextSecondaryColor = isDarkMode ? "#D6DEEF" : colors.light.textSecondary;
  const profileBorderColor = isDarkMode
    ? "rgba(184, 200, 236, 0.15)"
    : colors.light.border;
  const profileAvatarFrameColor = isDarkMode ? "rgba(222, 233, 255, 0.8)" : colors.light.surface;
  const profileAvatarBgColor = isDarkMode ? "#16203A" : colors.light.background;
  const profileEditButtonBgColor = isDarkMode ? "#EFF3FF" : "#000000";
  const profileEditButtonTextColor = isDarkMode ? "#11152A" : "#FFFFFF";

  // Create dynamic styles based on color scheme
  const styles = useMemo(() => createStyles(isDarkMode), [isDarkMode]);

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

  const [artistNameDraft, setArtistNameDraft] = useState("");
  const [heroImageUrlDraft, setHeroImageUrlDraft] = useState<string | null>(null);
  const [avatarImageUrlDraft, setAvatarImageUrlDraft] = useState<string | null>(
    null,
  );
  const [linksDraft, setLinksDraft] = useState<DraftProfileLink[]>([]);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isClosingProfileSettings, setIsClosingProfileSettings] = useState(false);
  const profileSettingsTranslateX = useRef(new Animated.Value(windowWidth)).current;

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

  const usesLocalProfile = isLocalGuest || !isSignedIn;
  const isConvexUnavailableForSignedIn = Boolean(isSignedIn) && !isAuthenticated;

  const isProfileLoading = usesLocalProfile
    ? !isLocalArtistProfileReady
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

  useEffect(() => {
    if (isProfileLoading) return;
    setArtistNameDraft(sourceArtistName);
    setHeroImageUrlDraft(sourceHeroImageUrl);
    setAvatarImageUrlDraft(sourceAvatarImageUrl);
    setLinksDraft(sourceLinks);
  }, [isProfileLoading, sourceArtistName, sourceHeroImageUrl, sourceAvatarImageUrl, sourceLinks]);

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
      setLinksDraft((prev) =>
        prev.map((link) =>
          link.platform === platform
            ? {
                ...link,
                url,
              }
            : link,
        ),
      );
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
      if (isSavingProfile || isSigningOut || isDeleting) return;
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
      isSigningOut,
      isUnauthenticatedError,
      linksDraft,
      updateProfile,
      usesLocalProfile,
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
        // AuthGate detects hasSession=false and redirects to sign-in automatically.
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

  const availablePlatforms = useMemo(() => {
    const used = new Set(linksDraft.map((link) => link.platform));
    return PROFILE_LINK_PLATFORMS.filter((platform) => !used.has(platform));
  }, [linksDraft]);
  const heroHeight = Math.max(380, Math.min(Math.round(windowHeight * 0.5), 560));
  const heroBannerHeight = Math.max(
    240,
    Math.min(Math.round(windowWidth * 0.72), Math.round(heroHeight * 0.76)),
  );
  const heroArtistName = artistNameDraft.trim() || "Tap to add artist name";
  const actionsDisabled = isSigningOut || isDeleting;
  const profileInputsDisabled =
    isProfileLoading ||
    isSavingProfile ||
    isSigningOut ||
    isDeleting ||
    isPickingAvatar ||
    isPickingHero;
  const profileSettingsDisabled = profileInputsDisabled || isSavingProfile;
  const modalTopInset = Platform.OS === "ios" ? (insets.top > 0 ? insets.top : 44) : 0;

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
      void saveProfile({ includeLinks: false });
    });
  }, [
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
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <StatusBar style="light" />
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
                  <StatusBar style={isDarkMode ? "light" : "dark"} />
                <View
                  style={styles.profileSettingsHeader}
                  {...profileSettingsPanResponder.panHandlers}
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
                    <Ionicons name="chevron-back" size={24} color={isDarkMode ? "#D6DEF0" : "#121826"} />
                  </Pressable>
                  <Text style={styles.profileSettingsHeaderTitle}>Edit profile</Text>
                </View>
                <ScrollView
                  contentContainerStyle={styles.profileSettingsContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <View style={styles.profileSettingsAvatarSection}>
                    <View style={styles.profileSettingsMediaRow}>
                      <View style={styles.profileSettingsMediaColumn}>
                        <Pressable
                          onPress={() => {
                            void handlePickAvatar();
                          }}
                          disabled={profileSettingsDisabled}
                          style={({ pressed }) => [
                            styles.profileSettingsMediaCircle,
                            profileSettingsDisabled && styles.heroActionDisabled,
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
                            <Image source={require("../../assets/MusicPromo-DefaultAvatar.png")} style={styles.profileSettingsMediaImage} />
                          )}
                        </Pressable>
                        <Text style={styles.profileSettingsMediaLabel}>Avatar</Text>
                        <Pressable
                          onPress={() => {
                            void handlePickAvatar();
                          }}
                          disabled={profileSettingsDisabled}
                          style={({ pressed }) => [
                            styles.profileSettingsMediaCtaButton,
                            pressed && !profileSettingsDisabled && styles.optionChipPressed,
                          ]}
                          accessibilityLabel="Edit avatar"
                          accessibilityRole="button"
                        >
                          {isPickingAvatar ? (
                            <ActivityIndicator size="small" color="#4A5BEA" />
                          ) : (
                            <Text style={styles.profileSettingsMediaCtaText}>Edit avatar</Text>
                          )}
                        </Pressable>
                      </View>

                      <View style={styles.profileSettingsMediaColumn}>
                        <Pressable
                          onPress={() => {
                            void handlePickHero();
                          }}
                          disabled={profileSettingsDisabled}
                          style={({ pressed }) => [
                            styles.profileSettingsMediaCircle,
                            profileSettingsDisabled && styles.heroActionDisabled,
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
                            <Image source={require("../../assets/MusicPromo-Banner.png")} style={styles.profileSettingsMediaImage} />
                          )}
                        </Pressable>
                        <Text style={styles.profileSettingsMediaLabel}>Banner</Text>
                        <Pressable
                          onPress={() => {
                            void handlePickHero();
                          }}
                          disabled={profileSettingsDisabled}
                          style={({ pressed }) => [
                            styles.profileSettingsMediaCtaButton,
                            pressed && !profileSettingsDisabled && styles.optionChipPressed,
                          ]}
                          accessibilityLabel="Edit banner"
                          accessibilityRole="button"
                        >
                          {isPickingHero ? (
                            <ActivityIndicator size="small" color="#4A5BEA" />
                          ) : (
                            <Text style={styles.profileSettingsMediaCtaText}>Edit banner</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  </View>

                  <View style={styles.profileSettingsCard}>
                    <View style={styles.profileSettingsRow}>
                      <Text style={styles.profileSettingsRowLabel}>Name</Text>
                      <TextInput
                        value={artistNameDraft}
                        onChangeText={setArtistNameDraft}
                        placeholder="Add name"
                        placeholderTextColor={isDarkMode ? "#6B778F" : "#A7AFC0"}
                        editable={!profileSettingsDisabled}
                        onSubmitEditing={() => {
                          void saveProfile({ includeLinks: false });
                        }}
                        onBlur={() => {
                          void saveProfile({ includeLinks: false });
                        }}
                        style={styles.profileSettingsNameInput}
                        autoCapitalize="words"
                        autoCorrect={false}
                        returnKeyType="done"
                      />
                    </View>
                  </View>

                  <View style={[styles.accountSection, { backgroundColor: isDarkMode ? "#11192C" : colors.light.surface, borderColor: isDarkMode ? "rgba(187, 203, 236, 0.15)" : colors.light.border }]}>
                    <Text style={[styles.sectionEyebrow, { color: profileTextSecondaryColor }]}>Account Actions</Text>
                    <Text style={[styles.sectionTitle, { color: profileTextColor }]}>Security & Session</Text>

                    <Pressable
                      style={({ pressed }) => [
                        styles.actionRow,
                        { backgroundColor: isDarkMode ? "#0F1724" : colors.light.surface, borderColor: profileBorderColor },
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

                    <Pressable
                      style={({ pressed }) => [
                        styles.actionRow,
                        { backgroundColor: isDarkMode ? "#0F1724" : colors.light.surface, borderColor: profileBorderColor },
                        pressed && !actionsDisabled && styles.deleteRowPressed,
                      ]}
                      onPress={handleDeleteAccount}
                      disabled={actionsDisabled}
                      accessibilityLabel="Delete account"
                      accessibilityRole="button"
                    >
                      <View style={styles.actionRowLeft}>
                        <Ionicons name="trash-outline" size={20} color={isDarkMode ? colors.accent.error : "#C41C1C"} />
                        <Text style={[styles.deleteText, { color: isDarkMode ? colors.accent.error : "#C41C1C" }]}>Delete Account</Text>
                      </View>
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={colors.accent.error} />
                      ) : (
                        <Ionicons name="chevron-forward" size={16} color={profileTextSecondaryColor} />
                      )}
                    </Pressable>

                    <Text style={[styles.warningText, { color: profileTextSecondaryColor }]}>
                      Deleting deactivates your account for v1 while keeping records recoverable.
                    </Text>
                  </View>
                </ScrollView>
              </SafeAreaView>
            </Animated.View>
            </View>
          </SafeAreaProvider>
        </Modal>
      ) : null}
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
        <View style={[styles.heroShell, { minHeight: heroHeight, backgroundColor: profileBackgroundColor }]}>
          <View style={[styles.heroBanner, { height: heroBannerHeight }]}>
            {heroImageUrlDraft ? (
              <Image
                source={{ uri: heroImageUrlDraft }}
                style={styles.heroBannerImage}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={require("../../assets/MusicPromo-Banner.png")}
                style={styles.heroBannerImage}
                resizeMode="cover"
              />
            )}
          </View>

          <View style={[styles.heroIdentityBlock, { backgroundColor: profileBackgroundColor, borderTopColor: profileBorderColor }]}>
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
              <View style={[styles.heroAvatarFrame, { backgroundColor: profileAvatarFrameColor }]}>
                <View style={[styles.heroAvatar, { backgroundColor: profileAvatarBgColor }]}>
                  {avatarImageUrlDraft ? (
                    <Image source={{ uri: avatarImageUrlDraft }} style={styles.heroAvatarImage} />
                  ) : (
                    <Image source={require("../../assets/MusicPromo-DefaultAvatar.png")} style={styles.heroAvatarImage} />
                  )}
                </View>
                <View style={styles.heroAvatarPlaceholder}>
                  <Ionicons name="camera-outline" size={14} color="#F4F7FF" />
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
                  { backgroundColor: profileEditButtonBgColor },
                  profileInputsDisabled && styles.heroActionDisabled,
                  pressed && !profileInputsDisabled && styles.optionChipPressed,
                ]}
                accessibilityLabel="Edit profile"
                accessibilityRole="button"
              >
                {isPickingAvatar ? (
                  <ActivityIndicator size="small" color={profileEditButtonTextColor} />
                ) : (
                  <>
                    <Ionicons name="pencil-outline" size={15} color={profileEditButtonTextColor} />
                    <Text style={[styles.heroEditProfileButtonText, { color: profileEditButtonTextColor }]} numberOfLines={1}>
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
                  !artistNameDraft.trim() && styles.heroArtistNamePlaceholder,
                ]}
              >
                {heroArtistName}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.mainContent, { backgroundColor: profileBackgroundColor }]}>
          {errorText ? (
            <View style={styles.errorPanel}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.accent.error} />
              <Text style={styles.errorPanelText}>{errorText}</Text>
            </View>
          ) : null}

          {isProfileLoading ? (
            <View style={[styles.loadingCard, { backgroundColor: isDarkMode ? "#121A2E" : colors.light.surface, borderColor: profileBorderColor }]}>
              <ActivityIndicator color={profileTextColor} />
              <Text style={[styles.loadingText, { color: profileTextSecondaryColor }]}>Loading profile...</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? "#03050A" : colors.light.background,
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
    backgroundColor: isDarkMode ? "#0A0F1C" : "#F4F5F7",
  },
  profileSettingsAnimatedLayer: {
    flex: 1,
    backgroundColor: isDarkMode ? "#0A0F1C" : "#F4F5F7",
  },
  profileSettingsHeader: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "rgba(187, 203, 236, 0.15)" : "#E6E8EE",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    justifyContent: "flex-start",
  },
  profileSettingsBackButton: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSettingsBackButtonPressed: {
    backgroundColor: "#E8EBF2",
  },
  profileSettingsHeaderTitle: {
    ...typography.h2,
    color: isDarkMode ? "#F4F7FF" : "#232938",
    textAlign: "center",
    position: "absolute",
    left: 56,
    right: 56,
  },
  profileSettingsContent: {
    paddingBottom: 36,
  },
  profileSettingsAvatarSection: {
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "rgba(187, 203, 236, 0.15)" : "#E6E8EE",
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  profileSettingsMediaRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  profileSettingsMediaColumn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  profileSettingsMediaCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: "#DDE2EC",
    borderWidth: 1,
    borderColor: "#D4DAE8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileSettingsMediaImage: {
    width: "100%",
    height: "100%",
  },
  profileSettingsMediaLabel: {
    ...typography.caption,
    color: "#4A5266",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.xs,
  },
  profileSettingsMediaCtaButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  profileSettingsMediaCtaText: {
    ...typography.body,
    color: "#4A5BEA",
    fontWeight: "600",
    textAlign: "center",
  },
  profileSettingsCard: {
    backgroundColor: isDarkMode ? "#0A0F1C" : "#F4F5F7",
  },
  profileSettingsRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? "rgba(187, 203, 236, 0.15)" : "#E6E8EE",
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  profileSettingsRowLabel: {
    ...typography.body,
    color: isDarkMode ? "#CBD3E8" : "#303645",
    flexShrink: 0,
  },
  profileSettingsNameInput: {
    ...typography.body,
    color: isDarkMode ? "#F4F7FF" : "#1F2431",
    textAlign: "right",
    flex: 1,
    minHeight: 36,
    paddingVertical: 0,
  },
  heroShell: {
    width: "100%",
    backgroundColor: "#03050A",
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
    backgroundColor: "#0F172D",
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
    backgroundColor: "#EFF3FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  heroEditProfileButtonText: {
    ...typography.caption,
    color: "#11152A",
    fontWeight: "700",
  },
  heroActionDisabled: {
    opacity: 0.5,
  },
  heroIdentityBlock: {
    position: "relative",
    backgroundColor: "#03050A",
    paddingHorizontal: spacing.lg,
    paddingTop: 90,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(184, 200, 236, 0.15)",
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
    backgroundColor: "rgba(222, 233, 255, 0.8)",
    shadowColor: "#000000",
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
    backgroundColor: "#16203A",
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
    borderColor: "rgba(227, 236, 255, 0.42)",
    backgroundColor: "rgba(18, 26, 44, 0.82)",
  },
  heroIdentityTextWrap: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  heroArtistName: {
    ...typography.h1,
    color: "#F8FAFF",
    fontSize: 42,
    lineHeight: 52,
    letterSpacing: 0.3,
    maxWidth: "88%",
  },
  heroArtistNamePlaceholder: {
    color: "#D6DEEF",
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
    borderColor: isDarkMode ? "rgba(255, 82, 94, 0.4)" : "rgba(255, 82, 94, 0.2)",
    backgroundColor: isDarkMode ? "rgba(57, 18, 24, 0.72)" : "rgba(255, 82, 94, 0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorPanelText: {
    ...typography.caption,
    color: isDarkMode ? "#FFB8BE" : colors.accent.error,
    flex: 1,
  },
  loadingCard: {
    minHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: isDarkMode ? "#121A2E" : colors.light.surface,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(187, 203, 236, 0.15)" : colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: isDarkMode ? "#D7DFF4" : colors.light.textSecondary,
  },
  sectionCard: {
    borderRadius: radius.lg,
    backgroundColor: isDarkMode ? "#11192C" : colors.light.surface,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(187, 203, 236, 0.15)" : colors.light.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  sectionEyebrow: {
    ...typography.caption,
    color: isDarkMode ? "#8D9BBD" : colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.h2,
    color: isDarkMode ? "#F4F7FF" : colors.light.text,
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
    borderColor: isDarkMode ? "rgba(205, 218, 249, 0.3)" : colors.light.border,
    backgroundColor: isDarkMode ? "#1A2946" : colors.light.surface,
    paddingHorizontal: spacing.md,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  addPlatformChipText: {
    ...typography.caption,
    color: isDarkMode ? "#DBE4FC" : colors.light.text,
    fontWeight: "600",
  },
  emptyLinksText: {
    ...typography.caption,
    color: isDarkMode ? "#94A2C4" : colors.light.textSecondary,
    marginBottom: spacing.sm,
  },
  linkRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(205, 218, 249, 0.2)" : colors.light.border,
    backgroundColor: isDarkMode ? "#0F172A" : colors.light.surface,
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
    color: isDarkMode ? "#DCE4FA" : colors.light.text,
    fontWeight: "600",
  },
  linkInput: {
    ...typography.body,
    color: isDarkMode ? "#F3F6FF" : colors.light.text,
    flex: 1,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(205, 218, 249, 0.2)" : colors.light.border,
    backgroundColor: isDarkMode ? "#13203B" : colors.light.background,
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
    backgroundColor: isDarkMode ? "#F1F4FE" : colors.accent.primary,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: isDarkMode ? "#D7DEEE" : colors.accent.primary,
    marginBottom: spacing.lg,
    flexDirection: "row",
    gap: spacing.xs,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...typography.button,
    color: isDarkMode ? "#101426" : "#FFFFFF",
    fontWeight: "700",
  },
  accountSection: {
    borderRadius: radius.lg,
    backgroundColor: isDarkMode ? "#11192C" : colors.light.surface,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(187, 203, 236, 0.15)" : colors.light.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  actionRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: isDarkMode ? "#0D162A" : colors.light.surface,
    borderWidth: 1,
    borderColor: isDarkMode ? "rgba(205, 218, 249, 0.2)" : colors.light.border,
    marginBottom: spacing.sm,
  },
  actionRowPressed: {
    opacity: 0.86,
  },
  deleteRowPressed: {
    backgroundColor: isDarkMode ? "#2B161D" : "rgba(255, 82, 94, 0.1)",
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionText: {
    ...typography.body,
    color: isDarkMode ? "#E8ECF8" : colors.light.text,
    fontWeight: "600",
  },
  deleteText: {
    ...typography.body,
    color: isDarkMode ? colors.accent.error : "#C41C1C",
    fontWeight: "600",
  },
  warningText: {
    ...typography.caption,
    color: isDarkMode ? "#8F9DBE" : colors.light.textSecondary,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
