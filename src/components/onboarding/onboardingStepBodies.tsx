import { useRef, type ReactNode, type RefObject } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  BIO_MAX_LENGTH,
  onboardingCopy as copy,
} from "@/constants/onboardingCopy";
import { onboardingTheme as theme } from "@/constants/onboardingTheme";
import { radius, spacing } from "@/constants/tokens";
import { StepKicker, StripeFill } from "./OnboardingVisuals";
import type { OnboardingProfileDraft } from "./OnboardingWizard";

export const ONBOARDING_BIO_INPUT_ACCESSORY_ID = "onboardingBioAccessory";

const SCREEN_WIDTH = Dimensions.get("window").width;
const POSTER_WIDTH = Math.min(236, Math.round(SCREEN_WIDTH * 0.58));
const POSTER_HEIGHT = Math.round(POSTER_WIDTH * (312 / 176));

function StepHead({
  kicker,
  title,
  body,
  centered = false,
  style,
}: {
  kicker?: string;
  title: string;
  body?: string;
  centered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.stepHead, centered && styles.stepHeadCentered, style]}>
      {kicker ? <StepKicker centered={centered}>{kicker}</StepKicker> : null}
      <Text style={[styles.h1, centered && styles.textCenter, !kicker && styles.h1NoKicker]}>
        {title}
      </Text>
      {body ? (
        <Text style={[styles.bodySecondary, centered && styles.textCenter]}>{body}</Text>
      ) : null}
    </View>
  );
}

function CompactStep({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.compactStep, style]}>{children}</View>;
}

function PermTile({
  icon,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.permTile, style]}>
      <StripeFill style={styles.permStripe} />
      <View style={styles.permIconWrap}>
        <View style={styles.permIconInner}>
          <Ionicons name={icon} size={48} color={theme.text} />
        </View>
      </View>
    </View>
  );
}

function HelperNote({
  children,
  centered = true,
}: {
  children: string;
  centered?: boolean;
}) {
  return (
    <View style={[styles.helperNote, !centered && styles.helperNoteStart]}>
      <Ionicons name="lock-closed-outline" size={15} color={theme.textSecondary} />
      <Text style={[styles.helperNoteText, centered && styles.textCenter]}>{children}</Text>
    </View>
  );
}

export function StepValueBody() {
  return (
    <CompactStep>
      <StepHead
        centered
        kicker={copy.value.eyebrow}
        title={copy.value.title}
        body={copy.value.body}
      />
      <View style={styles.posterWrap}>
        <View
          style={[
            styles.poster,
            theme.shadow.poster,
            { width: POSTER_WIDTH, height: POSTER_HEIGHT },
          ]}
        >
          <StripeFill dark />
          <Text style={styles.posterTag}>{copy.value.posterTag}</Text>
          <View style={styles.posterPlay}>
            <Ionicons name="play" size={22} color={theme.cardDark} style={{ marginLeft: 3 }} />
          </View>
          <View style={styles.posterFooter}>
            <View style={styles.posterAvatar}>
              <Ionicons name="person" size={14} color={theme.textSecondary} />
            </View>
            <Text style={styles.posterName}>{copy.value.posterName}</Text>
          </View>
        </View>
      </View>
    </CompactStep>
  );
}

const FLOW_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "image-outline",
  "musical-notes-outline",
  "share-outline",
];

export function StepFlowBody() {
  const windowHeight = Dimensions.get("window").height;
  const flowBlockHeight = Math.max(400, Math.round((windowHeight - 300) * 0.74));
  const [titleLead, titleTail] = copy.flow.title.split(", ");

  return (
    <CompactStep style={[styles.flowStep, { minHeight: flowBlockHeight }]}>
      <View style={[styles.flowStepHead, styles.stepHeadCentered]}>
        <StepKicker centered>{copy.flow.eyebrow}</StepKicker>
        <Text style={[styles.h1, styles.textCenter]}>{titleLead},</Text>
        <Text style={[styles.h1, styles.textCenter, styles.flowHeadLine]}>{titleTail}</Text>
      </View>

      <View style={styles.flowStack}>
        {copy.flow.rows.map((row, index) => (
          <View key={row.title} style={[styles.flowStepCard, theme.shadow.card]}>
            <View style={styles.flowStepCardMeta}>
              <View style={styles.flowIconTile}>
                <Ionicons name={FLOW_ICONS[index]} size={24} color={theme.text} />
              </View>
            </View>
            <Text style={styles.flowStepCardTitle}>{row.title}</Text>
            <Text style={styles.flowStepCardBody}>{row.body}</Text>
          </View>
        ))}
      </View>
    </CompactStep>
  );
}

