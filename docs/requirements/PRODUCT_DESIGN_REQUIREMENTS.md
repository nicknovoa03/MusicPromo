# Product Design Requirements — MusicPromo

## Doc Metadata

- Product name: MusicPromo
- Doc owner: Nick
- Stakeholders: Nick (sole developer / product owner)
- Last updated (YYYY-MM-DD): 2026-03-04
- Version: 1.3 (Phase 3 branch wrap-up)
- Links: GitHub repo at `/home/nick/MusicPromo`, template parity guide at `docs/requirements/TEMPLATE_PARITY_SYSTEM.md`

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
5. **Create — Editor/Trimmer** — Dark background. Turntable-style template preview (top) with template toggle, timestamp + aspect ratio controls, selected media chips, project-name editing, autosave feedback, and audio trimmer with trim handles + playback progress. "Export" button top-right.
6. **Post-Export — Rendering** — Dark background. X top-left. "Exporting" + percentage text. Uses the selected template preview composition from Create Editor. "Please don't close" messaging.
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
- Typical queries: List projects by userId sorted by recent, get project by ID; in guest mode, list local projects by `updatedAt`
- Permissions: User CRUDs own projects only (Convex); guest mode uses local-only project persistence on-device
- Guest local mirror: In local guest mode, projects are stored in AsyncStorage with local IDs (`local-*`) and the same core media/trim/status fields (no cloud sync, no cross-device continuity)

### Template
- Owner: System
- Visibility: Public (read-only for users)
- Key fields: `id`, `name`, `description`, `previewImageUrl`, `type` (e.g., "spinning-cd"), `config` (speed, animation params)
- Relationships: Referenced by Projects
- Typical queries: List all templates
- Permissions: Read-only for users, admin-managed
- v1: Two built-in entries — "Simple Spin" and "Deck" (spinning CD)

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
  - I can choose a visual template and keep it consistent from preview to export
  - I can trim my audio to select which section plays
- **Scope (v1):** Two built-in templates (Simple Spin + Deck), on-device rendering, MP4 export
- **Non-goals:** User-authored template builders, AI generation, cloud rendering
- **Key screens/components:** Create screen (photo picker, audio picker, audio trimmer, aspect ratio selector, template selector, preview player, export button)
- **Backend/data needs:** Project metadata saved to Convex after export
- **Permissions/abuse risks:** Minimal — user's own content
- **Analytics/events:** `create_started`, `photo_selected`, `audio_selected`, `preview_viewed`, `video_export_started`, `video_exported`, `video_export_failed`
- **Acceptance criteria:**
  - User can select a photo from camera roll
  - User can select an audio file (MP3, WAV, M4A) from device
  - User can trim audio to select playback section
  - Brand-new projects default to a 15-second initial clip (trimStart=0, trimEnd=15)
  - User can choose aspect ratio (9:16 or 1:1)
  - User can choose between built-in templates (Simple Spin / Deck)
  - User sees a preview of the selected template with their photo and audio
  - Preview and export stay visually aligned through shared template specs
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
- **Scope (v1):** List past projects, open to view/edit, autosave core edits, re-export with changed settings, and delete a project via quick actions
- **Non-goals:** Cloud file backup, collaborative editing, advanced timeline/effects editing
- **Key screens/components:** Projects screen (list/grid of past projects), project detail view
- **Backend/data needs:** Signed-in users use Convex query/mutations (ownership checked); local guest users use AsyncStorage-backed local projects with create/update/delete + list by recency
- **Analytics/events:** `project_reopened`, `project_actions_opened`, `project_delete_started`, `project_deleted`, `project_edit_started`, `project_autosave_succeeded`, `project_autosave_failed`, `project_media_replaced`, `project_title_edit_opened`, `project_title_updated`
- **Acceptance criteria:**
  - User sees a list of past projects with metadata (date, aspect ratio, template)
  - User can tap a project to re-open it
  - User can set/edit a project name from the editor flow and see it reflected in project history
  - User sees autosave feedback while editing (`saving`, `saved`, `save_error`)
  - Entering editor with selected photo+audio creates/updates a draft before export is tapped
  - Backing out from editor preserves the draft in project history (signed-in via Convex, guest via local storage)
  - User can open a project quick-actions sheet with Rename, Duplicate, and Delete actions
  - Tapping Delete requires a destructive confirmation before any deletion occurs
  - Confirmed deletion removes the project from history immediately
  - Replacing photo preserves audio + trims + aspect ratio + title
  - Replacing audio preserves photo + aspect ratio + title with safe trim clamping
  - User can change settings (aspect ratio, video length) and re-export
  - If original files were deleted from device, show targeted "Files not found" recovery CTAs
