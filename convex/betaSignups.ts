import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { email, source }) => {
    const existing = await ctx.db
      .query("betaSignups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      return { success: true, duplicate: true };
    }

    await ctx.db.insert("betaSignups", {
      email,
      source,
      createdAt: Date.now(),
    });

    return { success: true, duplicate: false };
  },
});
