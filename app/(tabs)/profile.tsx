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
  InputAccessoryView,
  Image,
  Linking,
  useWindowDimensions,
  useColorScheme,
  Modal,
  Animated,
  Easing,
  PanResponder,
  PixelRatio,
  KeyboardAvoidingView,
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
import { ProjectThumbnail } from "@/components/ProjectThumbnail";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import ViewShot from "react-native-view-shot";

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

const LINK_PLACEHOLDERS: Record<ProfileLinkPlatform, string> = {
  spotify: "Artist name",
  soundcloud: "yourname",
  "apple-music": "Artist name",
  youtube: "yourname",
  instagram: "yourhandle",
  tiktok: "yourhandle",
  x: "yourhandle",
  website: "yourwebsite.com",
};

const PLATFORM_BASE_URLS: Record<ProfileLinkPlatform, string> = {
  spotify: "https://open.spotify.com/search/",
  soundcloud: "https://soundcloud.com/",
  "apple-music": "https://music.apple.com/search?term=",
  youtube: "https://youtube.com/@",
  instagram: "https://instagram.com/",
  tiktok: "https://tiktok.com/@",
  x: "https://x.com/",
  website: "",
};

// Platforms where user just types a handle/name (we construct the URL)
const HANDLE_PLATFORMS = new Set<ProfileLinkPlatform>(["spotify", "soundcloud", "apple-music", "youtube", "instagram", "tiktok", "x"]);

function extractHandle(platform: ProfileLinkPlatform, fullUrl: string): string {
  if (!HANDLE_PLATFORMS.has(platform)) return fullUrl;
  let s = fullUrl.replace(/^https?:\/\/(www\.)?/, "");
  const prefixes: Partial<Record<ProfileLinkPlatform, string>> = {
    spotify: "open.spotify.com/search/",
    "apple-music": "music.apple.com/search?term=",
    soundcloud: "soundcloud.com/",
    youtube: "youtube.com/",
    instagram: "instagram.com/",
    tiktok: "tiktok.com/@",
    x: "x.com/",
  };
  const prefix = prefixes[platform];
  if (prefix && s.startsWith(prefix)) {
    s = s.slice(prefix.length);
  } else if (platform === "x" && s.startsWith("twitter.com/")) {
    s = s.slice("twitter.com/".length);
  }
  return decodeURIComponent(s.replace(/^@/, "").split("/")[0].split("?")[0]);
}

