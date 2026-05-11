import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const profileLinkPlatform = v.union(
  v.literal("spotify"),
  v.literal("soundcloud"),
  v.literal("apple-music"),
  v.literal("youtube"),
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("x"),
  v.literal("website"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.optional(v.string()),
    artistName: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    avatarImageUrl: v.optional(v.string()),
    heroImageUrl: v.optional(v.string()),
    bio: v.optional(v.string()),
    links: v.optional(
      v.array(
        v.object({
          platform: profileLinkPlatform,
          url: v.string(),
          sortOrder: v.optional(v.number()),
        }),
      ),
    ),
    isGuest: v.boolean(),
    onboardingCompletedAt: v.optional(v.number()),
    // Legacy fields — no longer written, kept for existing records.
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
    preferences: v.optional(
      v.object({
        defaultAspectRatio: v.optional(
          v.union(v.literal("9:16"), v.literal("4:5"), v.literal("1:1"))
        ),
        defaultVideoLength: v.optional(
          v.union(v.literal(15), v.literal(30), v.literal(60))
        ),
      })
    ),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  projects: defineTable({
    userId: v.id("users"),
    createdByName: v.optional(v.string()),
    createdByEmail: v.optional(v.string()),
    title: v.optional(v.string()),
    templateId: v.optional(v.string()),
    templateTweaks: v.optional(v.string()),
    aspectRatio: v.union(v.literal("9:16"), v.literal("4:5"), v.literal("1:1")),
    videoLength: v.optional(v.number()),
    photoUri: v.optional(v.string()),
    photoName: v.optional(v.string()),
    audioUri: v.optional(v.string()),
    audioName: v.optional(v.string()),
    exportedVideoUri: v.optional(v.string()),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
    type: v.optional(v.union(v.literal("video"), v.literal("spk"))),
    vision: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("exported")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  pushTokens: defineTable({
    userId: v.id("users"),
    expoPushToken: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_and_token", ["userId", "expoPushToken"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("reminder"),
      v.literal("new-template"),
      v.literal("export-complete"),
      v.literal("announcement")
    ),
    title: v.string(),
    body: v.string(),
    read: v.boolean(),
    trigger: v.union(v.literal("automated"), v.literal("manual")),
    sentAt: v.number(),
  }).index("by_user_and_sent_at", ["userId", "sentAt"]),

  templates: defineTable({
    name: v.string(),
    description: v.string(),
    previewImageUrl: v.optional(v.string()),
    type: v.string(),
    config: v.any(),
  }),

  betaSignups: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
