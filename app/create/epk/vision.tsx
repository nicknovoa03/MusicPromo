import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { decodeUriParam, encodeUriParam } from "@/lib/uri";
import { normalizeMediaUri } from "@/lib/mediaUri";

const MAX_VISION_CHARS = 280;

function firstParam(p: string | string[] | undefined): string {
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

export default function EpkVisionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    photoUri: string;
    photoName: string;
    title: string;
    linkedProjectId: string;
    templateName: string;
    clipDurationSec: string;
  }>();

  const photoUri = normalizeMediaUri(decodeUriParam(firstParam(params.photoUri)));
  const photoName = firstParam(params.photoName);
  const title = firstParam(params.title);
  const linkedProjectId = firstParam(params.linkedProjectId) || null;
  const templateName = firstParam(params.templateName) || null;
  const clipDurationSec = params.clipDurationSec ? Number(firstParam(params.clipDurationSec)) || null : null;

  const [vision, setVision] = useState("");
  const remaining = MAX_VISION_CHARS - vision.length;
  const canAdvance = vision.trim().length > 0;

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    router.push({
      pathname: "/create/epk/preview" as any,
      params: {
        photoUri: encodeUriParam(photoUri ?? ""),
        photoName,
        title,
        linkedProjectId: linkedProjectId ?? "",
        templateName: templateName ?? "",
        clipDurationSec: clipDurationSec != null ? String(clipDurationSec) : "",
        vision: vision.trim(),
      },
    });
  }, [canAdvance, router, photoUri, photoName, title, linkedProjectId, templateName, clipDurationSec, vision]);

  const text = colors.dark.text;
  const secondary = colors.dark.textSecondary;
  const surface = colors.dark.surface;
  const border = colors.dark.border;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={22} color={text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]}>Vision</Text>
        <Text style={[styles.stepLabel, { color: secondary }]}>2 of 3</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Track preview strip */}
          <View style={[styles.trackStrip, { backgroundColor: surface, borderColor: border }]}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.stripThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.stripThumb, styles.stripThumbEmpty]}>
                <Ionicons name="image-outline" size={18} color={secondary} />
              </View>
            )}
            <Text style={[styles.stripTitle, { color: text }]} numberOfLines={1}>
              {title || "Untitled"}
            </Text>
          </View>

          {/* Vision input */}
          <Text style={[styles.inputLabel, { color: secondary }]}>
            Vision / Concept
          </Text>
          <View style={[styles.inputCard, { backgroundColor: surface, borderColor: border }]}>
            <TextInput
              style={[styles.textInput, { color: text }]}
              placeholder={"What's the story behind this track?"}
              placeholderTextColor={colors.dark.textSecondary}
              value={vision}
              onChangeText={(v) => {
                if (v.length <= MAX_VISION_CHARS) setVision(v);
              }}
              multiline
              autoFocus
              returnKeyType="default"
              textAlignVertical="top"
            />
            <Text
              style={[
                styles.charCounter,
                { color: remaining <= 30 ? "#FF6B6B" : secondary },
              ]}
            >
              {remaining}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            !canAdvance && styles.nextButtonDisabled,
            pressed && canAdvance && styles.pressed,
          ]}
          onPress={handleNext}
          disabled={!canAdvance}
          accessibilityRole="button"
          accessibilityLabel="Next step"
          accessibilityState={{ disabled: !canAdvance }}
        >
          <Text style={[styles.nextButtonText, !canAdvance && styles.nextButtonTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={canAdvance ? colors.accent.onPrimary : secondary}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    ...typography.body,
    fontWeight: "600",
    flex: 1,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  trackStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.lg,
  },
  stripThumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  stripThumbEmpty: {
    backgroundColor: colors.dark.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stripTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  inputCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    minHeight: 180,
  },
  textInput: {
    fontSize: 17,
    lineHeight: 24,
    flex: 1,
    minHeight: 140,
    padding: 0,
  },
  charCounter: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "right",
    marginTop: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.dark.border,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.accent.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  nextButtonDisabled: {
    opacity: 0.3,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.accent.onPrimary,
  },
  nextButtonTextDisabled: {
    color: colors.dark.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
});
