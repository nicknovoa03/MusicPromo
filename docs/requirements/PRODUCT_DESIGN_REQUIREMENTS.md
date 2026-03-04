# Product Design Requirements — MusicPromo

## Doc Metadata

- Product name: MusicPromo
- Doc owner: Nick
- Stakeholders: Nick (sole developer / product owner)
- Last updated (YYYY-MM-DD): 2026-03-04
- Version: 1.1 (Phase 4 MVP pivot + release readiness)
- Links: GitHub repo at `/home/nick/MusicPromo`

## 1) Product Summary

- **One-liner:** A dead-simple mobile tool that turns a photo and audio clip into a short promo video for social media.
- **Problem statement:** Musicians and creators waste hours cobbling together tools like CapCut, Photoshop, and random websites to make simple promotional videos for their music. The process is slow, fragmented, and requires skills most artists don't have or want to learn.
- **Target users (v1):**
  - **Indie Artist / Creator** — Independent musician or content creator who self-promotes on Instagram, TikTok, and other social platforms. Creates promos every release or weekly. Currently hacks it together with CapCut or similar tools.
- **Target users (future):**
  - **Small Label / Publisher** — Record label or publishing company creating promo for a roster of artists. Deferred to post-v1.
- **Core job-to-be-done (JTBD):** "When I release music and want to promote it on social media, I want to quickly generate a short promo video from a photo and audio clip, so I can share it without learning video editing or spending an hour in CapCut."
- **What is "success" for v1:**
  - **North star:** Number of videos exported/downloaded
  - **Input metrics:** Create flow starts, photo selections, audio selections, preview views
  - **Guardrails:** Video generation time under 60 seconds, app crash rate ~0%

## 2) Goals, Non-Goals, and Principles

- **Goals (v1):**
  - User can create a promo video from a photo + audio clip in under a minute
  - Export to camera roll or share directly to Instagram/TikTok
  - Save project history for revisiting and re-exporting
  - Guest mode for frictionless first use
  - Push notifications for engagement
- **Non-goals (v1):**
  - Not a music distribution platform
  - Not a social network
  - Not a DAW or music creation tool
  - Not an analytics dashboard
  - Not a full-featured video editor
  - No SoundCloud or streaming service integration
  - No multi-user / label accounts
  - No template marketplace
  - No monetization / subscriptions
- **Product principles:**
  1. **Stupidly simple** — two inputs, one output, no learning curve
  2. **Fast** — seconds, not an hour
  3. **Modern & artistic** — feels good to use, reflects the creative audience
  4. **No hoops** — basic sign-in or guest mode, no strings attached
  5. **Mobile-first** — phone app for creators on the go

## 3) Platform, Tech, and Operational Constraints

- **Platforms:**
  - iOS: Yes (via Expo EAS Build)
  - Android: Yes (via Expo EAS Build)
  - Web: No (not for v1)
- **Authentication:**
  - Provider: Clerk (supports sign-in + anonymous/guest sessions)
  - Required identity fields: Email (via Clerk)
- **Backend:**
  - Data store: Convex (existing boilerplate in repo)
  - Realtime needs: Minimal — project metadata CRUD, user profile
  - File/media storage: On-device only (no cloud file storage for v1)
- **Environments:**
  - Local: Expo Dev Client
  - Staging: N/A for POC
  - Production: Expo EAS Build → App Store + Google Play
- **Safety rails:**
  - Destructive ops gating: Soft-delete for account deletion
  - Admin tooling needs: None for v1 (Convex dashboard for manual operations)
- **Accessibility:**
  - WCAG target: N/A (not web)
  - Screen reader expectations: TBD (not a v1 priority for POC)
- **Privacy/security/compliance:**
  - PII handled: Email only (via Clerk)
  - Data retention: Indefinite (soft-delete on account deletion)
  - Age gating / COPPA / GDPR: Not handled in v1 (minimal PII)

## 4) Information Architecture and Navigation

Design reference: Meta's Edits app. Screenshots in `docs/design-inspiration/`.

- **Global navigation pattern:** Bottom tab bar, 3 tabs: Home, Create, Profile
- **Global primary action:** "+" FAB button (black rounded square, bottom-right on Home screen)
- **Color theme strategy:** Light/white for browsing (Home, Picker), dark/black for editing (Editor, Export, Share)

