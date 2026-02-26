import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

const notificationType = v.union(
  v.literal("reminder"),
  v.literal("new-template"),
  v.literal("export-complete"),
  v.literal("announcement")
);

const notificationTrigger = v.union(v.literal("automated"), v.literal("manual"));

export const getUserByClerkId = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
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

    return await ctx.db
      .query("notifications")
      .withIndex("by_user_and_sent_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const notification = await ctx.db.get(args.notificationId);

    if (!notification) throw new Error("Notification not found");
    if (notification.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.notificationId, { read: true });
    return args.notificationId;
  },
});

export const create = mutation({
  args: {
    type: notificationType,
    title: v.string(),
    body: v.string(),
    trigger: notificationTrigger,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("notifications", {
      userId: user._id,
      type: args.type,
      title: args.title,
      body: args.body,
      read: false,
      trigger: args.trigger,
      sentAt: Date.now(),
    });
  },
});

export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationType,
    title: v.string(),
    body: v.string(),
    trigger: notificationTrigger,
    sentAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      read: false,
      trigger: args.trigger,
      sentAt: args.sentAt ?? Date.now(),
    });
  },
});
