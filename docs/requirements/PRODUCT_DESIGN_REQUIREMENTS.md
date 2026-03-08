# Product Design Requirements — MusicPromo

## Doc Metadata

- Product name: MusicPromo
- Doc owner: Nick
- Stakeholders: Nick (sole developer / product owner)
- Last updated (YYYY-MM-DD): 2026-03-07
- Version: 1.6 (Phase 5 iOS-native rollout in progress)
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
- **Color theme strategy:** System color-scheme adaptive surfaces with brand-green accents; create/edit/export screens preserve dark-first readability

### App-Level Screens

1. **Sign In** — Clean login with Apple + Google sign-in, "Continue as Guest" option. Light background.
2. **Onboarding** — 1-2 walkthrough screens for first-time users. Design TBD.
3. **Home / Projects** — White background. "Projects" header, multi-select toggle, profile icon top-right. 2-column grid of project thumbnails with title + metadata. Black "+" FAB bottom-right in browse mode. In multi-select mode, cards show check markers and a bottom-centered action that shows `Delete (N)` when projects are selected and `Cancel` when selection mode is empty, with haptic feedback on selection interactions.
4. **Create — Media Picker** — Light background. Single-screen selector with stacked full-width square cards: audio on top, photo on bottom. Cancel top-left, Add top-right. Audio artwork quick-fill for photo when available.
5. **Create — Editor/Trimmer** — Dark background. Large preview with overlay controls (settings, template-info toggle, `Edit Template`), bottom-right aspect-ratio toggle, centered "Trim Audio" section, and top-right "Export" button.
6. **Post-Export — Rendering** — Dark background. X top-left. Percentage text. Video preview with gradient border. "Please don't close" messaging. Stage layout responsively scales from window dimensions + safe-area insets.
7. **Post-Export — Share** — Dark background. X top-left. "Ready to share" heading. Video preview. "Share to Instagram" gradient button. "Share to TikTok" button. "Saved to camera roll" confirmation.
8. **Profile / Settings** — Hero-first dark profile surface with cinematic banner, oversized overlapping avatar, and large artist name treatment. `Edit Profile` opens a light slide-in editing surface for avatar, banner, and name updates. Sign out + delete account remain grouped at bottom.

## 5) Core Entities (Conceptual Data Model)

### User Profile
- Owner: Self
- Visibility: Private
- Key fields: `clerkId`, `name`, `email`, `avatarUrl`, `artistName`, `avatarImageUrl`, `heroImageUrl`, `links`, `subscriptionTier`, `preferences` (defaultAspectRatio, defaultVideoLength), `createdAt`
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
- v1: Curated entries — `simple-spin` (Polished CD-style spinner) and `graphic-pop` (Graphic CD-style spinner)

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
- **Scope (v1):** Curated template switching (`simple-spin` + `graphic-pop`), on-device FFmpeg rendering, MP4 export
- **Non-goals:** AI generation, cloud rendering, open template marketplace
- **Key screens/components:** Create flow (single-screen media picker with audio/photo selectors, editor preview/player, audio trimmer, aspect ratio selector, template controls, export button)
- **Backend/data needs:** Project metadata saved to Convex after export
- **Permissions/abuse risks:** Minimal — user's own content
- **Analytics/events:** `create_started`, `photo_selected`, `audio_selected`, `preview_viewed`, `editor_controls_opened`, `template_selected_from_edit_media`, `media_swap_started_from_edit_media`, `template_tweak_changed`, `video_exported`
- **Acceptance criteria:**
  - User can select a photo from camera roll
  - User can select an audio file (MP3, WAV, M4A) from device
  - User can trim audio to select playback section
  - User can choose aspect ratio (9:16 or 1:1)
  - User can open dedicated `Edit Template` and `Template Settings` control surfaces from the editor
  - User can switch templates from the dedicated `Edit Template` template rail (tap + swipe with clear active state)
  - User can change spin speed, record transparency, stage background color/photo, background blur, and rotation start/direction from dedicated `Template Settings` controls
  - Template tweaks apply to preview immediately while editing and remain in effect through export
  - User can toggle template-info diagnostics in editor and keep that visibility preference through rendering/share screens for parity checks
  - Export duration respects the selected trim range (no unintended 3s clamp when fast mode is off)
  - Exported output matches preview styling for CD center geometry, disc edge detail, and background blur intent
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
- **Analytics/events:** `project_reopened`, `project_actions_opened`, `project_delete_started`, `project_deleted`
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

