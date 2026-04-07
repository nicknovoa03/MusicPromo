import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const PROFILE_LINK_PLATFORMS = [
  "spotify",
  "soundcloud",
  "apple-music",
  "youtube",
  "instagram",
  "tiktok",
  "x",
  "website",
] as const;

const profileLinkPlatformValidator = v.union(
  v.literal("spotify"),
  v.literal("soundcloud"),
  v.literal("apple-music"),
  v.literal("youtube"),
  v.literal("instagram"),
  v.literal("tiktok"),
  v.literal("x"),
  v.literal("website"),
);

type ProfileLinkPlatform = (typeof PROFILE_LINK_PLATFORMS)[number];

function isProfileLinkPlatform(value: string): value is ProfileLinkPlatform {
  return (PROFILE_LINK_PLATFORMS as readonly string[]).includes(value);
}

function normalizeOptionalText(value: string | null): string | undefined {
  if (value === null) return undefined;
  const nextValue = value.trim();
  return nextValue.length > 0 ? nextValue : undefined;
}

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
      return existing._id;
    }

    const isGuest = !identity.email;
    const userDoc: {
      clerkId: string;
      isGuest: boolean;
      createdAt: number;
      name?: string;
      email?: string;
      avatarUrl?: string;
    } = {
      clerkId,
      isGuest,
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
    if (!user) return null;
    return user;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    artistName: v.optional(v.union(v.string(), v.null())),
    avatarImageUrl: v.optional(v.union(v.string(), v.null())),
    heroImageUrl: v.optional(v.union(v.string(), v.null())),
    bio: v.optional(v.union(v.string(), v.null())),
    links: v.optional(
      v.array(
        v.object({
          platform: profileLinkPlatformValidator,
          url: v.string(),
          sortOrder: v.optional(v.number()),
        }),
      ),
    ),
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

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.avatarUrl !== undefined) updates.avatarUrl = args.avatarUrl;
    if (args.artistName !== undefined) {
      updates.artistName = normalizeOptionalText(args.artistName ?? "");
    }
    if (args.avatarImageUrl !== undefined) {
      const normalizedAvatarImageUrl = normalizeOptionalText(args.avatarImageUrl ?? "");
      updates.avatarImageUrl = normalizedAvatarImageUrl;
      updates.avatarUrl = normalizedAvatarImageUrl;
    }
    if (args.heroImageUrl !== undefined) {
      const normalizedHeroImageUrl = normalizeOptionalText(args.heroImageUrl ?? "");
      updates.heroImageUrl = normalizedHeroImageUrl;
    }
    if (args.bio !== undefined) {
      updates.bio = normalizeOptionalText(args.bio ?? "");
    }
    if (args.links !== undefined) {
      updates.links = args.links
        .map((link, index) => ({
          platform: link.platform,
          url: link.url.trim(),
          sortOrder: link.sortOrder ?? index,
        }))
        .filter(
          (link) =>
            isProfileLinkPlatform(link.platform) && link.url.length > 0,
        );
    }
    if (args.preferences !== undefined) {
      updates.preferences = { ...(user.preferences ?? {}), ...args.preferences };
    }

    await ctx.db.patch(user._id, updates);
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await getUserByClerkId(ctx, identity.subject);
    if (!user) throw new Error("User not found");

    const deletedAt = Date.now();

    // Delete all user-owned data (Apple App Store compliance).
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const project of projects) {
      await ctx.db.delete(project._id);
    }

    const pushTokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_user_and_token", (q) => q.eq("userId", user._id))
      .collect();
    for (const token of pushTokens) {
      await ctx.db.delete(token._id);
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_sent_at", (q) => q.eq("userId", user._id))
      .collect();
    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // Hard-delete the user record so re-signup with the same Apple ID creates a fresh one.
    await ctx.db.delete(user._id);

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
        createdAt: number;
        name?: string;
        email?: string;
        avatarUrl?: string;
      } = {
        clerkId,
        isGuest,
        onboardingCompletedAt: completedAt,
        createdAt: completedAt,
      };
      if (identity.name) userDoc.name = identity.name;
      if (identity.email) userDoc.email = identity.email;
      if (identity.imageUrl) userDoc.avatarUrl = identity.imageUrl as string;

      const userId = await ctx.db.insert("users", userDoc);
      return { userId, onboardingCompletedAt: completedAt };
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
