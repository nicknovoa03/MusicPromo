import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    templateId: v.optional(v.string()),
    aspectRatio: v.union(v.literal("9:16"), v.literal("1:1")),
    photoUri: v.optional(v.string()),
    audioUri: v.optional(v.string()),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const now = Date.now();
    return await ctx.db.insert("projects", {
      userId: user._id,
      title: args.title,
      templateId: args.templateId,
      aspectRatio: args.aspectRatio,
      photoUri: args.photoUri,
      audioUri: args.audioUri,
      trimStart: args.trimStart,
      trimEnd: args.trimEnd,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const markExported = mutation({
  args: {
    projectId: v.id("projects"),
    exportedVideoUri: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user || project.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.projectId, {
      status: "exported",
      exportedVideoUri: args.exportedVideoUri,
      updatedAt: Date.now(),
    });
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return [];

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});