- **User problem:** User wants to manage their account and artist identity.
- **Primary user story:** As a creator, I can present a strong artist profile (name/avatar/banner), preserve profile metadata safely, and control account safety actions.
- **Scope (v1):** Hero-first profile display, edit profile modal (name/avatar/banner), profile metadata persistence, sign out, account deletion
- **Non-goals:** Subscription management, notification preferences, advanced social/community profile features
- **Key screens/components:** Hero profile screen + slide-in edit-profile surface
- **Backend/data needs:** User Profile read/update in Convex + local guest profile cache parity (including `heroImageUrl`)
- **Acceptance criteria:**
  - User can view and update artist name, avatar image, and hero/banner image
  - User profile media/name edits persist for both signed-in and guest/local sessions
  - Profile save validation skips invalid links with recoverable feedback (valid fields still persist)
  - User can sign out
  - User can delete their account (soft-delete in Convex)
- **States:**
  - Loading: Spinner while fetching profile
  - Error: "Couldn't load profile" + retry
  - Partial-save warning: Profile save can succeed while invalid links are reported and skipped

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
- **Header:** "Projects" title left, multi-select toggle + profile avatar right
- **Main sections:** 2-column grid of project cards (thumbnail, title, date), per-card actions menu in browse mode, selection check indicators in multi-select mode
- **Primary CTA:** Browse mode: black "+" FAB button (bottom-right) → create flow
- **Secondary actions:** Multi-select mode: bottom-centered action becomes `Delete (N)` when selected, `Cancel` when zero items are selected
- **List behavior:** Vertical scroll, pull to refresh, safe-area aware bottom action placement
- **Interaction details:** Long-press enters selection mode with haptic feedback; selection toggles emit lightweight haptic ticks
- **Empty state:** Illustration + "Create your first project" + "Keep track of your drafts and finished videos all in one place."
- **Loading:** Skeleton grid
- **Error:** "Couldn't load projects" + retry
- **Theme:** Light/white
- **Analytics:** `project_reopened` (on tap), `project_actions_opened`, `project_delete_started`, `project_deleted`
- **Reference:** `projects-history/Edits iOS Projects 0.png`, `Edits iOS Projects 1.png`

### Create — Media Picker
- **Route:** `/create/picker`
- **Primary intent:** Select photo and audio from device
- **Header:** Cancel (left), "Select Media" title (center), Add (right, enabled only when both photo+audio selected)
- **Main sections:** Two stacked full-width square selector cards (Select Audio first, Select Photo second), selected-state cards with inline "Change" actions, optional album-artwork quick-fill card for photo
- **Primary CTA:** "Add" button (top-right)
- **List behavior:** Static stacked layout that expands to available vertical space; tab-embedded mode applies bottom overlay compensation so controls remain visible above dock overlays
- **Empty/loading/error:** Permission prompt for photos, document picker for audio, inline loading states per selector card
- **Theme:** Light
- **Analytics:** `create_started`, `photo_selected`, `audio_selected`
- **Reference:** `create-flow/Edits iOS Creating a project 1.png` (permissions), `Edits iOS Creating a project 2.png` (grid)

### Create — Editor/Trimmer
- **Route:** `/create/editor`
- **Primary intent:** Preview, trim, and configure the promo video
- **Header:** X/back (left), project name (center), "Export" button (right)
- **Main sections:** Video preview (top, centered), in-preview control row (settings icon, template-info toggle, `Edit Template` button), bottom-right aspect-ratio toggle, centered audio trim/waveform section, dedicated modal surfaces for media/layout vs template polish
- **Primary CTA:** "Export" button (top-right)
- **Secondary actions:** 
  - `Edit Template` surface: aspect ratio pills (9:16 / 1:1), template selector rail (swipe + snap + tap), change audio, change photo
  - `Template Settings` surface: spin speed, record transparency, stage background color/photo, background blur (only when custom photo selected), rotation start angle/direction with live preview updates
  - Rotation start presets use 4 cardinal positions (0°, 90°, 180°, 270°) with direction control (CW / CCW)
  - Optional template-info badge overlay can be toggled in-editor for parity diagnostics
  - Play/pause preview, trim handles, media swap without destructive resets
