import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [localArtistProfile, setLocalArtistProfileState] = useState(
    DEFAULT_LOCAL_ARTIST_PROFILE,
  );
  const [isLocalArtistProfileReady, setIsLocalArtistProfileReady] =
    useState(false);

  const [artistNameDraft, setArtistNameDraft] = useState("");
  const [avatarImageUrlDraft, setAvatarImageUrlDraft] = useState<string | null>(
    null,
  );
  const [linksDraft, setLinksDraft] = useState<DraftProfileLink[]>([]);

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

  const displayEmail = usesLocalProfile
    ? "Local-only session"
    : convexUser?.email ?? clerkUser?.primaryEmailAddress?.emailAddress ?? "No email";

  const sourceArtistName = usesLocalProfile
    ? localArtistProfile.artistName
    : convexUser?.artistName ?? "";

  const sourceAvatarImageUrl = usesLocalProfile
    ? localArtistProfile.avatarImageUrl
    : convexUser?.avatarImageUrl ?? null;

  const sourceLinks = useMemo(
    () =>
      normalizeDraftLinks(
        usesLocalProfile ? localArtistProfile.links : (convexUser?.links ?? []),
      ),
    [usesLocalProfile, localArtistProfile.links, convexUser?.links],
  );

  useEffect(() => {
    if (isProfileLoading) return;
    setArtistNameDraft(sourceArtistName);
    setAvatarImageUrlDraft(sourceAvatarImageUrl);
    setLinksDraft(sourceLinks);
  }, [isProfileLoading, sourceArtistName, sourceAvatarImageUrl, sourceLinks]);

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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;

      const picked = result.assets[0];
      const persistedUri = await persistPickedMediaFile({
        sourceUri: picked.uri,
        fileNameHint:
          picked.fileName ?? picked.uri.split("/").pop() ?? "artist-avatar.jpg",
      });
      setAvatarImageUrlDraft(persistedUri);
    } catch {
      Alert.alert(
        "Profile image not saved",
        "Could not load that image. Please try another one.",
      );
    } finally {
      setIsPickingAvatar(false);
    }
  }, []);

  const saveProfile = useCallback(async () => {
    if (isSavingProfile || isSigningOut || isDeleting) return;

    setErrorText(null);
    setIsSavingProfile(true);

    try {
      const artistName = artistNameDraft.trim();
      const avatarImageUrl = avatarImageUrlDraft?.trim()
        ? avatarImageUrlDraft.trim()
        : null;

      const normalizedLinks: ProfileLink[] = [];
      for (const link of linksDraft) {
        const trimmedUrl = link.url.trim();
        if (!trimmedUrl) continue;

        const normalizedUrl = normalizeProfileUrl(trimmedUrl);
        if (!normalizedUrl) {
          setErrorText(
            `Invalid URL for ${PLATFORM_LABELS[link.platform]}. Check the link and try again.`,
          );
          return;
        }

        normalizedLinks.push({
          platform: link.platform,
          url: normalizedUrl,
          sortOrder: normalizedLinks.length,
        });
      }

      if (usesLocalProfile) {
        const saved = await setLocalArtistProfile({
          artistName,
          avatarImageUrl,
          links: normalizedLinks,
        });
        setLocalArtistProfileState(saved);
      } else {
        await ensureUserRecord(convexUser);
        await updateProfile({
          artistName: artistName || null,
          avatarImageUrl,
          links: normalizedLinks,
        });
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
  }, [
    artistNameDraft,
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
  ]);

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

  const availablePlatforms = useMemo(() => {
    const used = new Set(linksDraft.map((link) => link.platform));
    return PROFILE_LINK_PLATFORMS.filter((platform) => !used.has(platform));
  }, [linksDraft]);
  const connectedPlatformsCount = useMemo(
    () => linksDraft.filter((link) => link.url.trim().length > 0).length,
    [linksDraft],
  );
  const artistNameStatus = artistNameDraft.trim().length > 0 ? "Set" : "Empty";

  const actionsDisabled = isSigningOut || isDeleting;
  const profileInputsDisabled =
    isProfileLoading || isSavingProfile || isSigningOut || isDeleting || isPickingAvatar;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.backgroundOrbPrimary} />
      <View style={styles.backgroundOrbSecondary} />
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Artist identity and distribution links</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarFrame}>
            <View style={styles.avatar}>
              {avatarImageUrlDraft ? (
                <Image source={{ uri: avatarImageUrlDraft }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={36} color={colors.light.textSecondary} />
              )}
            </View>
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>
          <View style={styles.profileMetaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Artist</Text>
              <Text style={styles.metaValue}>{artistNameStatus}</Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaLabel}>Links</Text>
              <Text style={styles.metaValue}>{connectedPlatformsCount}</Text>
            </View>
          </View>
          {isGuest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Guest Session</Text>
            </View>
          )}
          {isProfileLoading ? (
            <View style={styles.profileLoadingRow}>
              <ActivityIndicator color={colors.accent.primary} />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <View style={styles.profileEditor}>
              <Text style={styles.profileEditorTitle}>Artist Profile</Text>
              <View style={styles.settingBlock}>
                <Text style={styles.settingLabel}>Artist Name</Text>
                <TextInput
                  value={artistNameDraft}
                  onChangeText={setArtistNameDraft}
                  placeholder="Artist name"
                  placeholderTextColor="#7F7F86"
                  editable={!profileInputsDisabled}
                  style={styles.textInput}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>

              <View style={styles.settingBlock}>
                <Text style={styles.settingLabel}>Profile Picture</Text>
                <View style={styles.optionRow}>
                  <Pressable
                    onPress={() => {
                      void handlePickAvatar();
                    }}
                    disabled={profileInputsDisabled}
                    style={({ pressed }) => [
                      styles.optionChip,
                      pressed && !profileInputsDisabled && styles.optionChipPressed,
                    ]}
                    accessibilityLabel="Pick profile picture"
                    accessibilityRole="button"
                  >
                    {isPickingAvatar ? (
                      <ActivityIndicator size="small" color={colors.light.textSecondary} />
                    ) : (
                      <Text style={styles.optionChipText}>Upload</Text>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => setAvatarImageUrlDraft(null)}
                    disabled={profileInputsDisabled || !avatarImageUrlDraft}
                    style={({ pressed }) => [
                      styles.optionChip,
                      styles.optionChipDanger,
                      (profileInputsDisabled || !avatarImageUrlDraft) &&
                        styles.optionChipDisabled,
                      pressed &&
                        !profileInputsDisabled &&
                        avatarImageUrlDraft &&
                        styles.optionChipPressed,
                    ]}
                    accessibilityLabel="Remove profile picture"
                    accessibilityRole="button"
                  >
                    <Text style={styles.optionChipDangerText}>Remove</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.settingBlock}>
                <Text style={styles.settingLabel}>Connected Platforms</Text>

                <View style={styles.platformChipWrap}>
                  {availablePlatforms.map((platform) => (
                    <Pressable
                      key={`add-${platform}`}
                      onPress={() => handleAddLink(platform)}
                      disabled={profileInputsDisabled}
                      style={({ pressed }) => [
                        styles.addPlatformChip,
                        pressed && !profileInputsDisabled && styles.optionChipPressed,
                      ]}
                      accessibilityLabel={`Add ${PLATFORM_LABELS[platform]} link`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="add" size={13} color={colors.light.textSecondary} />
                      <Text style={styles.addPlatformChipText}>{PLATFORM_LABELS[platform]}</Text>
                    </Pressable>
                  ))}
                </View>

                {linksDraft.length === 0 ? (
                  <Text style={styles.emptyLinksText}>
                    Add platforms above to include profile links.
                  </Text>
                ) : null}

                {linksDraft.map((link) => (
                  <View key={link.platform} style={styles.linkRow}>
                    <View style={styles.linkHeader}>
                      <Text style={styles.linkPlatform}>{PLATFORM_LABELS[link.platform]}</Text>
                      <Pressable
                        onPress={() => handleRemoveLink(link.platform)}
                        disabled={profileInputsDisabled}
                        style={({ pressed }) => [
                          styles.linkRemoveButton,
                          pressed && !profileInputsDisabled && styles.optionChipPressed,
                        ]}
                        accessibilityLabel={`Remove ${PLATFORM_LABELS[link.platform]} link`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="close" size={16} color={colors.light.textSecondary} />
                      </Pressable>
                    </View>
                    <TextInput
                      value={link.url}
                      onChangeText={(text) => handleUpdateLinkUrl(link.platform, text)}
                      placeholder="https://"
                      placeholderTextColor="#7F7F86"
                      editable={!profileInputsDisabled}
                      style={styles.linkInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                    />
                  </View>
                ))}
              </View>

              <Pressable
                onPress={() => {
                  void saveProfile();
                }}
                disabled={profileInputsDisabled}
                style={({ pressed }) => [
                  styles.saveButton,
                  profileInputsDisabled && styles.saveButtonDisabled,
                  pressed && !profileInputsDisabled && styles.optionChipPressed,
                ]}
                accessibilityLabel="Save profile"
                accessibilityRole="button"
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Profile</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>

        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              pressed && !actionsDisabled && styles.actionRowPressed,
            ]}
            onPress={handleSignOut}
            disabled={actionsDisabled}
            accessibilityLabel="Sign out"
            accessibilityRole="button"
          >
            <View style={styles.actionRowLeft}>
              <Ionicons name="log-out-outline" size={20} color={colors.light.text} />
              <Text style={styles.actionText}>
                {isLocalGuest ? "Exit Guest Mode" : "Sign Out"}
              </Text>
            </View>
            {isSigningOut ? (
              <ActivityIndicator size="small" color={colors.light.textSecondary} />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.light.textSecondary}
              />
            )}
          </Pressable>

          {!isLocalGuest ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && !actionsDisabled && styles.deleteRowPressed,
                ]}
                onPress={handleDeleteAccount}
                disabled={actionsDisabled}
                accessibilityLabel="Delete account"
                accessibilityRole="button"
              >
                <View style={styles.actionRowLeft}>
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.accent.error}
                  />
                  <Text style={styles.deleteText}>Delete Account</Text>
                </View>
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.accent.error} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={colors.light.textSecondary}
                  />
                )}
              </Pressable>

              <Text style={styles.warningText}>
                Deleting deactivates your account for v1 while keeping records recoverable.
              </Text>
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
    position: "relative",
  },
  content: {
    paddingTop: spacing.sm,
    paddingBottom: 0,
  },
  backgroundOrbPrimary: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(88, 86, 214, 0.08)",
    top: -90,
    right: -80,
  },
  backgroundOrbSecondary: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(245, 133, 41, 0.07)",
    top: 110,
    left: -110,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.light.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: "#6E6A8C",
    marginTop: spacing.xs,
    letterSpacing: 0.5,
  },
  profileCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E3E2F0",
  },
  profileLoadingRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#ECEBF5",
  },
  profileEditor: {
    width: "100%",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "#ECEBF5",
  },
  profileEditorTitle: {
    ...typography.caption,
    color: "#7B769D",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  avatarFrame: {
    width: 94,
    height: 94,
    borderRadius: radius.full,
    padding: 3,
    backgroundColor: "#6C66E8",
    marginBottom: spacing.md,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: radius.full,
    backgroundColor: "#F2F1FB",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  name: {
    ...typography.h2,
    color: colors.light.text,
  },
  email: {
    ...typography.body,
    color: colors.light.textSecondary,
    marginTop: spacing.xs,
  },
  profileMetaRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
  },
  metaPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#DEDDF0",
    backgroundColor: "#F6F5FF",
    paddingHorizontal: spacing.md,
    minHeight: 30,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  metaLabel: {
    ...typography.caption,
    color: "#7C78A0",
  },
  metaValue: {
    ...typography.caption,
    color: colors.light.text,
    fontWeight: "700",
  },
  guestBadge: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: "#FFF3E9",
    borderWidth: 1,
    borderColor: "#F3CCAD",
  },
  guestBadgeText: {
    ...typography.caption,
    color: "#9B4E1A",
    fontWeight: "600",
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  loadingText: {
    ...typography.body,
    color: colors.light.textSecondary,
  },
  settingBlock: {
    width: "100%",
    backgroundColor: "#F7F7FB",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#E2E1ED",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
    color: colors.light.text,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  textInput: {
    ...typography.body,
    color: colors.light.text,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#D3D2E3",
    backgroundColor: "#FFFFFF",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  optionChip: {
    flex: 1,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#D3D2E3",
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    minHeight: 42,
  },
  optionChipDanger: {
    borderColor: "#F1C8CF",
    backgroundColor: "#FFF6F7",
  },
  optionChipDisabled: {
    opacity: 0.5,
  },
  optionChipPressed: {
    opacity: 0.85,
  },
  optionChipText: {
    ...typography.body,
    color: colors.light.textSecondary,
    fontWeight: "600",
  },
  optionChipDangerText: {
    ...typography.body,
    color: colors.accent.error,
    fontWeight: "600",
  },
  platformChipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  addPlatformChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#D3D2E3",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  addPlatformChipText: {
    ...typography.caption,
    color: colors.light.textSecondary,
    fontWeight: "600",
  },
  emptyLinksText: {
    ...typography.caption,
    color: "#8E8BA7",
    marginBottom: spacing.sm,
  },
  linkRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#D3D2E3",
    backgroundColor: "#FFFFFF",
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
    color: "#5C5A76",
    fontWeight: "600",
  },
  linkInput: {
    ...typography.body,
    color: colors.light.text,
    flex: 1,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#D3D2E3",
    backgroundColor: "#FAFAFF",
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
    minHeight: 48,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent.primary,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: "#4D4BC9",
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  errorText: {
    ...typography.caption,
    color: colors.accent.error,
    marginTop: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  actionRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.light.border,
    marginBottom: spacing.sm,
  },
  actionRowPressed: {
    opacity: 0.86,
  },
  deleteRowPressed: {
    backgroundColor: "#FFF2F3",
  },
  actionRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionText: {
    ...typography.body,
    color: colors.light.text,
    fontWeight: "600",
  },
  deleteText: {
    ...typography.body,
    color: colors.accent.error,
    fontWeight: "600",
  },
  warningText: {
    ...typography.caption,
    color: "#7F7F86",
    lineHeight: 18,
    marginTop: spacing.xs,
  },
});
