import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, typography, spacing, radius } from "@/constants/tokens";

interface TypePickerScreenProps {
  tabEmbedded?: boolean;
}

const PROJECT_TYPES = [
  {
    id: "music-promo",
    title: "Music Promo",
    description: "Turn a photo + audio clip into a short promo video",
    icon: "film-outline" as const,
    route: "/create/picker" as const,
    isNew: false,
  },
  {
    id: "spk",
    title: "Song Press Kit",
    description: "Generate a 4-slide Instagram carousel for a track",
    icon: "layers-outline" as const,
    route: "/create/spk/details" as const,
    isNew: true,
  },
] as const;

export default function TypePickerScreen({ tabEmbedded = false }: TypePickerScreenProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const bg = isDark ? colors.dark.background : colors.light.background;
  const surface = isDark ? colors.dark.surface : colors.light.surface;
  const text = isDark ? colors.dark.text : colors.light.text;
  const secondary = isDark ? colors.dark.textSecondary : colors.light.textSecondary;
  const border = isDark ? colors.dark.border : colors.light.border;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bg }]}
      edges={tabEmbedded ? ["top"] : ["top", "bottom"]}
    >
      {!tabEmbedded ? (
        <View style={styles.header}>
          <Pressable
            style={[styles.closeButton, { backgroundColor: surface }]}
            onPress={() => router.back()}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color={text} />
          </Pressable>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: text }]}>New Project</Text>
          <Text style={[styles.subtitle, { color: secondary }]}>
            What are you making?
          </Text>
        </View>

        <View style={styles.cards}>
          {PROJECT_TYPES.map((type) => (
            <Pressable
              key={type.id}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: surface, borderColor: border },
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(type.route as any)}
              accessibilityRole="button"
              accessibilityLabel={type.title}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.accent.fill }]}>
                <Ionicons name={type.icon} size={22} color={colors.accent.onFill} />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: text }]}>{type.title}</Text>
                  {type.isNew ? (
                    <View style={[styles.newBadge, { backgroundColor: colors.accent.fill }]}>
                      <Text style={styles.newBadgeText}>New</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.cardDescription, { color: secondary }]}>
                  {type.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={secondary} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    alignItems: "flex-start",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  titleBlock: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
  },
  cards: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 3,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  newBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