function buildLinkUrl(platform: ProfileLinkPlatform, input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (HANDLE_PLATFORMS.has(platform)) {
    const handle = trimmed.replace(/^@/, "");
    if (!handle) return "";
    return PLATFORM_BASE_URLS[platform] + handle;
  }
  // URL-based platforms — ensure https://
  if (!/^https?:\/\//i.test(trimmed)) return "https://" + trimmed;
  return trimmed;
}

const PLATFORM_DEEP_LINKS: Record<ProfileLinkPlatform, (url: string) => string> = {
  spotify: (url) => {
    const artist = extractHandle("spotify", url);
    return `spotify://search/${encodeURIComponent(artist)}`;
  },
  instagram: (url) => {
    const handle = extractHandle("instagram", url);
    return `instagram://user?username=${handle}`;
  },
  tiktok: (url) => {
    const handle = extractHandle("tiktok", url);
    return `snssdk1233://user/profile/${handle}`;
  },
  youtube: (url) => url.replace("https://youtube.com", "youtube://").replace("https://www.youtube.com", "youtube://"),
  x: (url) => {
    const handle = extractHandle("x", url);
    return `twitter://user?screen_name=${handle}`;
  },
  soundcloud: (url) => url,
  "apple-music": (url) => url.replace("https://music.apple.com/search?term=", "music://music.apple.com/search?term="),
  website: (url) => url,
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
  const profileBackgroundColor = isDarkMode ? colors.dark.background : colors.light.background;
  const profileBannerFallbackColor = isDarkMode ? colors.dark.surface : colors.light.surface;
  const profileTextColor = isDarkMode ? colors.dark.text : colors.light.text;
  const profileTextSecondaryColor = isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary;
  const profileBorderColor = isDarkMode ? colors.dark.border : colors.light.border;
  const profileAvatarFrameColor = isDarkMode ? colors.dark.surfaceMuted : colors.light.surface;
  const profileAvatarBgColor = isDarkMode ? colors.dark.surfaceMuted : colors.light.background;
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
  const projects = useQuery(api.projects.listByUser);
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
  const [isShareCardVisible, setIsShareCardVisible] = useState(false);
  const [isSharingProfile, setIsSharingProfile] = useState(false);
  const [shareAvatarUri, setShareAvatarUri] = useState<string | null>(null);
  const [shareHeroUri, setShareHeroUri] = useState<string | null>(null);
  const shareCardRef = useRef<ViewShot>(null);
  const shareCardBannerReadyRef = useRef<(() => void) | null>(null);
  const bioInputRef = useRef<TextInput>(null);
  const [isBioFocused, setIsBioFocused] = useState(false);

  const [localArtistProfile, setLocalArtistProfileState] = useState(
    DEFAULT_LOCAL_ARTIST_PROFILE,
  );
  const [isLocalArtistProfileReady, setIsLocalArtistProfileReady] =
    useState(false);

  const [artistNameDraft, setArtistNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
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

  const sourceBio = usesLocalProfile
    ? localArtistProfile.bio
    : convexUser?.bio ?? localArtistProfile.bio ?? "";

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
    setBioDraft(sourceBio);
    setHeroImageUrlDraft(sourceHeroImageUrl);
    setAvatarImageUrlDraft(sourceAvatarImageUrl);
    setLinksDraft(sourceLinks);
  }, [isProfileLoading, sourceArtistName, sourceBio, sourceHeroImageUrl, sourceAvatarImageUrl, sourceLinks]);

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

        const bio = bioDraft.trim();
        const cached = await setLocalArtistProfile({
          artistName,
          bio,
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
            bio: bio || null,
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
      bioDraft,
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
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
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
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
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
  const heroBannerHeight = Math.round(windowWidth * (9 / 16));
  const heroArtistName = artistNameDraft.trim() || "";
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

  const handleShareProfile = useCallback(async () => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Sharing not available",
        "Sharing is not supported on this device.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      );
      return;
    }

    setIsSharingProfile(true);
    try {
      // Validate URIs — local file:// paths may no longer exist on device.
      // Fall back to null so the share card renders the default images instead of blank.
      const validateUri = async (url: string | null): Promise<string | null> => {
        if (!url) return null;
        if (url.startsWith("file://") || url.startsWith("/")) {
          const info = await FileSystem.getInfoAsync(url).catch(() => ({ exists: false }));
          return info.exists ? url : null;
        }
        return url;
      };
      const [validatedAvatar, validatedHero] = await Promise.all([
        validateUri(sourceAvatarImageUrl),
        validateUri(sourceHeroImageUrl),
      ]);
      setShareAvatarUri(validatedAvatar);
      setShareHeroUri(validatedHero);

      // Prefetch valid remote images so they're in cache before the card renders.
      const prefetch = (url: string) => Image.prefetch(url).catch(() => null);
      await Promise.all([
        validatedAvatar && !validatedAvatar.startsWith("file://") ? prefetch(validatedAvatar) : null,
        validatedHero && !validatedHero.startsWith("file://") ? prefetch(validatedHero) : null,
      ]);

      setIsShareCardVisible(true);

      // Wait for the banner image to load AND a minimum delay for project thumbnails.
      // Local file URIs load nearly instantly, so the minimum delay ensures thumbnail
      // images inside ProjectThumbnail have time to render before capture.
      await Promise.all([
        new Promise<void>((resolve) => {
          shareCardBannerReadyRef.current = resolve;
          setTimeout(resolve, 2000); // fallback in case onLoad never fires
        }),
        sleep(800),
      ]);
      shareCardBannerReadyRef.current = null;

      const uri = await shareCardRef.current?.capture?.();
      if (!uri) {
        setIsShareCardVisible(false);
        Alert.alert("Share failed", "Could not capture the share card. Please try again.");
        return;
      }
      setIsShareCardVisible(false);
      await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your profile" });
    } catch (e) {
      console.error("[handleShareProfile]", e);
      setIsShareCardVisible(false);
      Alert.alert("Share failed", String(e instanceof Error ? e.message : e));
    } finally {
      setIsSharingProfile(false);
    }
  }, [sourceAvatarImageUrl, sourceHeroImageUrl]);

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
      <StatusBar style={isDarkMode ? "light" : "dark"} />
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
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "height" : undefined}
                  style={{ flex: 1 }}
                >
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
                            <Image source={require("../../assets/defaults/MusicPromo-DefaultAvatar.jpg")} style={styles.profileSettingsMediaImage} />
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
                            <ActivityIndicator size="small" color={isDarkMode ? colors.dark.text : colors.light.text} />
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
                            <Image source={require("../../assets/branding/MusicPromo-Banner.png")} style={styles.profileSettingsMediaImage} />
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
                            <ActivityIndicator size="small" color={isDarkMode ? colors.dark.text : colors.light.text} />
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
                        maxLength={50}
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
                    <View style={[styles.profileSettingsRow, styles.profileSettingsBioRow]}>
                      <Text style={styles.profileSettingsRowLabel}>Bio</Text>
                      <TextInput
                        ref={bioInputRef}
                        value={bioDraft}
                        onChangeText={(text) => {
                          const lines = text.split("\n");
                          setBioDraft(lines.slice(0, 3).join("\n"));
                        }}
                        placeholder="Tell people about yourself"
                        placeholderTextColor={isDarkMode ? "#6B778F" : "#A7AFC0"}
                        editable={!profileSettingsDisabled}
                        onBlur={() => {
                          void saveProfile({ includeLinks: false });
                        }}
                        style={[styles.profileSettingsNameInput, styles.profileSettingsBioInput]}
                        autoCapitalize="sentences"
                        autoCorrect
                        multiline
                        maxLength={200}
                        inputAccessoryViewID="bioInputAccessory"
                      />
                    </View>
                  </View>

                  <View style={styles.profileSettingsCard}>
                    <View style={styles.profileSettingsSectionHeader}>
                      <Text style={[styles.profileSettingsSectionLabelText, { color: profileTextSecondaryColor }]}>Social Platforms</Text>
                    </View>

                    {linksDraft.map((link) => (
                      <View key={link.platform} style={styles.profileSettingsRow}>
                        <Text style={styles.profileSettingsRowLabel}>{PLATFORM_LABELS[link.platform]}</Text>
                        <TextInput
                          value={extractHandle(link.platform, link.url)}
                          onChangeText={(text) => handleUpdateLinkUrl(link.platform, buildLinkUrl(link.platform, text))}
                          placeholder={LINK_PLACEHOLDERS[link.platform]}
                          placeholderTextColor={isDarkMode ? "#3D4A63" : "#A7AFC0"}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                          returnKeyType="done"
                          onSubmitEditing={() => { void saveProfile({ includeLinks: true }); }}
                          onBlur={() => { void saveProfile({ includeLinks: true }); }}
                          style={[styles.profileSettingsNameInput, { color: profileTextColor }]}
                        />
                        <Pressable
                          onPress={() => handleRemoveLink(link.platform)}
                          style={styles.linkInputRemove}
                          accessibilityLabel={`Remove ${PLATFORM_LABELS[link.platform]}`}
                          accessibilityRole="button"
                        >
                          <Ionicons name="close-circle" size={18} color={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary} />
                        </Pressable>
                      </View>
                    ))}

                    {availablePlatforms.length > 0 ? (
                      <View style={styles.linkAddRow}>
                        {availablePlatforms.map((platform) => (
                          <Pressable
                            key={platform}
                            onPress={() => handleAddLink(platform)}
                            style={({ pressed }) => [
                              styles.linkAddChip,
                              { borderColor: profileBorderColor, backgroundColor: isDarkMode ? colors.dark.surface : "#F0F2F7" },
                              pressed && styles.optionChipPressed,
                            ]}
                            accessibilityLabel={`Add ${PLATFORM_LABELS[platform]}`}
                            accessibilityRole="button"
                          >
                            <Ionicons name="add" size={13} color={profileTextSecondaryColor} />
                            <Text style={[styles.linkAddChipText, { color: profileTextSecondaryColor }]}>{PLATFORM_LABELS[platform]}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.profileSettingsCard}>
                    <View style={styles.profileSettingsSectionHeader}>
                      <Text style={[styles.profileSettingsSectionLabelText, { color: profileTextSecondaryColor }]}>Account</Text>
                    </View>

                    <Pressable
                      style={({ pressed }) => [
                        styles.profileSettingsRow,
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
                      {isSigningOut && (
                        <ActivityIndicator size="small" color={profileTextSecondaryColor} />
                      )}
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.profileSettingsRow,
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
                      {isDeleting && (
                        <ActivityIndicator size="small" color={colors.accent.error} />
                      )}
                    </Pressable>

                  </View>
                </ScrollView>
                </KeyboardAvoidingView>
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
        <View style={[styles.heroShell, { backgroundColor: profileBackgroundColor }]}>
          <View style={[styles.heroBanner, { height: heroBannerHeight }]}>
            <Image
              source={heroImageUrlDraft ? { uri: heroImageUrlDraft } : require("../../assets/branding/MusicPromo-Banner.png")}
              style={[styles.heroBannerImage, { width: windowWidth + 20 }]}
              resizeMode="cover"
              onError={() => setHeroImageUrlDraft(null)}
            />
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
                  <Image
                    source={avatarImageUrlDraft ? { uri: avatarImageUrlDraft } : require("../../assets/defaults/MusicPromo-DefaultAvatar.jpg")}
                    style={styles.heroAvatarImage}
                    onError={() => setAvatarImageUrlDraft(null)}
                  />
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
              {!isGuest ? (
                <Pressable
                  onPress={() => { void handleShareProfile(); }}
                  disabled={isSharingProfile}
                  style={({ pressed }) => [
                    styles.heroEditProfileButton,
                    { backgroundColor: profileEditButtonBgColor },
                    pressed && styles.optionChipPressed,
                  ]}
                  accessibilityLabel="Share profile"
                  accessibilityRole="button"
                >
                  {isSharingProfile ? (
                    <ActivityIndicator size="small" color={profileEditButtonTextColor} />
                  ) : (
                    <>
                      <Ionicons name="share-outline" size={15} color={profileEditButtonTextColor} />
                      <Text style={[styles.heroEditProfileButtonText, { color: profileEditButtonTextColor }]} numberOfLines={1}>
                        Share
                      </Text>
                    </>
                  )}
                </Pressable>
              ) : null}
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
              {bioDraft.trim() ? (
                <Text style={[styles.heroBioText, { color: profileTextSecondaryColor }]}>
                  {bioDraft.trim()}
                </Text>
              ) : null}
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
            <View style={[styles.loadingCard, { backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface, borderColor: profileBorderColor }]}>
              <ActivityIndicator color={profileTextColor} />
              <Text style={[styles.loadingText, { color: profileTextSecondaryColor }]}>Loading profile...</Text>
            </View>
          ) : null}

          {!isProfileLoading && !isGuest ? (() => {
            const activeLinks = sourceLinks.filter(l => l.url.trim().length > 0);
            const recentPromos = (projects ?? []).slice(0, 6);

            const handleLinkPress = async (platform: string, url: string) => {
              const webUrl = buildLinkUrl(platform as ProfileLinkPlatform, extractHandle(platform as ProfileLinkPlatform, url) || url);
              const deepLink = PLATFORM_DEEP_LINKS[platform as ProfileLinkPlatform]?.(webUrl) ?? webUrl;
              try {
                const canOpen = await Linking.canOpenURL(deepLink);
                if (canOpen) {
                  await Linking.openURL(deepLink);
                  return;
                }
              } catch (_) {}
              await Linking.openURL(webUrl);
            };

            const PLATFORM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
              spotify: "musical-notes",
              soundcloud: "cloud",
              "apple-music": "musical-note",
              youtube: "logo-youtube",
              instagram: "logo-instagram",
              tiktok: "logo-tiktok",
              x: "logo-twitter",
              website: "globe-outline",
            };

            return (
              <>
                {activeLinks.length > 0 ? (
                  <View style={[styles.linksCard, { backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface, borderColor: profileBorderColor }]}>
                    <Text style={[styles.sectionEyebrow, { color: profileTextSecondaryColor }]}>Social Platforms</Text>
                    <View style={styles.linksRow}>
                      {activeLinks.map(link => (
                        <Pressable
                          key={link.platform}
                          onPress={() => { void handleLinkPress(link.platform, link.url); }}
                          style={({ pressed }) => [styles.linkChip, { borderColor: profileBorderColor }, pressed && styles.optionChipPressed]}
                          accessibilityLabel={PLATFORM_LABELS[link.platform]}
                          accessibilityRole="link"
                        >
                          <Ionicons name={PLATFORM_ICONS[link.platform] ?? "link-outline"} size={18} color={profileTextColor} />
                          <Text style={[styles.linkChipLabel, { color: profileTextColor }]}>{PLATFORM_LABELS[link.platform]}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}

                {recentPromos.length > 0 ? (
                  <View style={styles.recentSection}>
                    <Text style={[styles.sectionTitle, { color: profileTextColor }]}>Music Promos</Text>
                    <View style={styles.thumbnailGrid}>
                      {recentPromos.map(project => {
                        const title = project.title ?? "Untitled";
                        return (
                          <View key={String(project._id)} style={styles.thumbnailCell}>
                            <ProjectThumbnail
                              project={project}
                              title={title}
                              surfaceColor="transparent"
                              fallbackIconColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                            />
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </>
            );
          })() : null}

          {!isProfileLoading && isGuest ? (
            <View style={[styles.guestCard, { backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface, borderColor: profileBorderColor }]}>
              <View style={styles.guestIconWrap}>
                <Ionicons name="person-circle-outline" size={48} color={profileTextColor} />
              </View>
              <Text style={[styles.guestTitle, { color: profileTextColor }]}>Create a free account</Text>
              <Text style={[styles.guestSubtitle, { color: profileTextSecondaryColor }]}>Sign in to unlock your full profile</Text>
              <View style={styles.guestPerks}>
                {([
                  { icon: "musical-notes-outline", label: "Save your promos" },
                  { icon: "link-outline", label: "Add your social links" },
                  { icon: "person-outline", label: "Access your profile anytime" },
                ] as const).map(({ icon, label }) => (
                  <View key={label} style={styles.guestPerkRow}>
                    <Ionicons name={icon} size={16} color={profileTextSecondaryColor} />
                    <Text style={[styles.guestPerkText, { color: profileTextSecondaryColor }]}>{label}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() => { void clearLocalSession(); }}
                style={({ pressed }) => [
                  styles.guestSignInButton,
                  { backgroundColor: profileEditButtonBgColor },
                  pressed && styles.optionChipPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                <Text style={[styles.guestSignInButtonText, { color: profileEditButtonTextColor }]}>Sign In</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {isShareCardVisible ? (
        <View style={styles.shareCardOffscreen} pointerEvents="none">
          <ViewShot ref={shareCardRef} options={{ format: "png", quality: 1, pixelRatio: PixelRatio.get() }}>
            <View style={styles.shareCard}>
              {/* Banner */}
              <View style={styles.shareCardBanner}>
                <Image
                  source={shareHeroUri ? { uri: shareHeroUri } : require("../../assets/branding/MusicPromo-Banner.png")}
                  style={[styles.shareCardBannerImage, !shareHeroUri && styles.shareCardBannerImageDefault]}
                  resizeMode="cover"
                  onLoad={() => shareCardBannerReadyRef.current?.()}
                />
                <View style={styles.shareCardBannerGradient} />
              </View>

              {/* Avatar + artist name row */}
              <View style={styles.shareCardNameRow}>
                <View style={styles.shareCardAvatarWrap}>
                  <Image
                    source={shareAvatarUri ? { uri: shareAvatarUri } : require("../../assets/defaults/MusicPromo-DefaultAvatar.jpg")}
                    style={styles.shareCardAvatarImage}
                  />
                </View>
                <Text style={styles.shareCardName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{sourceArtistName || displayName}</Text>
              </View>

              {/* Bio */}
              {sourceBio ? (
                <Text style={styles.shareCardBio} numberOfLines={4}>{sourceBio}</Text>
              ) : null}

              {/* Two-column body: left = socials, right = featured promos */}
              <View style={styles.shareCardBody}>
                {/* Left column: socials */}
                <View style={styles.shareCardLeft}>
                  {sourceLinks.length > 0 && (
                    <View style={styles.shareCardLinks}>
                      <Text style={styles.shareCardFeaturedLabel}>Socials</Text>
                      {sourceLinks.slice(0, 4).map((link) => {
                        const SHARE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
                          spotify: "musical-notes",
                          soundcloud: "cloud",
                          "apple-music": "musical-note",
                          youtube: "logo-youtube",
                          instagram: "logo-instagram",
                          tiktok: "logo-tiktok",
                          x: "logo-twitter",
                          website: "globe-outline",
                        };
                        const handle = extractHandle(link.platform as ProfileLinkPlatform, link.url);
                        return (
                          <View key={link.platform} style={styles.shareCardLinkRow}>
                            <Ionicons name={SHARE_ICONS[link.platform] ?? "link-outline"} size={14} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.shareCardLinkText} numberOfLines={1}>{handle || PLATFORM_LABELS[link.platform as ProfileLinkPlatform]}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Right column: featured promos */}
                <View style={styles.shareCardRight}>
                  {(projects ?? []).filter(p => p.audioName ?? p.title).length > 0 && (
                    <>
                      <Text style={styles.shareCardFeaturedLabel}>Songs</Text>
                      {(projects ?? []).filter(p => p.audioName ?? p.title).slice(0, 3).map((project) => (
                        <View key={String(project._id)} style={styles.shareCardSongRow}>
                          <Ionicons name="musical-note" size={11} color="rgba(255,255,255,0.4)" />
                          <Text style={styles.shareCardSongTitle} numberOfLines={1}>{project.audioName ?? project.title}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>

              {/* 3 promo thumbnails */}
              {(projects ?? []).length > 0 && (
                <View style={styles.shareCardGridSection}>
                  <Text style={styles.shareCardFeaturedLabel}>Music Promos</Text>
                  <View style={styles.shareCardGrid}>
                    {(projects ?? []).slice(0, 3).map(project => (
                      <View key={String(project._id)} style={styles.shareCardThumb}>
                        <ProjectThumbnail
                          project={project}
                          title={project.title ?? ""}
                          surfaceColor="transparent"
                          fallbackIconColor={isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary}
                        />
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Footer */}
              <View style={styles.shareCardFooter}>
                <Image
                  source={require("../../assets/branding/MusicPromo-Logo.png")}
                  style={styles.shareCardFooterLogo}
                />
              </View>
            </View>
          </ViewShot>
        </View>
      ) : null}
      <InputAccessoryView nativeID="bioInputAccessory">
        <View style={styles.bioAccessory}>
          <Pressable
            onPress={() => bioInputRef.current?.blur()}
            accessibilityLabel="Dismiss keyboard"
            accessibilityRole="button"
          >
            <Text style={styles.bioAccessoryDone}>Done</Text>
          </Pressable>
        </View>
      </InputAccessoryView>
    </SafeAreaView>
  );
}

const createStyles = (isDarkMode: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.dark.background : colors.light.background,
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
    backgroundColor: isDarkMode ? colors.dark.background : colors.light.background,
  },
  profileSettingsAnimatedLayer: {
    flex: 1,
    backgroundColor: isDarkMode ? colors.dark.background : colors.light.background,
  },
  profileSettingsHeader: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? colors.dark.border : colors.light.border,
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
    backgroundColor: isDarkMode ? colors.dark.surfaceMuted : colors.light.surfaceMuted,
  },
  profileSettingsHeaderTitle: {
    ...typography.h2,
    color: isDarkMode ? colors.dark.text : colors.light.text,
    textAlign: "center",
    position: "absolute",
    left: 56,
    right: 56,
  },
  profileSettingsContent: {
    paddingBottom: spacing.md,
  },
  profileSettingsAvatarSection: {
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? colors.dark.border : colors.light.border,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  profileSettingsMediaRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: spacing.xl,
  },
  profileSettingsMediaColumn: {
    alignItems: "center",
    gap: spacing.xs,
  },
  profileSettingsMediaCircle: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: isDarkMode ? colors.dark.surfaceMuted : colors.light.surfaceMuted,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.dark.border : colors.light.border,
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
    color: isDarkMode ? colors.dark.textSecondary : colors.light.textSecondary,
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
    color: isDarkMode ? colors.dark.text : colors.light.text,
    fontWeight: "600",
    textAlign: "center",
  },
  profileSettingsCard: {
    backgroundColor: isDarkMode ? colors.dark.background : colors.light.background,
  },
  profileSettingsRow: {
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? colors.dark.border : colors.light.border,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  profileSettingsBioRow: {
    minHeight: 80,
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
  },
  profileSettingsBioInputCol: {
    flex: 1,
    gap: 4,
  },
  profileSettingsDoneBtnWrap: {
    flexShrink: 0,
    alignSelf: "flex-start",
    paddingTop: 2,
  },
  profileSettingsDoneBtn: {
    ...typography.caption,
    fontWeight: "600",
  },
  profileSettingsBioInput: {
    textAlign: "right",
    textAlignVertical: "top",
    minHeight: 60,
  },
  profileSettingsRowLabel: {
    ...typography.body,
    color: isDarkMode ? colors.dark.text : colors.light.text,
    width: 100,
    flexShrink: 0,
  },
  profileSettingsSectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginTop: -1,
    backgroundColor: isDarkMode ? colors.dark.surfaceMuted : colors.light.surfaceMuted,
    borderTopWidth: 1,
    borderTopColor: isDarkMode ? colors.dark.border : colors.light.border,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? colors.dark.border : colors.light.border,
  },
  profileSettingsSectionLabelText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  linkInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  linkInputLabel: {
    ...typography.caption,
    fontWeight: "600",
    width: 96,
  },
  linkInputField: {
    ...typography.caption,
    flex: 1,
    paddingVertical: 4,
  },
  linkInputRemove: {
    padding: 2,
  },
  linkAddRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkAddChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
  },
  linkAddChipText: {
    ...typography.caption,
    fontWeight: "600",
  },
  profileSettingsNameInput: {
    ...typography.body,
    color: isDarkMode ? colors.dark.text : colors.light.text,
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
    transform: [{ translateX: -20 }],
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.dark.border,
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
    backgroundColor: colors.dark.surfaceMuted,
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
    backgroundColor: colors.dark.surfaceMuted,
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
    gap: spacing.sm,
    paddingBottom: spacing.md,
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
  heroBioText: {
    ...typography.body,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: "92%",
    opacity: 0.82,
  },
  mainContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
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
  bioCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bioText: {
    ...typography.body,
    lineHeight: 22,
  },
  linksCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  linksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  linkChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  linkChipLabel: {
    ...typography.caption,
    fontWeight: "600",
  },
  recentSection: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  thumbnailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
  },
  thumbnailCell: {
    width: "33.33%",
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
  },
  thumbnailCardBody: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  thumbnailCardTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  thumbnailCardDate: {
    fontSize: 10,
  },
  shareCardOffscreen: {
    position: "absolute",
    top: 0,
    left: -10000,
  },
  shareCard: {
    width: 360,
    backgroundColor: "#000000",
    overflow: "hidden",
    paddingBottom: 88,
  },
  shareCardBanner: {
    width: 360,
    height: 220,
    position: "relative",
  },
  shareCardBannerImage: {
    width: 360,
    height: 220,
  },
  shareCardBannerImageDefault: {
    transform: [{ translateX: -20 }],
  },
  shareCardBannerGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  shareCardBody: {
    flexDirection: "row",
    paddingBottom: 8,
  },
  shareCardLeft: {
    flex: 1,
    paddingTop: 16,
  },
  shareCardRight: {
    width: 175,
    paddingTop: 16,
    marginRight: 30,
    gap: 10,
  },
  shareCardAvatarWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: colors.dark.background,
    backgroundColor: colors.dark.surfaceMuted,
    marginTop: -45,
    marginLeft: 16,
  },
  shareCardAvatarImage: {
    width: "100%",
    height: "100%",
  },
  shareCardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
    paddingTop: 18,
  },
  shareCardName: {
    flex: 1,
    fontSize: 40,
    fontWeight: "700",
    color: "#F8FAFF",
    letterSpacing: 0.3,
    paddingLeft: 16,
    paddingBottom: 4,
  },
  shareCardBio: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  shareCardLinks: {
    paddingHorizontal: 16,
    gap: 8,
  },
  shareCardLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareCardLinkText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "500",
  },
  shareCardFeaturedLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  shareCardSongRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareCardSongTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    flex: 1,
  },
  shareCardGridSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 8,
  },
  shareCardGrid: {
    flexDirection: "row",
    gap: 4,
  },
  shareCardThumb: {
    flex: 1,
    height: 110,
    borderRadius: 10,
    overflow: "hidden",
  },
  shareCardFooter: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  shareCardFooterLogo: {
    width: 48,
    height: 48,
    resizeMode: "contain",
  },
  guestCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  guestIconWrap: {
    marginBottom: spacing.xs,
  },
  guestTitle: {
    ...typography.h2,
    textAlign: "center",
  },
  guestSubtitle: {
    ...typography.body,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  guestPerks: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  guestPerkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  guestPerkText: {
    ...typography.body,
  },
  guestSignInButton: {
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  guestSignInButtonText: {
    ...typography.body,
    fontWeight: "700",
  },
  loadingCard: {
    minHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.dark.border : colors.light.border,
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
    backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.dark.border : colors.light.border,
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
    backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
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
    backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
    borderWidth: 1,
    borderColor: isDarkMode ? colors.dark.border : colors.light.border,
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
    backgroundColor: isDarkMode ? colors.dark.surface : colors.light.surface,
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
  bioAccessory: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: isDarkMode ? colors.dark.surfaceMuted : "#D1D5DB",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: isDarkMode ? colors.dark.border : colors.light.border,
  },
  bioAccessoryDone: {
    ...typography.body,
    fontWeight: "600",
    color: colors.accent.primary,
  },
});
