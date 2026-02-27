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
      if (existing.isDeleted) {
        await ctx.db.patch(existing._id, {
          isDeleted: false,
          deletedAt: undefined,
          name: identity.name ?? existing.name,
          email: identity.email ?? existing.email,
          avatarUrl: (identity.imageUrl as string) ?? existing.avatarUrl,
        });
      }
      return existing._id;
    }

    const isGuest = !identity.email;
    return await ctx.db.insert("users", {
      clerkId,
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
      avatarUrl: (identity.imageUrl as string) ?? undefined,
      isGuest,
      isDeleted: false,
      createdAt: Date.now(),
    });
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
        defaultVideoLength: v.optional(v.number()),
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
      const userId = await ctx.db.insert("users", {
        clerkId,
        name: identity.name ?? undefined,
        email: identity.email ?? undefined,
        avatarUrl: (identity.imageUrl as string) ?? undefined,
        isGuest,
        onboardingCompletedAt: completedAt,
        isDeleted: false,
        createdAt: completedAt,
      });
      return { userId, onboardingCompletedAt: completedAt };
    }

    if (existing.isDeleted) {
      await ctx.db.patch(existing._id, {
        isDeleted: false,
        deletedAt: undefined,
        onboardingCompletedAt: completedAt,
        name: identity.name ?? existing.name,
        email: identity.email ?? existing.email,
        avatarUrl: (identity.imageUrl as string) ?? existing.avatarUrl,
      });
      return { userId: existing._id, onboardingCompletedAt: completedAt };
    }
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