- **States:**
  - Loading: Skeleton/spinner while fetching from Convex
  - Empty: "No projects yet — create your first promo!"
  - Error: "Couldn't load projects" + retry
  - Deleting: Show in-progress state and prevent duplicate delete actions
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
  - User can set default video length (15, 30, or 60 seconds; default 15 seconds)
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
- **Data source:** Signed-in user = Convex projects; local guest user = AsyncStorage local projects
- **Primary CTA:** Black "+" FAB button (bottom-right) → create flow
- **Card actions:** Quick-actions menu with Rename, Duplicate (placeholder), and Delete (destructive + confirm)
- **List behavior:** Vertical scroll, pull to refresh
- **Empty state:** Illustration + "Create your first project" + "Keep track of your drafts and finished videos all in one place."
- **Loading:** Skeleton grid
- **Error:** "Couldn't load projects" + retry
- **Theme:** Light/white
- **Analytics:** `project_reopened` (on card tap), `project_actions_opened`, `project_delete_started`, `project_deleted`
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
- **Header:** X/back (left), editable project name control (center, opens compact name modal), "Export" button (right)
- **Main sections:** Turntable template preview (top), template toggle, timestamp + aspect ratio controls, selected media chips (photo/audio swap), audio trimmer with handles + playback progress
- **Primary CTA:** "Export" button (top-right)
- **Secondary actions:** Play/pause, trim handles, aspect ratio toggle (9:16 / 1:1), template toggle, swap photo/audio, edit project name
- **Default trim behavior:** Brand-new projects default to 15 seconds; reopened projects preserve last saved trim
- **Draft persistence:** Selecting media and entering editor creates/updates a draft immediately; back/close preserves draft before export
- **Save feedback:** Non-blocking autosave states (`saving`, `saved`, `save_error`) are shown in the editor header
- **Empty/loading/error:** Preview loading skeleton, "Rendering failed" + retry
- **Theme:** Dark/black
- **Analytics:** `preview_viewed`, `project_edit_started`, `project_autosave_succeeded`, `project_autosave_failed`, `project_media_replaced`, `project_title_edit_opened`, `project_title_updated`
- **Reference:** `create-flow/Create Flow - final media trimmer - screens 0.png`, `create-flow/Create Flow - final media trimmer - screens 1.png`, `general-vibe/Edits iOS Creating a project 3.png`, `add-project-name/Edits iOS Adding a project name 0.png`, `add-project-name/Edits iOS Adding a project name 1.png`, `add-project-name/Edits iOS Adding a project name 2.png`, `add-project-name/Edits iOS Adding a project name 3.png`