### App-Level Screens

1. **Sign In** — Clean login with Apple + Google sign-in, "Continue as Guest" option. Light background.
2. **Onboarding** — 1-2 walkthrough screens for first-time users. Design TBD.
3. **Home / Projects** — White background. "Projects" header, profile icon top-right. 2-column grid of project thumbnails with title + metadata. Black "+" FAB bottom-right. Empty state: illustration + "Create your first project."
4. **Create — Media Picker** — Light background. Tabbed interface (Photo / Audio tabs, same layout for both). Cancel top-left, Add top-right. Search bar. Grid of device items.
5. **Create — Editor/Trimmer** — Dark background. Video preview centered (top half). Timeline strip at bottom with frame thumbnails and scrubber. Play/pause, timestamp, undo/redo. Aspect ratio toggle. Trim handles. "Export" button top-right.
6. **Post-Export — Rendering** — Dark background. X top-left. Percentage text. Video preview with gradient border. "Please don't close" messaging.
7. **Post-Export — Share** — Dark background. X top-left. "Ready to share" heading. Video preview. "Share to Instagram" gradient button. "Share to TikTok" button. "Saved to camera roll" confirmation.
8. **Profile / Settings** — Spotify-inspired. Profile: large avatar, name, "Edit profile" button. Settings: list rows with chevrons. Sign out + delete account at bottom.

## 5) Core Entities (Conceptual Data Model)

### User Profile
- Owner: Self
- Visibility: Private
- Key fields: `clerkId`, `name`, `email`, `avatarUrl`, `subscriptionTier`, `preferences` (defaultAspectRatio, defaultVideoLength), `createdAt`
- Relationships: Has many Projects, has many Push Tokens
- Typical queries: Get profile by clerkId
- Permissions: User reads/updates own profile only

### Project
- Owner: User
- Visibility: Private
- Key fields: `userId`, `title` (optional), `templateId`, `aspectRatio`, `videoLength`, `photoUri` (local), `audioUri` (local), `exportedVideoUri` (local), `status` (draft/exported), `createdAt`, `updatedAt`
- Relationships: Belongs to User, references Template
- Typical queries: List projects by userId sorted by recent, get project by ID
- Permissions: User CRUDs own projects only

### Template
- Owner: System
- Visibility: Public (read-only for users)
- Key fields: `id`, `name`, `description`, `previewImageUrl`, `type` (e.g., "spinning-cd"), `config` (speed, animation params)
- Relationships: Referenced by Projects
- Typical queries: List all templates
- Permissions: Read-only for users, admin-managed
- v1: Single locked entry — `simple-spin` (CD-style spinning disc)

### Push Token
- Owner: User (per device)
- Visibility: Private
- Key fields: `userId`, `expoPushToken`, `platform` (ios/android), `createdAt`, `updatedAt`
- Relationships: Belongs to User
- Typical queries: Get tokens by userId
- Permissions: System reads, user's device writes

### Notification
- Owner: System/Admin
- Visibility: Per-user
- Key fields: `id`, `userId`, `type` (reminder/new-template/export-complete/announcement), `title`, `body`, `read`, `trigger` (automated/manual), `sentAt`
- Relationships: Belongs to User
- Typical queries: List notifications by userId, unread count
- Permissions: User reads own, system/admin writes

## 6) Feature Requirements (By Epic)

### Epic: Authentication & Guest Mode

- **User problem:** User wants to use the app immediately without friction.
- **Primary user story:** As a creator, I can sign in with Clerk or continue as a guest so I can start making videos immediately.
- **Secondary stories:**
  - Guest can upgrade to a full account later (session merge)
  - Signed-in user can sign out and return to guest/sign-in state
- **Scope (v1):** Clerk sign-in (email/social) + anonymous guest mode
- **Non-goals:** No OAuth customization, no multi-factor auth
- **Key screens/components:** Sign-in screen, "Continue as Guest" button
- **Backend/data needs:** Convex User Profile created on first sign-in
- **Permissions/abuse risks:** Guest mode could be used to avoid tracking — acceptable for POC
- **Analytics/events:** `sign_in_completed`, `guest_mode_started`
- **Acceptance criteria:**
  - User can sign in with Clerk and land on the main app
  - User can tap "Continue as Guest" and access create flow
  - Guest session can be upgraded to authenticated
