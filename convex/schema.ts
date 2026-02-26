import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isGuest: v.boolean(),
    preferences: v.optional(
      v.object({
        defaultAspectRatio: v.optional(
          v.union(v.literal("9:16"), v.literal("1:1"))
        ),
        defaultVideoLength: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
  }).index("by_clerk_id", ["clerkId"]),

  projects: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    templateId: v.optional(v.string()),
    aspectRatio: v.union(v.literal("9:16"), v.literal("1:1")),
    videoLength: v.optional(v.number()),
    photoUri: v.optional(v.string()),
    audioUri: v.optional(v.string()),
    exportedVideoUri: v.optional(v.string()),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
    status: v.union(v.literal("draft"), v.literal("exported")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  templates: defineTable({
    name: v.string(),
    description: v.string(),
    previewImageUrl: v.optional(v.string()),
    type: v.string(),
    config: v.any(),
  }),
});