### Post-Export — Rendering
- **Route:** `/create/rendering`
- **Primary intent:** Show rendering progress
- **Header:** X button (left, to cancel)
- **Main sections:** "Exporting" label, large percentage text, selected-template preview (same composition as Create Editor), "Please don't close" message
- **Motion/output target:** High-quality output target is 30 FPS with 1080 base dimensions, ~8 Mbps video, and 256 kbps AAC audio
- **Primary CTA:** None (wait state)
- **Theme:** Dark/black
- **Analytics:** `video_export_started`, `video_exported`, `video_export_failed`
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
- **Main sections:** Profile card (avatar, name, "Edit profile" button), settings list (rows with chevrons: Account, default aspect ratio, default video length with 15/30/60 presets), sign out button, delete account
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
9. Choose template (Simple Spin or Deck) and preview
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
  - Create funnel: `create_started`, `photo_selected`, `audio_selected`, `preview_viewed`, `video_export_started`, `video_exported`, `video_export_failed`, `project_create_failed_during_export`
  - Distribution: `video_saved_to_camera_roll`, `share_tapped_instagram`, `share_tapped_tiktok`
  - Project editing/history: `project_reopened`, `project_actions_opened`, `project_delete_started`, `project_deleted`, `project_edit_started`, `project_autosave_succeeded`, `project_autosave_failed`, `project_media_replaced`, `project_title_edit_opened`, `project_title_updated`
  - Account/profile: `profile_preference_updated`, `account_delete_started`, `account_deleted`, `sign_out_tapped`, `sign_out_completed`
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
  - Export target quality: H.264 (~8 Mbps) + AAC (256 kbps)
  - Output framerate target: 30 FPS
  - Aspect ratios: 9:16 (vertical), 1:1 (square)
- **Offline / poor network:** Signed-in Convex sync requires internet. Local guest draft editing/history remains available on-device via AsyncStorage. Local rendering works regardless.
- **Rate limits / spam prevention:** Not needed for v1

## 13) Risks and Open Questions

### Known Risks
1. On-device rendering too slow on older phones — test early, fallback quality setting
2. Expo + FFmpeg compatibility issues — spike early in Phase 0
3. Audio trimming UX is tricky — keep simple, iterate later
4. Apple App Store review delays — submit early, expect 1-2 cycles
5. Clerk anonymous-to-authenticated session merge edge cases — test thoroughly

### Open Questions
- ~~Navigation pattern~~ — RESOLVED: Bottom tab bar, 3 tabs (Home, Create, Profile)
- ~~Create screen flow/layout~~ — RESOLVED: 2 screens (Media Picker + Editor/Trimmer)
- ~~Visual design system~~ — RESOLVED: Edits-inspired dual theme (light browse / dark edit)
- ~~Tone of voice~~ — RESOLVED: Casual and clear
- Preview/export frame parity automation strategy (manual visual QA vs automated frame diff tooling)
- Next built-in template roadmap beyond Simple Spin and Deck
- Whether to keep duplicate as a placeholder action or ship full duplication behavior in next phase

## 14) Phasing and Milestones

### Phase 0: Bootstrap
- Expo project setup (building on existing repo boilerplate)
- Clerk auth integration
- Convex backend setup (existing boilerplate)
- Basic navigation shell
- PostHog integration

### Phase 1: MVP Core
- Create flow (photo picker, audio picker, audio trim)
- Spinning CD video template (on-device rendering)
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

### Phase 3: Project Management and Fidelity
- Project quick-actions from Home cards (Rename, Duplicate, Delete) with destructive delete confirmation
- Core project editing workflow: editable title, autosave states, and draft persistence across signed-in + guest modes
- Media replacement safety flow (photo/audio swap without losing other edits) with missing-file recovery CTAs
- Two built-in templates (Simple Spin and Deck) with template selection and template-aware rendering
- Shared template parity contract (layout + vinyl tone specs) to align editor preview and exported output
- Export quality hardening: production defaults (no debug overlays, no fast mode), 15-second new-project default clip, and high-quality output settings

### Deferred (Post-v1)
- SoundCloud URL audio extraction
- Additional template families beyond the built-in Simple Spin + Deck set
- AI-generated templates (Sora, etc.)
- Label/agency multi-user accounts
- Template marketplace
- Offline rendering with queued analytics (beyond Phase 1 queue scope)
- Subscription tiers and monetization
