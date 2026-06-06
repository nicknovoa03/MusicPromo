import { Image, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Doc } from "../../convex/_generated/dataModel";
import { colors } from "@/constants/tokens";
import type { LocalProject } from "@/lib/localProjects";
import {
  extractShareLinkHandle,
  SHARE_LINK_ICONS,
  SHARE_PLATFORM_LABELS,
  type ShareCardLink,
} from "@/lib/shareCardUtils";
import type { ProfileLinkPlatform } from "@/lib/localProfile";
import { ProjectThumbnail } from "@/components/ProjectThumbnail";

export const SHARE_CARD_WIDTH = 360;

type Project = Doc<"projects"> | LocalProject;

function getProjectKey(project: Project): string {
  return "_id" in project ? String(project._id) : project.id;
}

export type ShareCardPreviewProps = {
  artistName: string;
  displayNameFallback?: string;
  bio?: string;
  heroUri?: string | null;
  avatarUri?: string | null;
  links?: ShareCardLink[];
  projects?: Project[];
  emptyPromosMessage?: string;
  onBannerLoad?: () => void;
  /** Scale down for inline onboarding preview (e.g. 0.55). */
  previewScale?: number;
};

export function ShareCardPreview({
  artistName,
  displayNameFallback = "Artist",
  bio = "",
  heroUri = null,
  avatarUri = null,
  links = [],
  projects = [],
  emptyPromosMessage,
  onBannerLoad,
  previewScale = 1,
}: ShareCardPreviewProps) {
  const name = artistName.trim() || displayNameFallback;
  const visibleProjects = projects.slice(0, 3);
  const songProjects = visibleProjects.filter((p) => p.audioName ?? p.title);
  const scaled = previewScale !== 1;

  const card = (
    <View style={styles.shareCard}>
      <View style={styles.shareCardBanner}>
        <Image
          source={
            heroUri
              ? { uri: heroUri }
              : require("../../assets/branding/MusicPromo-Banner.png")
          }
          style={[styles.shareCardBannerImage, !heroUri && styles.shareCardBannerImageDefault]}
          resizeMode="cover"
          onLoad={onBannerLoad}
        />
        <View style={styles.shareCardBannerGradient} />
      </View>

      <View style={styles.shareCardNameRow}>
        <View style={styles.shareCardAvatarWrap}>
          <Image
            source={
              avatarUri
                ? { uri: avatarUri }
                : require("../../assets/defaults/MusicPromo-DefaultAvatar.jpg")
            }
            style={styles.shareCardAvatarImage}
          />
        </View>
        <Text
          style={styles.shareCardName}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {name}
        </Text>
      </View>

      {bio.trim() ? (
        <Text style={styles.shareCardBio} numberOfLines={4}>
          {bio.trim()}
        </Text>
      ) : null}

      <View style={styles.shareCardBody}>
        <View style={styles.shareCardLeft}>
          {links.length > 0 ? (
            <View style={styles.shareCardLinks}>
              <Text style={styles.shareCardFeaturedLabel}>Socials</Text>
              {links.slice(0, 4).map((link) => {
                const platform = link.platform as ProfileLinkPlatform;
                const handle = extractShareLinkHandle(platform, link.url);
                const iconName =
                  SHARE_LINK_ICONS[platform] ?? ("link-outline" as keyof typeof Ionicons.glyphMap);
                return (
                  <View key={link.platform} style={styles.shareCardLinkRow}>
                    <Ionicons
                      name={iconName as keyof typeof Ionicons.glyphMap}
                      size={14}
                      color="rgba(255,255,255,0.7)"
                    />
                    <Text style={styles.shareCardLinkText} numberOfLines={1}>
                      {handle || SHARE_PLATFORM_LABELS[platform]}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.shareCardRight}>
          {songProjects.length > 0 ? (
            <>
              <Text style={styles.shareCardFeaturedLabel}>Songs</Text>
              {songProjects.map((project) => (
                <View key={getProjectKey(project)} style={styles.shareCardSongRow}>
                  <Ionicons name="musical-note" size={11} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.shareCardSongTitle} numberOfLines={1}>
                    {project.audioName ?? project.title}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </View>

      {visibleProjects.length > 0 ? (
        <View style={styles.shareCardGridSection}>
          <Text style={styles.shareCardFeaturedLabel}>Music Promos</Text>
          <View style={styles.shareCardGrid}>
            {visibleProjects.map((project) => (
              <View key={getProjectKey(project)} style={styles.shareCardThumb}>
                <ProjectThumbnail
                  project={project}
                  title={project.title ?? ""}
                  surfaceColor="transparent"
                  fallbackIconColor={colors.dark.textSecondary}
                />
              </View>
            ))}
          </View>
        </View>
      ) : emptyPromosMessage ? (
        <View style={styles.shareCardEmptyPromos}>
          <Text style={styles.shareCardEmptyPromosText}>{emptyPromosMessage}</Text>
        </View>
      ) : null}

      <View style={styles.shareCardFooter}>
        <Image
          source={require("../../assets/branding/MusicPromo-Logo.png")}
          style={styles.shareCardFooterLogo}
        />
      </View>
    </View>
  );

  if (!scaled) return card;

  const estimatedHeight = 520;

  return (
    <View
      style={[
        styles.scaledWrap,
        {
          width: SHARE_CARD_WIDTH * previewScale,
          height: estimatedHeight * previewScale,
        },
      ]}
    >
      <View style={{ transform: [{ scale: previewScale }], width: SHARE_CARD_WIDTH }}>
        {card}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scaledWrap: {
    overflow: "hidden",
    alignSelf: "center",
  },
  shareCard: {
    width: SHARE_CARD_WIDTH,
    backgroundColor: "#000000",
    overflow: "hidden",
    paddingBottom: 88,
  },
  shareCardBanner: {
    width: SHARE_CARD_WIDTH,
    height: 220,
    position: "relative",
  },
  shareCardBannerImage: {
    width: SHARE_CARD_WIDTH,
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
  shareCardEmptyPromos: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  shareCardEmptyPromosText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    fontStyle: "italic",
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
});