- **Empty/loading/error:** Preview loading skeleton, "Rendering failed" + retry
- **Theme:** Dark/black
- **Analytics:** `preview_viewed`, `editor_controls_opened`, `template_selected_from_edit_media`, `media_swap_started_from_edit_media`, `template_tweak_changed`
- **Reference:** `create-flow/Create Flow - final media trimmer - screens 0.png`, `Create Flow - final media trimmer - screens 1.png`, `general-vibe/Edits iOS Creating a project 3.png`

### Post-Export — Rendering
- **Route:** `/create/exporting`
- **Primary intent:** Show rendering progress
- **Header:** X button (left, to cancel)
- **Main sections:** Large percentage text, video preview with gradient border, optional template-info parity badge, "Please don't close" message
- **Layout behavior:** Responsive stage sizing uses live window dimensions plus safe-area budget to prevent clipping across device sizes
- **Primary CTA:** None (wait state)
- **Theme:** Dark/black
- **Reference:** `post-export/Edits iOS Exporting a video 1.png`

### Post-Export — Share
- **Route:** `/create/share`
- **Primary intent:** Save and share the finished video
- **Header:** X button (left)
- **Main sections:** "Ready to share" heading + subtitle, video preview, optional template-info parity badge, share buttons, confirmation text
- **Primary CTA:** "Share to Instagram" (gradient button)
- **Secondary actions:** "Share to TikTok" (outlined button), "Done" / X to return home
- **Theme:** Dark/black
- **Analytics:** `video_exported`, `video_saved_to_camera_roll`, `share_tapped_instagram`, `share_tapped_tiktok`
- **Reference:** `post-export/Edits iOS Exporting a video 2.png`

### Profile / Settings
- **Route:** `/profile`
- **Primary intent:** Present a brand-first artist profile while keeping account actions safe and accessible
- **Header:** Hero-first layout on base screen (no classic settings header). Edit flow uses a dedicated "Edit profile" slide-in header with back/close action.
- **Main sections:** 
  - Hero shell: top banner image/fallback, oversized overlapping avatar, large artist name
  - Hero quick action: `Edit Profile` CTA that opens slide-in editing surface
  - Edit profile surface: avatar + banner pickers, name input with save-on-blur/submit, swipe-to-close gesture
  - Account actions: sign out and delete account grouped at bottom
- **Primary CTA:** "Edit profile"
- **Theme:** Dark cinematic hero (base screen) + light utility surface (edit profile modal)
- **Analytics:** None specific
- **Reference:** `Profile screens/Profile screens 0.png`, `Profile screens/Profile screens 1.png`, `Profile screens/Profile screens 2.png`, `Profile screens/profile-settings.png`, `Profile screens/apple-contact-card.jpeg`

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

Primary reference: Meta's Edits app. Secondary: Spotify (legacy profile patterns) + Apple contact-card/profile hero studies. Screenshots in `docs/design-inspiration/`.