- **States:**
  - Loading: Clerk loading spinner
  - Empty: N/A
  - Error: "Sign-in failed, please try again"
  - Signed-out: Shows sign-in + guest option

### Epic: Create Promo Video

- **User problem:** User wants to create a promo video from a photo and audio clip quickly.
- **Primary user story:** As a creator, I can select a photo and audio clip, choose an aspect ratio, trim the audio, preview the result, and export a video — all in under a minute.
- **Secondary stories:**
  - I can swap the photo without losing my audio selection (and vice versa)
  - I can choose between 9:16 (vertical) and 1:1 (square) aspect ratios
  - I can trim my audio to select which section plays
- **Scope (v1):** Single locked template (`simple-spin`, CD-style spinner), on-device FFmpeg rendering, MP4 export
- **Non-goals:** Multiple template selection in-app, AI generation, cloud rendering
- **Key screens/components:** Create screen (photo picker, audio picker, audio trimmer, aspect ratio selector, preview player, export button)
- **Backend/data needs:** Project metadata saved to Convex after export
- **Permissions/abuse risks:** Minimal — user's own content
- **Analytics/events:** `create_started`, `photo_selected`, `audio_selected`, `preview_viewed`, `video_exported`
- **Acceptance criteria:**
  - User can select a photo from camera roll
  - User can select an audio file (MP3, WAV, M4A) from device
  - User can trim audio to select playback section
  - User can choose aspect ratio (9:16 or 1:1)
  - User sees a preview of the CD-style spinning disc video with their photo and audio
  - User can swap photo or audio without losing other selections
  - Video renders on-device and completes in under 60 seconds
  - Rendering continues when app is backgrounded
- **States:**
  - Loading: Rendering progress indicator during export
  - Empty: Create screen with prompts to add photo and audio
  - Error: "Rendering failed — please try again" with retry button
  - Edge cases: Not enough storage, unsupported file format (file picker filters these)

### Epic: Save & Share