export function StepPermPhotosBody() {
  return (
    <CompactStep>
      <StepHead
        centered
        kicker={copy.permPhotos.eyebrow}
        title={copy.permPhotos.title}
        body={copy.permPhotos.body}
        style={styles.permPhotosHead}
      />
      <PermTile icon="images-outline" style={styles.permStepTile} />
      <HelperNote>{copy.permPhotos.note}</HelperNote>
    </CompactStep>
  );
}

export function StepPermAudioBody() {
  return (
    <CompactStep>
      <StepHead
        centered
        kicker={copy.permAudio.eyebrow}
        title={copy.permAudio.title}
        body={copy.permAudio.body}
      />
      <PermTile icon="musical-notes-outline" style={styles.permStepTile} />
      <HelperNote>{copy.permAudio.note}</HelperNote>
    </CompactStep>
  );
}

type ProfileProps = {
  profile: OnboardingProfileDraft;
  onChange: (patch: Partial<OnboardingProfileDraft>) => void;
  showGuestHelper: boolean;
  onPickBanner: () => void;
  onPickAvatar: () => void;
  isPickingBanner: boolean;
  isPickingAvatar: boolean;
  bioInputRef: RefObject<TextInput | null>;
  onScrollToField: (fieldRef: RefObject<View | null>) => void;
};

export function StepProfileBody({
  profile,
  onChange,
  showGuestHelper,
  onPickBanner,
  onPickAvatar,
  isPickingBanner,
  isPickingAvatar,
  bioInputRef,
  onScrollToField,
}: ProfileProps) {
  const remaining = BIO_MAX_LENGTH - profile.bio.length;
  const hasBanner = Boolean(profile.heroUri);
  const hasAvatar = Boolean(profile.avatarUri);
  const nameBlockRef = useRef<View>(null);
  const bioBlockRef = useRef<View>(null);

  return (
    <View collapsable={false}>
      <View style={styles.stepHead}>
        <Text style={styles.h1}>{copy.profileSetup.title}</Text>
        <Text style={[styles.bodySecondary, { marginTop: 10 }]}>
          {copy.profileSetup.subtitle}
        </Text>
        {showGuestHelper ? (
          <View style={styles.guestRow}>
            <Ionicons name="person-circle-outline" size={15} color={theme.textSecondary} />
            <Text style={styles.guestText}>{copy.profileSetup.guestHelper}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.profileEdit}>
        <View style={styles.heroWrap}>
          <Pressable
            style={styles.heroButton}
            onPress={onPickBanner}
            disabled={isPickingBanner}
            accessibilityRole="button"
            accessibilityLabel={hasBanner ? copy.profileSetup.changeBanner : copy.profileSetup.addBanner}
          >
            <Image
              source={
                profile.heroUri
                  ? { uri: profile.heroUri }
                  : require("../../../assets/branding/MusicPromo-Banner.png")
              }
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.heroPill}>
              <Ionicons name="image-outline" size={14} color="#fff" />
              <Text style={styles.heroPillText}>
                {hasBanner ? copy.profileSetup.changeBanner : copy.profileSetup.addBanner}
              </Text>
            </View>
          </Pressable>
          <Pressable
            style={styles.avatarButton}
            onPress={onPickAvatar}
            disabled={isPickingAvatar}
            accessibilityRole="button"
          >
            <View style={styles.avatarRing}>
              <Image
                source={
                  profile.avatarUri
                    ? { uri: profile.avatarUri }
                    : require("../../../assets/defaults/MusicPromo-DefaultAvatar.jpg")
                }
                style={styles.avatarImage}
              />
            </View>
          </Pressable>
        </View>

        <Pressable onPress={onPickAvatar} style={styles.avatarCaptionBtn}>
          <Text style={styles.linkText}>
            {hasAvatar ? copy.profileSetup.changePhoto : copy.profileSetup.addPhoto}
          </Text>
        </Pressable>

        <View ref={nameBlockRef} collapsable={false} style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{copy.profileSetup.artistNameLabel}</Text>
            <Text style={styles.fieldCounter}>{copy.profileSetup.artistNameRequired}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={profile.artistName}
            onChangeText={(artistName) => onChange({ artistName })}
            placeholder={copy.profileSetup.artistNamePlaceholder}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
            returnKeyType="next"
            blurOnSubmit={false}
            onFocus={() => onScrollToField(nameBlockRef)}
            onSubmitEditing={() => bioInputRef.current?.focus()}
            inputAccessoryViewID={
              Platform.OS === "ios" ? ONBOARDING_BIO_INPUT_ACCESSORY_ID : undefined
            }
          />
        </View>

        <View ref={bioBlockRef} collapsable={false} style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{copy.profileSetup.bioLabel}</Text>
            <Text
              style={[
                styles.fieldCounter,
                remaining < 30 && { color: theme.warning },
              ]}
            >
              {remaining} left
            </Text>
          </View>
          <TextInput
            ref={bioInputRef}
            style={[styles.input, styles.textArea]}
            value={profile.bio}
            onChangeText={(bio) => onChange({ bio: bio.slice(0, BIO_MAX_LENGTH) })}
            placeholder={copy.profileSetup.bioPlaceholder}
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={BIO_MAX_LENGTH}
            textAlignVertical="top"
            blurOnSubmit={false}
            onFocus={() => onScrollToField(bioBlockRef)}
            inputAccessoryViewID={
              Platform.OS === "ios" ? ONBOARDING_BIO_INPUT_ACCESSORY_ID : undefined
            }
          />
        </View>
      </View>
    </View>
  );
}

