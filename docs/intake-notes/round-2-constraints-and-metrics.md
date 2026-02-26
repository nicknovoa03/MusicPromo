# Round 2: Constraints and Success Metrics — CONFIRMED

## Platform & Deployment

| Decision | Choice |
|---|---|
| **Platform** | Cross-platform mobile (React Native + Expo) |
| **Deployment** | Expo (EAS Build → iOS + Android) |
| **Video rendering** | On-device (phone's local resources) |

## Tech Stack

| Layer | Choice |
|---|---|
| **Framework** | React Native + Expo |
| **Auth** | Clerk |
| **Backend / Database** | Convex |
| **Analytics** | PostHog |
| **Video rendering** | On-device (likely expo-av / expo-video or FFmpeg-kit for React Native) |

## Timeline & Budget

| Constraint | Value |
|---|---|
| **Timeline** | As fast as possible (2-4 weeks) — this is a POC |
| **Budget** | Free/low-cost — already paying for OpenAI + Cursor subs |
| **Goal** | Prove the process, learn mobile deployment, ship a working thing |

## Video Output Specs

| Spec | Value |
|---|---|
| **Aspect ratios** | Both vertical (9:16) and square (1:1) — user picks |
| **Clip length** | User-defined trim, 15-60s range |
| **Export format** | MP4 (universal for social platforms) |

## Auth & Privacy

| Decision | Choice |
|---|---|
| **Auth flow** | Clerk — sign in and go, minimal friction |
| **PII** | Email only (via Clerk) |
| **Uploaded content** | User's own — no copyright enforcement in v1 |
| **Compliance** | Minimal for POC (no GDPR/COPPA handling) |

## Success Metrics

| Metric | Type | Target |
|---|---|---|
| **Videos exported/downloaded** | North star | >0 (it works!) |
| **Successful deployment to app stores** | Launch goal | Ship it |
| **Video generation time** | Guardrail | Under 60 seconds |
| **App crash rate** | Guardrail | ~0% |

## Offline Support

No — requires internet connection. Core rendering is local but auth, analytics, and data storage need connectivity. Offline rendering with queued analytics is a Phase 2 idea.

## Assumptions (Round 2)

| # | Assumption | Impact if Wrong |
|---|---|---|
| A5 | On-device video rendering (no server-side processing) | If phone hardware can't handle it, need a cloud rendering service |
| A6 | Clip length is user-controlled within a 15-60s range | Affects rendering time and file size |
| A7 | Export format is MP4 | Some platforms may prefer MOV or WebM |
| A8 | PostHog React Native SDK is sufficient for analytics needs | May need custom event tracking setup |
| A9 | Convex React Native SDK covers all backend needs (no REST API layer needed) | If not, may need to add API routes |
