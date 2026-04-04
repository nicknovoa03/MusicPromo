import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const notificationType = v.union(
  v.literal("reminder"),
  v.literal("new-template"),
  v.literal("export-complete"),
  v.literal("announcement")
);

type NotificationType =
  | "reminder"
  | "new-template"
  | "export-complete"
  | "announcement";

const defaultCopy: Record<NotificationType, { title: string; body: string }> = {
  reminder: {
    title: "New release idea?",
    body: "Turn a photo and audio clip into a promo video in under a minute.",
  },
  "new-template": {
    title: "New template available",
    body: "Try the latest template in your next promo.",
  },
  "export-complete": {
    title: "Export complete",
    body: "Your promo video is ready to save and share.",
  },
  announcement: {
    title: "MusicPromo update",
    body: "Check out what is new in MusicPromo.",
  },
};

// QA helper: from the Convex dashboard, run `pushNotifications.sendTestPush`
// with each type: `reminder`, `new-template`, `export-complete`, `announcement`.
export const sendTestPush = action({
  args: {
    type: notificationType,
    title: v.optional(v.string()),
    body: v.optional(v.string()),
  },
  handler: async (
    ctx: any,
    args: {
      type: NotificationType;
      title?: string;
      body?: string;
    }
  ): Promise<
    | { ok: true; sentCount: number; response: unknown }
    | { ok: false; reason: string }
  > => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user: any = await ctx.runQuery(internal.notifications.getUserByClerkId, {
      clerkId: identity.subject,
    });
    if (!user) throw new Error("User not found");

    const fallback = defaultCopy[args.type];
    const title = args.title?.trim() ? args.title : fallback.title;
    const body = args.body?.trim() ? args.body : fallback.body;
    const sentAt = Date.now();

    await ctx.runMutation(internal.notifications.createInternal, {
      userId: user._id,
      type: args.type,
      title,
      body,
      trigger: "manual",
      sentAt,
    });

    const tokens: any[] = await ctx.runQuery(internal.pushTokens.listByUserId, {
      userId: user._id,
    });

    if (!tokens.length) {
      return {
        ok: false,
        reason: "No push tokens found for current user.",
      };
    }

    const messages: Array<Record<string, unknown>> = tokens.map((tokenDoc: any) => ({
      to: tokenDoc.expoPushToken,
      title,
      body,
      sound: "default",
      data: {
        type: args.type,
        route: "/(tabs)",
        sentAt,
      },
    }));

    let response: Response;
    try {
      response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
    } catch (error) {
      console.warn("Expo push request failed", { error });
      return {
        ok: false,
        reason: "Failed to reach Expo Push API",
      };
    }

    let responseBody: unknown = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      console.warn("Expo push send failed", {
        status: response.status,
        body: responseBody,
      });
      return {
        ok: false,
        reason: `Expo Push API returned ${response.status}`,
      };
    }

    return {
      ok: true,
      sentCount: messages.length,
      response: responseBody,
    };
  },
}) as any;