- **User problem:** User wants to save the video and share it to social media instantly.
- **Primary user story:** As a creator, after exporting I can save to my camera roll or share directly to Instagram or TikTok.
- **Scope (v1):** Save to camera roll, native share intents to Instagram and TikTok
- **Non-goals:** Direct API posting, scheduling, cross-posting to multiple platforms simultaneously
- **Key screens/components:** Post-export success screen with action buttons
- **Backend/data needs:** None (all local/native)
- **Analytics/events:** `video_saved_to_camera_roll`, `share_tapped_instagram`, `share_tapped_tiktok`
- **Acceptance criteria:**
  - After export, user sees success screen with Save / Instagram / TikTok / Done buttons
  - "Save to Camera Roll" saves the MP4 to device gallery
  - "Share to Instagram" opens Instagram via native share intent (Instagram's own Story/Post/Reel picker)
  - "Share to TikTok" opens TikTok via native share intent
  - "Done" returns to projects or home
- **States:**
  - Loading: N/A (instant actions)
  - Empty: N/A
  - Error: "Failed to save — not enough storage" or "Instagram not installed"

### Epic: Project History

- **User problem:** User wants to revisit past projects, re-export, or share again.
- **Primary user story:** As a creator, I can see my past projects and re-open them to re-export or change settings.
- **Scope (v1):** List past projects, open to view/edit, re-export with changed settings
- **Non-goals:** Cloud file backup, project duplication/remix
- **Key screens/components:** Projects screen (list/grid of past projects), project detail view
- **Backend/data needs:** Convex query for user's projects sorted by recent
- **Analytics/events:** `project_reopened`
- **Acceptance criteria:**
  - User sees a list of past projects with metadata (date, aspect ratio, template)
  - User can tap a project to re-open it
  - User can change settings (aspect ratio, video length) and re-export
  - If original files were deleted from device, show "Files not found" error gracefully
- **States:**
  - Loading: Skeleton/spinner while fetching from Convex
  - Empty: "No projects yet — create your first promo!"
  - Error: "Couldn't load projects" + retry
  - File-not-found: "Original files no longer on this device"

### Epic: Push Notifications

- **User problem:** User forgets about the app or misses new features.
- **Primary user story:** As a creator, I receive push notifications for reminders, new templates, export completion, and announcements.
- **Scope (v1):** Expo Push Notifications, all four notification types (reminder, new-template, export-complete, announcement), both automated and manual triggers
- **Non-goals:** In-app notification center (TBD based on Mobbin), notification preferences/opt-out
- **Key screens/components:** Push notification permission prompt, notification entity in Convex
- **Backend/data needs:** Push Token entity in Convex, Notification entity, Expo push notification service
- **Analytics/events:** `notification_received`, `notification_tapped`
- **Acceptance criteria:**
  - App requests push notification permission on first launch
  - Expo push token is stored in Convex
  - User receives push notifications for all four types
  - Tapping a notification opens the app to home
- **States:**
  - Permission denied: App works normally, no notifications sent
  - Notification delivery failure: Silent fail, logged for debugging

### Epic: Profile & Settings

- **User problem:** User wants to manage their account and preferences.
- **Primary user story:** As a creator, I can view my profile, set default preferences, and manage my account.
- **Scope (v1):** Profile display (name, avatar), default aspect ratio, default video length, sign out, account deletion
- **Non-goals:** Profile editing beyond basics, subscription management, notification preferences
- **Key screens/components:** Profile/Settings screen
- **Backend/data needs:** User Profile read/update in Convex
- **Acceptance criteria:**
  - User can view their name, email, avatar
  - User can set default aspect ratio (9:16 or 1:1)
  - User can set default video length
  - User can sign out
  - User can delete their account (soft-delete in Convex)
- **States:**
  - Loading: Spinner while fetching profile
  - Error: "Couldn't load profile" + retry

### Epic: Onboarding

- **User problem:** First-time user doesn't know how the app works.
- **Primary user story:** As a new user, I see a brief walkthrough explaining the app so I know what to do.
- **Scope (v1):** 1-3 onboarding screens shown once after first sign-in/guest entry
- **Non-goals:** Interactive tutorial, skip-and-never-show-again logic for POC
- **Key screens/components:** Onboarding screen(s) — design TBD (Mobbin research)
- **Analytics/events:** `onboarding_completed`
- **Acceptance criteria:**
  - First-time user sees onboarding after sign-in or guest entry
  - User can progress through and complete onboarding
  - After onboarding, user lands on create or home screen

## 7) Screen Requirements (Design Spec)

### Sign In
- **Route:** `/sign-in`
- **Primary intent:** Authenticate user or allow guest access
- **Header:** App logo/name
- **Main sections:** Sign-in buttons (Apple, Google), "Continue as Guest" link
- **Primary CTA:** "Sign in with Apple" / "Sign in with Google"
- **Secondary actions:** "Continue as Guest"
- **Empty/loading/error:** Loading spinner during auth, "Sign-in failed" error with retry
- **Theme:** Light
- **Analytics:** `sign_in_completed`, `guest_mode_started`

### Home / Projects
- **Route:** `/` (Home tab)
- **Primary intent:** Browse past projects, create new ones
- **Header:** "Projects" title left, filter icon + profile avatar right
- **Main sections:** 2-column grid of project cards (thumbnail, title, date/size)
- **Primary CTA:** Black "+" FAB button (bottom-right) → create flow
- **List behavior:** Vertical scroll, pull to refresh
- **Empty state:** Illustration + "Create your first project" + "Keep track of your drafts and finished videos all in one place."
- **Loading:** Skeleton grid
- **Error:** "Couldn't load projects" + retry
- **Theme:** Light/white
- **Analytics:** `project_reopened` (on tap)
- **Reference:** `projects-history/Edits iOS Projects 0.png`, `Edits iOS Projects 1.png`

### Create — Media Picker
- **Route:** `/create/picker`
- **Primary intent:** Select photo and audio from device
- **Header:** Cancel (left), "Photos" / "Audio" tabs (center), Add (right, enabled when items selected)
- **Main sections:** Search bar, 3-column media grid from device
- **Primary CTA:** "Add" button (top-right)
- **List behavior:** Vertical scroll grid, progressive loading
- **Empty/loading/error:** Permission request sheet (Edits-style), empty grid if no items
- **Theme:** Light
- **Analytics:** `create_started`, `photo_selected`, `audio_selected`
- **Reference:** `create-flow/Edits iOS Creating a project 1.png` (permissions), `Edits iOS Creating a project 2.png` (grid)

### Create — Editor/Trimmer
- **Route:** `/create/editor`
- **Primary intent:** Preview, trim, and configure the promo video
- **Header:** X/back (left), project name (center), "Export" button (right)
- **Main sections:** Video preview (top, centered), play/pause + timestamp + undo/redo (middle), timeline strip with frame thumbnails + scrubber (bottom), aspect ratio toggle
- **Primary CTA:** "Export" button (top-right)
- **Secondary actions:** Play/pause, trim handles, aspect ratio toggle (9:16 / 1:1), undo/redo
- **Empty/loading/error:** Preview loading skeleton, "Rendering failed" + retry
- **Theme:** Dark/black
- **Analytics:** `preview_viewed`
- **Reference:** `create-flow/Create Flow - final media trimmer - screens 0.png`, `Create Flow - final media trimmer - screens 1.png`, `general-vibe/Edits iOS Creating a project 3.png`

### Post-Export — Rendering
- **Route:** `/create/exporting`
- **Primary intent:** Show rendering progress
- **Header:** X button (left, to cancel)
- **Main sections:** Large percentage text, video preview with gradient border, "Please don't close" message
- **Primary CTA:** None (wait state)
- **Theme:** Dark/black
- **Reference:** `post-export/Edits iOS Exporting a video 1.png`

### Post-Export — Share
- **Route:** `/create/share`
- **Primary intent:** Save and share the finished video
- **Header:** X button (left)
- **Main sections:** "Ready to share" heading + subtitle, video preview, share buttons, confirmation text
- **Primary CTA:** "Share to Instagram" (gradient button)
- **Secondary actions:** "Share to TikTok" (outlined button), "Done" / X to return home
- **Theme:** Dark/black
- **Analytics:** `video_exported`, `video_saved_to_camera_roll`, `share_tapped_instagram`, `share_tapped_tiktok`
- **Reference:** `post-export/Edits iOS Exporting a video 2.png`

### Profile / Settings
- **Route:** `/profile`
- **Primary intent:** View/edit profile, manage account and preferences
- **Header:** Back arrow (left), "Settings" title (center)
- **Main sections:** Profile card (avatar, name, "Edit profile" button), settings list (rows with chevrons: Account, default aspect ratio, default video length), sign out button, delete account
- **Primary CTA:** "Edit profile"
- **Theme:** Dark (Spotify-inspired)
- **Analytics:** None specific
- **Reference:** `profile-settings/Spotify iOS View profile 0.png`, `Spotify iOS View profile 1.png`

### Onboarding
- **Route:** `/onboarding`
- **Primary intent:** Introduce first-time users to the app
- **Main sections:** 1-2 screens with illustration + brief copy explaining the flow
- **Primary CTA:** "Get Started" / "Continue"
- **Theme:** TBD
- **Analytics:** `onboarding_completed`

## 8) Interaction Flows

### Flow 1: First-Time User → First Video
1. Open app
2. Sign in with Clerk OR tap "Continue as Guest"
3. See onboarding walkthrough (1-3 screens)
4. Land on create screen
5. Pick photo from camera roll
6. Pick audio file from device
7. Trim audio to select playback section
8. Choose aspect ratio (9:16 or 1:1)
9. Preview CD-style spinning disc video
10. Tap Export
11. Video renders on-device (progress indicator)
12. Success screen: Save to Camera Roll / Share to Instagram / Share to TikTok / Done

### Flow 2: Returning User → Re-Export
1. Open app (already signed in)
2. Navigate to Projects
3. Tap a past project
4. Change aspect ratio or video length if desired
5. Tap Re-Export
6. Video renders → success screen → save/share

### Flow 3: Notification → App
1. Receive push notification
2. Tap notification
3. App opens to home screen

## 9) Visual Design Requirements (Mini Design System)

Primary reference: Meta's Edits app. Secondary: Spotify (profile). Screenshots in `docs/design-inspiration/`.

- **Brand adjectives:** Clean, modern, creative, easy, professional
- **Color tokens:**
  - **Light theme (browsing):**
    - Background: `#FFFFFF`
    - Surface: `#F5F5F5`
    - Text: `#1A1A1A`
    - Text secondary: `#8E8E93`
  - **Dark theme (editing):**
    - Background: `#000000`
    - Surface: `#1C1C1E`
    - Text: `#FFFFFF`
    - Text secondary: `#ABABAB`
  - **Accents:**
    - Primary CTA: `#5856D6` (blue-purple)
    - Instagram gradient: orange → pink → purple
    - Success: green
    - Error: red
    - FAB: black with white icon
  - **Strategy:** Light for browsing (Home, Picker), dark for editing (Editor, Export, Share)
- **Typography:**
  - Font family: SF Pro (iOS system) / Inter (cross-platform fallback)
  - Type scale:
    - H1: 28pt bold (screen titles)
    - H2: 22pt semibold (section headers)
    - Body: 16pt regular (descriptions)
    - Caption: 13pt regular (metadata, timestamps)
    - Button: 17pt semibold (CTAs)
- **Components:**
  - Buttons: Rounded rectangles. Primary = filled (blue-purple or gradient). Secondary = outlined/gray.
  - Cards: Rounded corners, thumbnail + text below (2-column project grid)
  - Tab bar: Bottom-fixed, icon + label, 3 tabs
  - Pickers: Full-screen with grid, tabs at top, action buttons in header
  - Timeline: Horizontal strip, frame thumbnails, draggable playhead/scrubber
  - FAB: Black rounded square with white "+" icon (bottom-right)
  - Toasts: Subtle confirmation text ("This video was saved to your camera roll")
- **Motion:**
  - Fluid but not flashy — smooth transitions
  - Export progress: animated percentage counter + gradient border fill
  - Page transitions: standard iOS push/pop
  - Tab switching: instant/crossfade
  - FAB: subtle scale-down on press
  - Respect `reduceMotionEnabled` system setting

## 10) Content Design

- **Tone:** Casual and clear — not overly hype, not robotic
- **Voice do:** Use plain language, short sentences, action-oriented copy
- **Voice don't:** Jargon, excessive enthusiasm, ALL CAPS
- **Key empty state copy:**
  - Projects: "Create your first project" / "Keep track of your drafts and finished videos all in one place."
- **Key action copy:**
  - Export progress: "58%" / "Please don't close the app or lock your screen."
  - Export complete: "Ready to share" / "This video was saved to your camera roll."
  - Share: "Share to Instagram" / "Share to TikTok"
- **Error message guidelines:**
  - Generic: "Something went wrong. Please try again." + retry button
  - File not found: "Original files no longer on this device."
  - Storage: "Not enough storage to export."
  - Network: "You're offline. Connect to the internet to continue."

## 11) Instrumentation and Analytics

- **Provider:** PostHog (React Native SDK)
- **Event taxonomy:**
  - Core funnel: `app_opened`, `sign_in_completed`, `guest_mode_started`, `onboarding_completed`
  - Create funnel: `create_started`, `photo_selected`, `audio_selected`, `preview_viewed`, `video_exported`
  - Distribution: `video_saved_to_camera_roll`, `share_tapped_instagram`, `share_tapped_tiktok`
  - Retention: `project_reopened`
  - Notifications: `notification_received`, `notification_tapped`
- **Logging for debugging:** Expo default logging + Convex function logs
- **A/B testing needs:** None for v1

## 12) Performance and Quality Bars

- **Cold start target:** Under 3 seconds
- **Time to first content:** Near-instant (local UI)
- **Video preview render:** Near-instant (on-device)
- **Video export render:** Under 60 seconds
- **Scrolling/jank budget:** Standard React Native performance
- **Media guidelines:**
  - Supported audio: MP3, WAV, M4A
  - Video output: MP4
  - Aspect ratios: 9:16 (vertical), 1:1 (square)
- **Offline / poor network:** Requires internet for auth and Convex sync. Local rendering works regardless. Phase 0: show "You're offline" message, block flows that need connectivity. Phase 1: queue Convex metadata writes locally and sync on reconnect.
- **Rate limits / spam prevention:** Not needed for v1

## 13) Risks and Open Questions

### Known Risks
1. On-device rendering too slow on older phones — test early, fallback quality setting
2. Expo + FFmpeg compatibility issues — spike early in Phase 0
3. Audio trimming UX is tricky — keep simple, iterate later
4. Apple App Store review delays — submit early, expect 1-2 cycles
5. Clerk anonymous-to-authenticated session merge edge cases — test thoroughly
6. Remotion has no proven production-ready native on-device renderer path for this Expo app yet — maintain FFmpeg fallback until this is solved and validated on hardware

### Open Questions
- ~~Navigation pattern~~ — RESOLVED: Bottom tab bar, 3 tabs (Home, Create, Profile)
- ~~Create screen flow/layout~~ — RESOLVED: 2 screens (Media Picker + Editor/Trimmer)
- ~~Visual design system~~ — RESOLVED: Edits-inspired dual theme (light browse / dark edit)
- ~~Tone of voice~~ — RESOLVED: Casual and clear
- Onboarding screen design — still TBD (deferred to Phase 2)
- User Profile exact fields — before Phase 2
- Notification content strategy — before Phase 2
- App Store production readiness gaps: do we have final screenshots, App Privacy answers, and required legal/support URLs prepared for submission?
- ~~If local Remotion fails Phase 4 gates, which maintained FFmpeg fork becomes the long-term local export backend?~~ — RESOLVED (2026-03-04): keep the current FFmpeg backend as the active local export path behind the renderer abstraction while Remotion-native blockers are evaluated

## 14) Phasing and Milestones

### Phase 0: Bootstrap
- Expo project setup (building on existing repo boilerplate)
- Clerk auth integration
- Convex backend setup (existing boilerplate)
- Basic navigation shell
- PostHog integration

### Phase 1: MVP Core
- Create flow (photo picker, audio picker, audio trim)
- Single CD-style spinning disc template (`simple-spin`) with on-device rendering
- Aspect ratio selection (9:16 / 1:1)
- Preview and export
- Save to camera roll
- Native share (Instagram / TikTok)
- Project history (save, revisit, re-export)
- Guest mode

### Phase 2: Polish
- Onboarding screens
- Profile and settings screen
- Push notifications
- Edge case handling (error states, file-not-found)
- Offline queue for Convex metadata writes (local create → sync on reconnect)
- Account deletion

### Phase 3: Stabilization
- Resolve QA bugs from Phases 0-2
- Improve crash/error observability around create/export/share
- Tighten copy, interaction polish, and regression coverage

### Phase 4: MVP Lock + Release Readiness (Current)
- Freeze MVP scope to one template and ship reliability over breadth
- Keep local-only export architecture with FFmpeg as the active renderer
- Defer multi-template authoring/parity work until after MVP release
- Phase 4 implementation status (2026-03-04):
  - Editor template selector removed from the MVP flow; app path is effectively single-template
  - Template resolution is locked to `simple-spin` across picker, editor, and export routes
  - Disc visual treatment was updated to read as a CD (preview + export alignment pass)
  - Local FFmpeg export remains the active path; `remotion-local` remains experimental behind feature flag / fallback behavior
  - User-tested export path is working end-to-end for the current MVP slice
- Next step in this phase: App Store production launch checklist
  - Finalize App Store Connect metadata (description, keywords, support URL, marketing URL, age rating)
  - Complete App Privacy questionnaire (tracking/data collection disclosures for Clerk/PostHog usage)
  - Provide legal URLs required by review (Privacy Policy, Terms if used in app/submission metadata)
  - Capture and upload final iPhone screenshots and app preview assets for required sizes
  - Run release QA pass on production build (create -> trim -> preview -> export -> save/share, guest + signed-in paths)
  - Verify crash-free smoke test on multiple real devices/OS versions and confirm export success rate targets
  - Submit production build via EAS/App Store Connect and resolve any review feedback loop

### Phase 5: Template System + Export Standardization (Post-MVP)
- Standardize template authoring around one canonical template contract
- Eliminate preview/export drift for additional templates
- Re-evaluate local Remotion viability with explicit pass/fail gates
- If Remotion remains blocked on-device, continue with maintained local FFmpeg backend behind renderer abstraction
- Migrate additional templates and prove fast new-template onboarding

### Deferred (Post-v1)
- SoundCloud URL audio extraction
- Large template library expansion beyond Phase 4 baseline
- AI-generated templates (Sora, etc.)
- Label/agency multi-user accounts
- Template marketplace
- Offline rendering with queued analytics (beyond Phase 1 queue scope)
- Subscription tiers and monetization
