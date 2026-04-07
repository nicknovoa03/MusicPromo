import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";

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

export const upsertForCurrentUser = mutation({
  args: {
    expoPushToken: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
  },
  handler: async (ctx, args) => {
    const user = await getActiveUserByIdentity(ctx);

    if (!user) throw new Error("Unauthenticated");

    const now = Date.now();

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_user_and_token", (q) =>
        q.eq("userId", user._id).eq("expoPushToken", args.expoPushToken)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        platform: args.platform,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("pushTokens", {
      userId: user._id,
      expoPushToken: args.expoPushToken,
      platform: args.platform,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removeForCurrentUser = mutation({
  args: {
    expoPushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getActiveUserByIdentity(ctx);
    if (!user) return null;

    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_user_and_token", (q) =>
        q.eq("userId", user._id).eq("expoPushToken", args.expoPushToken)
      )
      .unique();

    if (!existing) return null;

    await ctx.db.delete(existing._id);
    return existing._id;
  },
});

export const listByUserId = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushTokens")
      .withIndex("by_user_and_token", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
