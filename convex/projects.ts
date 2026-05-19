import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getActiveUserByIdentity(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  if (!user) return null;
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
    type: v.optional(v.union(v.literal("video"), v.literal("spk"))),
    vision: v.optional(v.string()),
    genre: v.optional(v.string()),
    bpm: v.optional(v.string()),
    releaseDate: v.optional(v.string()),
    label: v.optional(v.string()),
    collaborators: v.optional(v.string()),
    themeColor: v.optional(v.string()),
    customCoverUri: v.optional(v.string()),
    innerBackgroundUri: v.optional(v.string()),
    artistName: v.optional(v.string()),
    linkedProjectId: v.optional(v.string()),
    templateName: v.optional(v.string()),
    clipDurationSec: v.optional(v.number()),
    spkStep: v.optional(
      v.union(
        v.literal("details"),
        v.literal("vision"),
        v.literal("metadata"),
        v.literal("preview"),
      ),
    ),
    status: v.optional(v.union(v.literal("draft"), v.literal("exported"))),
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
      createdByName?: string;
      createdByEmail?: string;
      aspectRatio: "9:16" | "4:5" | "1:1";
      status: "draft" | "exported";
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
      type?: "video" | "spk";
      vision?: string;
      genre?: string;
      bpm?: string;
      releaseDate?: string;
      label?: string;
      collaborators?: string;
      themeColor?: string;
      customCoverUri?: string;
      innerBackgroundUri?: string;
      artistName?: string;
      linkedProjectId?: string;
      templateName?: string;
      clipDurationSec?: number;
      spkStep?: "details" | "vision" | "metadata" | "preview";
    } = {
      userId: user._id,
      createdByName: user.artistName ?? user.name,
      createdByEmail: user.email,
      aspectRatio: args.aspectRatio,
      status: args.status ?? "draft",
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
    if (args.type !== undefined) projectDoc.type = args.type;
    if (args.vision !== undefined) projectDoc.vision = args.vision;
    if (args.genre !== undefined) projectDoc.genre = args.genre;
    if (args.bpm !== undefined) projectDoc.bpm = args.bpm;
    if (args.releaseDate !== undefined) projectDoc.releaseDate = args.releaseDate;
    if (args.label !== undefined) projectDoc.label = args.label;
    if (args.collaborators !== undefined) projectDoc.collaborators = args.collaborators;
    if (args.themeColor !== undefined) projectDoc.themeColor = args.themeColor;
    if (args.customCoverUri !== undefined) projectDoc.customCoverUri = args.customCoverUri;
    if (args.innerBackgroundUri !== undefined) {
      projectDoc.innerBackgroundUri = args.innerBackgroundUri;
    }
    if (args.artistName !== undefined) projectDoc.artistName = args.artistName;
    if (args.linkedProjectId !== undefined) {
      projectDoc.linkedProjectId = args.linkedProjectId;
    }
    if (args.templateName !== undefined) projectDoc.templateName = args.templateName;
    if (args.clipDurationSec !== undefined) {
      projectDoc.clipDurationSec = args.clipDurationSec;
    }
    if (args.spkStep !== undefined) projectDoc.spkStep = args.spkStep;

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
    vision: v.optional(v.string()),
    type: v.optional(v.union(v.literal("video"), v.literal("spk"))),
    genre: v.optional(v.string()),
    bpm: v.optional(v.string()),
    releaseDate: v.optional(v.string()),
    label: v.optional(v.string()),
    collaborators: v.optional(v.string()),
    themeColor: v.optional(v.string()),
    customCoverUri: v.optional(v.string()),
    innerBackgroundUri: v.optional(v.string()),
    artistName: v.optional(v.string()),
    linkedProjectId: v.optional(v.string()),
    templateName: v.optional(v.string()),
    clipDurationSec: v.optional(v.number()),
    spkStep: v.optional(
      v.union(
        v.literal("details"),
        v.literal("vision"),
        v.literal("metadata"),
        v.literal("preview"),
      ),
    ),
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
    if (args.vision !== undefined) updates.vision = args.vision;
    if (args.type !== undefined) updates.type = args.type;
    if (args.genre !== undefined) updates.genre = args.genre;
    if (args.bpm !== undefined) updates.bpm = args.bpm;
    if (args.releaseDate !== undefined) updates.releaseDate = args.releaseDate;
    if (args.label !== undefined) updates.label = args.label;
    if (args.collaborators !== undefined) updates.collaborators = args.collaborators;
    if (args.themeColor !== undefined) updates.themeColor = args.themeColor;
    if (args.customCoverUri !== undefined) updates.customCoverUri = args.customCoverUri;
    if (args.innerBackgroundUri !== undefined) {
      updates.innerBackgroundUri = args.innerBackgroundUri;
    }
    if (args.artistName !== undefined) updates.artistName = args.artistName;
    if (args.linkedProjectId !== undefined) {
      updates.linkedProjectId = args.linkedProjectId;
    }
    if (args.templateName !== undefined) updates.templateName = args.templateName;
    if (args.clipDurationSec !== undefined) {
      updates.clipDurationSec = args.clipDurationSec;
    }
    if (args.spkStep !== undefined) updates.spkStep = args.spkStep;

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

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect();

    return await Promise.all(
      projects.map(async (project) => {
        const user = await ctx.db.get(project.userId);
        return {
          ...project,
          user: user
            ? {
                name: user.name,
                artistName: user.artistName,
                email: user.email,
                clerkId: user.clerkId,
              }
            : null,
        };
      })
    );
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
