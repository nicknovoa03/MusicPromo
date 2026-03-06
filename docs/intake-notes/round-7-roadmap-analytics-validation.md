# Round 7: Roadmap, Analytics, and Final Validation — CONFIRMED

## Analytics Events (PostHog)

### Core Funnel
- `app_opened` — app launch (DAU/MAU)
- `sign_in_completed` — after Clerk auth
- `guest_mode_started` — taps "Continue as Guest"
- `onboarding_completed` — finishes walkthrough

### Create Funnel
- `create_started` — enters create flow
- `photo_selected` — picks a photo
- `audio_selected` — picks audio
- `preview_viewed` — previews the video
- `editor_controls_opened` — opens edit/template control surfaces
- `template_selected_from_edit_media` — changes template from edit surface
- `media_swap_started_from_edit_media` — swaps audio or photo from edit surface
- `template_tweak_changed` — changes template control values
- `video_exported` — render completes (**north star event**)

### Distribution
- `video_saved_to_camera_roll` — saves locally
- `share_tapped_instagram` — shares to Instagram
- `share_tapped_tiktok` — shares to TikTok

### Retention
- `project_reopened` — opens a past project
- `project_actions_opened` — opens per-project actions
- `project_delete_started` — starts project delete confirm flow
- `project_deleted` — project delete succeeds

### Notifications
- `notification_received` — push delivered
- `notification_tapped` — user taps it

## Phased Roadmap

### Phase 0: Bootstrap
- Expo project setup (building on existing repo boilerplate)
- Clerk auth integration
- Convex backend setup (already has boilerplate)
- Basic navigation shell
- PostHog integration

### Phase 1: MVP Core
- Create flow: single-screen media picker (audio + photo), audio trim
- Curated CD-style template set (`simple-spin`, `graphic-pop`) with on-device rendering
- Aspect ratio selection (9:16 or 1:1)
- Preview and export
- Save to camera roll
- Native share to Instagram and TikTok
- Project history: save, revisit, re-export
- Guest mode

### Phase 2: Polish
- Onboarding screens
- Profile and settings screen
- Push notifications
- Edge case handling (offline queue, error states, file-not-found)
- Account deletion

### Deferred (Post-v1)
- SoundCloud URL audio extraction
- Additional video templates and styles
- AI-generated templates (Sora, etc.)
- Label/agency multi-user accounts
- Template marketplace
- Offline rendering with queued analytics
- Subscription tiers and monetization

**Timeline note:** User expects this to move fast — potentially significant progress in a day, not 4 weeks. The phasing is logical ordering, not necessarily calendar weeks.

## Known Risks

1. On-device rendering too slow on older phones — test early, fallback quality setting
2. Expo + FFmpeg compatibility issues — spike early to validate
3. Audio trimming UX is tricky — keep simple, iterate later
4. Apple App Store review delays — submit early, expect 1-2 cycles
5. Clerk anonymous-to-authenticated session merge — test thoroughly

## Open Questions (To Revisit)

- Navigation pattern (tabs vs hamburger) — after Mobbin research
- Create screen flow/layout — after Mobbin research
- Visual design system (colors, type, motion) — after Mobbin research
- Onboarding screen design — after Mobbin research
- Tone of voice for UI copy — after Mobbin research
- User Profile exact fields — before Phase 2
- Notification content strategy — before Phase 2

## All Assumptions (Reviewed — All Confirmed)

### Round 1
- A1: v1 is a mobile app (not web-only)
- A2: Primary output is a short video (15-60s)
- A3: v1 has a small curated CD-style template set
- A4: Label/agency persona deferred

### Round 2
- A5: On-device video rendering (no cloud)
- A6: Clip length user-controlled, 15-60s
- A7: Export format is MP4
- A8: PostHog React Native SDK is sufficient
- A9: Convex React Native SDK covers backend needs

### Round 3
- A10: Files on-device only, metadata in Convex (phone switch = files gone)
- A11: Native share intents for Instagram/TikTok
- A12: User Profile exact fields TBD
- A13: Small curated template set in v1, data model supports multiple
- A14: Expo Push Notifications sufficient
- A15: No admin panel for v1

### Round 5
- A16: SoundCloud deferred to Phase 2
- A17: Offline Convex queue is lightweight (may cut if complex)
- A18: Clerk supports anonymous sessions in React Native
- A19: File picker can filter to audio formats only
- A20: Background rendering works when app backgrounded on iOS
- A21: Soft-delete satisfies Apple's account deletion requirement
