import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function getUserByClerkId(ctx: any, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: any) => q.eq("clerkId", clerkId))
    .unique();
}

export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const clerkId = identity.subject;
    const existing = await getUserByClerkId(ctx, clerkId);

    if (existing) {
      if (existing.isDeleted) throw new Error("Account deleted");
      return existing._id;
    }

    const isGuest = !identity.email;
    const userDoc: {
      clerkId: string;
      isGuest: boolean;
      isDeleted: boolean;
      createdAt: number;
      name?: string;
      email?: string;
      avatarUrl?: string;
    } = {
      clerkId,
      isGuest,
      isDeleted: false,
      createdAt: Date.now(),
    };
    if (identity.name) userDoc.name = identity.name;
    if (identity.email) userDoc.email = identity.email;
    if (identity.imageUrl) userDoc.avatarUrl = identity.imageUrl as string;

    return await ctx.db.insert("users", userDoc);
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user || user.isDeleted) return null;
    return user;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    preferences: v.optional(
      v.object({
        defaultAspectRatio: v.optional(
          v.union(v.literal("9:16"), v.literal("1:1"))
        ),
        defaultVideoLength: v.optional(
          v.union(v.literal(15), v.literal(30), v.literal(60))
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getUserByClerkId(ctx, identity.subject);

    if (!user) throw new Error("User not found");
    if (user.isDeleted) throw new Error("Account deleted");

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    if (args.preferences !== undefined) {
      updates.preferences = { ...(user.preferences ?? {}), ...args.preferences };
    }

    await ctx.db.patch(user._id, updates);
  },
});

export const softDeleteCurrent = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    if (user.isDeleted) {
      return { userId: user._id, deletedAt: user.deletedAt ?? Date.now() };
    }

    const deletedAt = Date.now();
    await ctx.db.patch(user._id, {
      isDeleted: true,
      deletedAt,
      onboardingCompletedAt: undefined,
    });

    return { userId: user._id, deletedAt };
  },
});

export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const completedAt = Date.now();
    const clerkId = identity.subject;
    const existing = await getUserByClerkId(ctx, clerkId);

    if (!existing) {
      const isGuest = !identity.email;
      const userDoc: {
        clerkId: string;
        isGuest: boolean;
        onboardingCompletedAt: number;
        isDeleted: boolean;
        createdAt: number;
        name?: string;
        email?: string;
        avatarUrl?: string;
      } = {
        clerkId,
        isGuest,
        onboardingCompletedAt: completedAt,
        isDeleted: false,
        createdAt: completedAt,
      };
      if (identity.name) userDoc.name = identity.name;
      if (identity.email) userDoc.email = identity.email;
      if (identity.imageUrl) userDoc.avatarUrl = identity.imageUrl as string;

      const userId = await ctx.db.insert("users", userDoc);
      return { userId, onboardingCompletedAt: completedAt };
    }

    if (existing.isDeleted) throw new Error("Account deleted");
    if (existing.onboardingCompletedAt) {
      return {
        userId: existing._id,
        onboardingCompletedAt: existing.onboardingCompletedAt,
      };
    }

    await ctx.db.patch(existing._id, {
      onboardingCompletedAt: completedAt,
    });

    return { userId: existing._id, onboardingCompletedAt: completedAt };
  },
});