export function StepReadyBody() {
  return (
    <CompactStep style={styles.readyWrap}>
      <View style={[styles.readyIcon, theme.shadow.card]}>
        <Ionicons name="checkmark" size={50} color={theme.bg} />
      </View>
      <StepKicker centered>{copy.ready.eyebrow}</StepKicker>
      <Text style={[styles.h1, styles.readyTitle]}>{copy.ready.title}</Text>
      <Text style={[styles.bodySecondary, styles.readyBody]}>{copy.ready.body}</Text>
    </CompactStep>
  );
}

const styles = StyleSheet.create({
  compactStep: {
    width: "100%",
  },
  stepHead: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
  },
  stepHeadCentered: {
    alignItems: "center",
  },
  textCenter: {
    textAlign: "center",
  },
  h1: {
    marginTop: 8,
    fontSize: 28,
    lineHeight: 33,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: theme.text,
  },
  h1NoKicker: {
    marginTop: 0,
  },
  bodySecondary: {
    marginTop: 10,
    fontSize: 16,
    lineHeight: 23,
    color: theme.textSecondary,
  },
  posterWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 16,
    paddingBottom: 0,
  },
  poster: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: theme.cardDark,
  },
  posterTag: {
    position: "absolute",
    top: 12,
    right: 12,
    fontSize: 10,
    letterSpacing: 0.4,
    color: "rgba(255,255,255,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(14,16,20,0.5)",
    borderRadius: 4,
  },
  posterPlay: {
    position: "absolute",
    left: "50%",
    top: "42%",
    marginLeft: -26,
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  posterFooter: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  posterAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  posterName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
  flowStep: {
    justifyContent: "center",
  },
  flowStepHead: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  flowHeadLine: {
    marginTop: 0,
  },
  flowStack: {
    flex: 1,
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    minHeight: 300,
    justifyContent: "center",
  },
  flowStepCard: {
    flex: 1,
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  flowStepCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  flowIconTile: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: theme.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  flowStepCardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: theme.text,
    textAlign: "center",
  },
  flowStepCardBody: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.textSecondary,
    textAlign: "center",
  },
  permTile: {
    marginHorizontal: spacing.lg,
    marginTop: 20,
    height: 210,
    borderRadius: radius.lg,
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...theme.shadow.card,
  },
  permStripe: {
    opacity: 0.45,
  },
  permIconWrap: {
    width: 112,
    height: 112,
    borderRadius: radius.lg,
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  permIconInner: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: theme.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  permPhotosHead: {
    paddingHorizontal: spacing.lg,
  },
  permStepTile: {
    marginTop: spacing.lg,
    height: 320,
  },
  helperNote: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    flexDirection: "column",
    gap: spacing.sm,
    alignItems: "center",
  },
  helperNoteStart: {
    alignItems: "flex-start",
  },
  helperNoteText: {
    flexShrink: 1,
    maxWidth: 300,
    fontSize: 13,
    lineHeight: 18,
    color: theme.textSecondary,
  },
  guestRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  guestText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  profileEdit: {
    paddingHorizontal: spacing.lg,
    paddingTop: 20,
  },
  heroWrap: {
    position: "relative",
  },
  heroButton: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceMuted,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPill: {
    position: "absolute",
    right: 10,
    bottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: "rgba(14,16,20,0.62)",
  },
  heroPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  avatarButton: {
    position: "absolute",
    left: 16,
    bottom: -30,
  },
  avatarRing: {
    borderRadius: 39,
    borderWidth: 3,
    borderColor: theme.bg,
    overflow: "hidden",
  },
  avatarImage: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },
  avatarCaptionBtn: {
    marginTop: 9,
    marginLeft: 106,
    minHeight: 26,
    justifyContent: "center",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.accentLink,
  },
  field: {
    marginTop: 18,
  },
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 7,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: -0.1,
    color: theme.textSecondary,
  },
  fieldCounter: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.textSecondary,
  },
  input: {
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: theme.text,
  },
  textArea: {
    minHeight: 84,
    lineHeight: 21,
  },
  readyWrap: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    textAlign: "center",
  },
  readyIcon: {
    marginBottom: 16,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.text,
    alignItems: "center",
    justifyContent: "center",
  },
  readyTitle: {
    textAlign: "center",
  },
  readyBody: {
    maxWidth: 300,
    textAlign: "center",
  },
});
