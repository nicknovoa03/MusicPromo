import { ConvexError, v } from "convex/values";
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
    templateTweaks: v.optional(v.string()),
    aspectRatio: v.union(v.literal("9:16"), v.literal("4:5"), v.literal("1:1")),
    photoUri: v.optional(v.string()),
    photoName: v.optional(v.string()),
    audioUri: v.optional(v.string()),
    audioName: v.optional(v.string()),
    trimStart: v.optional(v.number()),
    trimEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getActiveUserByIdentity(ctx);

    if (!user) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Sign in required",
      });
    }

    const now = Date.now();
    const projectDoc: {
      userId: typeof user._id;
      aspectRatio: "9:16" | "4:5" | "1:1";
      status: "draft";
      createdAt: number;
      updatedAt: number;
      title?: string;
      templateId?: string;
      templateTweaks?: string;
      photoUri?: string;
      photoName?: string;
      audioUri?: string;
      audioName?: string;
      trimStart?: number;
      trimEnd?: number;
    } = {
      userId: user._id,
      aspectRatio: args.aspectRatio,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    };
    if (args.title !== undefined) projectDoc.title = args.title;
    if (args.templateId !== undefined) projectDoc.templateId = args.templateId;
    if (args.templateTweaks !== undefined) {
      projectDoc.templateTweaks = args.templateTweaks;
    }
    if (args.photoUri !== undefined) projectDoc.photoUri = args.photoUri;
    if (args.photoName !== undefined) projectDoc.photoName = args.photoName;
    if (args.audioUri !== undefined) projectDoc.audioUri = args.audioUri;
    if (args.audioName !== undefined) projectDoc.audioName = args.audioName;
    if (args.trimStart !== undefined) projectDoc.trimStart = args.trimStart;
    if (args.trimEnd !== undefined) projectDoc.trimEnd = args.trimEnd;

    return await ctx.db.insert("projects", projectDoc);
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
    templateTweaks: v.optional(v.string()),
    aspectRatio: v.optional(v.union(v.literal("9:16"), v.literal("4:5"), v.literal("1:1"))),
    photoUri: v.optional(v.string()),
    photoName: v.optional(v.string()),
    audioUri: v.optional(v.string()),
    audioName: v.optional(v.string()),
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
    if (args.templateTweaks !== undefined) {
      updates.templateTweaks = args.templateTweaks;
    }
    if (args.aspectRatio !== undefined) updates.aspectRatio = args.aspectRatio;
    if (args.photoUri !== undefined) updates.photoUri = args.photoUri;
    if (args.photoName !== undefined) updates.photoName = args.photoName;
    if (args.audioUri !== undefined) updates.audioUri = args.audioUri;
    if (args.audioName !== undefined) updates.audioName = args.audioName;
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

export const getById = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    const user = await getActiveUserByIdentity(ctx);
    if (!user || project.userId !== user._id) return null;

    return project;
  },
});

export const remove = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const user = await getActiveUserByIdentity(ctx);
    if (!user || project.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.projectId);

    return { projectId: args.projectId };
  },
});
