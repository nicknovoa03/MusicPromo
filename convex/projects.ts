import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getActiveUserByIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user || user.isDeleted) return null;
  return user;
}

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
    const user = await getActiveUserByIdentity(ctx);

    if (!user) throw new Error("Unauthenticated");

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
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await getActiveUserByIdentity(ctx);

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

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    templateId: v.optional(v.string()),
    aspectRatio: v.optional(v.union(v.literal("9:16"), v.literal("1:1"))),
    photoUri: v.optional(v.string()),
    audioUri: v.optional(v.string()),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
    exportedVideoUri: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("exported"))),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await getActiveUserByIdentity(ctx);

    if (!user || project.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const updates: Record<string, string | number | undefined> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.templateId !== undefined) updates.templateId = args.templateId;
    if (args.aspectRatio !== undefined) updates.aspectRatio = args.aspectRatio;
    if (args.photoUri !== undefined) updates.photoUri = args.photoUri;
    if (args.audioUri !== undefined) updates.audioUri = args.audioUri;
    if (args.trimStart !== undefined) updates.trimStart = args.trimStart;
    if (args.trimEnd !== undefined) updates.trimEnd = args.trimEnd;
    if (args.exportedVideoUri !== undefined) {
      updates.exportedVideoUri = args.exportedVideoUri;
    }
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.projectId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return args.projectId;
  },
});

export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getActiveUserByIdentity(ctx);

    if (!user) return [];

    return await ctx.db
      .query("projects")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});