- **Brand adjectives:** Clean, modern, creative, easy, professional
- **Color tokens:**
  - **Light theme (browsing):**
    - Background: `#FFFFFF`
    - Surface: `#F3FAF4`
    - Surface muted: `#EAF5EC`
    - Text: `#102317`
    - Text secondary: `#5D7064`
    - Border: `#D6E6DA`
  - **Dark theme (editing):**
    - Background: `#000000`
    - Surface: `#18191C`
    - Surface muted: `#23252A`
    - Text: `#F8F9FB`
    - Text secondary: `#B6BBC4`
    - Border: `#343943`
  - **Accents:**
    - Primary CTA: `#1E9C53` (brand green)
    - Primary muted: `#DDF4E5`
    - On-primary text/icon: `#FFFFFF`
    - Instagram gradient: orange → pink → purple
    - Success: green
    - Error: red
    - FAB: black with white icon
  - **Overlay + brand helpers:**
    - Light overlay: `rgba(255,255,255,0.82)` / strong `rgba(255,255,255,0.92)`
    - Dark overlay: `rgba(0,0,0,0.26)` / strong `rgba(0,0,0,0.62)`
    - Brand tint: `rgba(30,156,83,0.07)` / `0.12` / `0.18`
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
  - Buttons: Rounded rectangles. Primary = filled (brand green or gradient). Secondary = outlined/gray.
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
- Curated CD-style template set (`simple-spin`, `graphic-pop`) with on-device rendering
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
- Freeze MVP scope to a curated two-template set and ship reliability over breadth
- Keep local-only export architecture with FFmpeg as the active renderer
- Defer broad template-library authoring/parity work until after MVP release
- Phase 4 implementation status (2026-03-06):
  - Editor template selector is a dedicated centered rail (horizontal pills with snap-to-center behavior + active template label)
  - Template resolution supports `simple-spin` and `graphic-pop` across picker, editor, and export routes
  - Disc visual treatment was updated to read as a CD (preview + export alignment pass, including edge-rim detail)
  - Template control surface now supports stage background image + blur and rotation start/direction
  - Template tweak model uses `recordTransparency` as canonical control naming (legacy `recordOpacity` input remains compatibility-normalized)
  - Template-info diagnostics (`TemplateInfoBadge`) were added to editor, rendering, and share previews with route-param handoff for parity verification
  - Rotation start control was normalized to 4 presets (0°/90°/180°/270°) with clearer direction labeling (CW/CCW)
  - Create picker now uses a single-screen audio-first + photo-second selection layout with full-height stacked cards and cancel-state reset to avoid stale draft carryover
  - Create picker tab-embedded mode now applies dock overlay compensation consistently across platforms
  - Home projects now supports multi-select mode with bottom-centered bulk delete for faster cleanup
  - Home selection interactions now include platform-aware haptics (enter selection + toggle on/off) with graceful fallback behavior
  - Home bulk action is inset-aware and now supports an explicit empty-state `Cancel` action when selection mode has zero items
  - Home project list bottom padding was adjusted per platform to prevent tab/FAB overlap
  - Profile was redesigned to a hero-first dark surface with cinematic banner treatment, oversized avatar overlap, and large artist-name emphasis
  - Edit profile now uses a dedicated slide-in modal surface with swipe-to-close and direct controls for avatar, banner, and name
  - User profile persistence now includes `heroImageUrl` across Convex schema/mutations and local guest profile storage
  - Profile media/name changes now support partial-save flows (targeted saves without requiring links payload updates)
  - Export duration now respects user trim selection when fast mode is disabled
  - Preview/export parity uses shared vinyl geometry specs (center + edge) to prevent drift from duplicated constants
  - Export color range mapping was corrected to match preview vibrance more closely on device
  - Rendering layout now computes stage size from live window dimensions and safe-area budgets for better cross-device fit
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

### Phase 5: iOS Native Surface + Liquid Glass Adoption (Post-MVP)
- Introduce iOS-native component surfaces (context menus, grouped settings sections, native pickers, richer empty states) behind feature flags
- Apply liquid-glass affordances selectively on iOS where they improve clarity and native feel without reducing legibility
- Preserve deterministic fallback paths to existing React Native components for Android and unsupported iOS capability paths
- Keep create/export/share reliability unchanged while upgrading presentation and interaction fidelity
- Validate rollout with explicit fallback matrix and migration analytics
- Phase 5 implementation status (2026-03-07):
  - Adopted dynamic color-token usage across sign-in, onboarding, tab shell, home/projects, profile, and create picker surfaces for light/dark parity
  - Updated tabs shell to use stable adaptive RN tab styling and removed the experimental iOS liquid-glass tab bar treatment
  - Added adaptive create-layout/picker background and status-bar behavior, including native summary/form color-scheme alignment where native surfaces are enabled
  - Simplified rendering screen progress UI to percentage-first display (native circular spinner removed) while preserving export lifecycle behavior
  - Expanded template customization artwork-scale controls from `1x–1.5x` to `1x–5x` and improved label formatting/selection handling
  - Improved photo-matched background color generation with ThumbHash-derived multi-swatch extraction for template settings
  - Aligned preview/export disc-hole behavior and artwork-scale interpolation across template stages and FFmpeg rendering path; hardened safe-fallback filter graph parsing on iOS FFmpeg kit

### Phase 6: Template System + Export Standardization (Post-Phase 5)
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
