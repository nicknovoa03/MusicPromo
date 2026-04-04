# Round 4: Navigation, Screens, and Information Architecture — CONFIRMED

Design decisions informed by Meta's Edits app (primary reference), Snapchat trimmer, Shopee trimmer, and Spotify profile. Screenshots saved in `docs/design-inspiration/`.

## Navigation Pattern

- **Bottom tab bar** with 3 tabs: **Home**, **Create**, **Profile**
- Simple, minimal — similar to Edits but with fewer tabs
- Active tab indicator (style TBD)

## Screen Map

### 1. Sign In
- **Purpose:** Authentication entry point
- **Layout:** Clean login screen with Apple + Google sign-in buttons, "Continue as Guest" option
- **Entry points:** App launch (unauthenticated)
- **Exit points:** → Home (after sign-in) or → Onboarding (first-time)
- **Theme:** Light background

### 2. Onboarding (TBD)
- **Purpose:** First-time user walkthrough
- **Layout:** TBD — 1-2 simple screens
- **Entry points:** After first sign-in / guest entry
- **Exit points:** → Home
- **Theme:** TBD

### 3. Home / Projects
- **Purpose:** View all past projects, entry to create flow
- **Layout:** White/light background. "Projects" header top-left, multi-select toggle + profile icon top-right. 2-column grid of project thumbnails with title + metadata (date, size), per-card actions menu in browse mode, and selection checkmarks in multi-select mode. Black "+" FAB button bottom-right to create new project in browse mode.
- **Empty state:** Illustration + "Create your first project" + subtitle "Keep track of your drafts and finished videos all in one place." (Edits-style)
- **Entry points:** App launch (authenticated), bottom tab "Home"
- **Exit points:** → Create (tap "+"), → Profile (tap profile icon or tab), → Project detail (tap project)
- **Primary CTA:** "+" FAB button
- **Theme:** Light/white background
- **Reference:** `projects-history/Edits iOS Projects 0.png` (empty), `Edits iOS Projects 1.png` (with projects)

### 4. Create — Media Picker (Screen 1)
- **Purpose:** Select photo and audio files from device
- **Layout:** Single-screen media selector. Cancel button top-left, Add button top-right, "Select Media" title centered. Two stacked full-width square cards: audio selector on top, photo selector on bottom. Optional one-tap album-artwork quick-fill for photo when artwork exists.
- **Entry points:** Tap "+" from Home, bottom tab "Create"
- **Exit points:** → Editor (after selecting both files), → Home (cancel)
- **Primary CTA:** "Add" (once items selected)
- **Theme:** Light background (browsing mode)
- **Reference:** `create-flow/Edits iOS Creating a project 2.png` (photo picker grid)

### 5. Create — Editor/Trimmer (Screen 2)
- **Purpose:** Preview and trim the generated promo video
- **Layout:** Dark/black background. Large video preview near top with in-preview action controls (template settings, info toggle, edit template), aspect ratio toggle on preview, and centered "Trim Audio" waveform section below. "Export" button top-right.
- **Entry points:** After selecting photo + audio in picker
- **Exit points:** → Post-Export (tap Export), → Media Picker (back/swap media)
- **Primary CTA:** "Export" button
- **Secondary actions:** Play/pause, trim handles, aspect ratio toggle, template/media editing surfaces
- **Theme:** Dark/black background (editing mode)
- **Reference:** `create-flow/Create Flow - final media trimmer - screens 0.png` (Snapchat-style simple trimmer), `Create Flow - final media trimmer - screens 1.png` (Shopee-style with toolbar), `general-vibe/Edits iOS Creating a project 3.png` (Edits editor)

### 6. Post-Export — Rendering Progress
- **Purpose:** Show export/rendering progress
- **Layout:** Dark background. X button top-left. Large percentage text. Video preview with gradient border (Instagram-style orange → pink). "Please don't close the app" messaging below.
- **Entry points:** Tap Export from editor
- **Exit points:** → Share screen (when complete)
- **Theme:** Dark background
- **Reference:** `post-export/Edits iOS Exporting a video 1.png`

### 7. Post-Export — Ready to Share
- **Purpose:** Save and share the finished video
- **Layout:** Dark background. X button top-left. "Ready to share" heading + subtitle. Video preview centered. "Share to Instagram" gradient button (primary CTA). "Share to TikTok" button (secondary). "This video was saved to your camera roll" confirmation text.
- **Entry points:** Export complete
- **Exit points:** → Instagram (share intent), → TikTok (share intent), → Home (X / done)
- **Primary CTA:** "Share to Instagram" (gradient button)
- **Theme:** Dark background
- **Reference:** `post-export/Edits iOS Exporting a video 2.png`

### 8. Profile / Settings
- **Purpose:** View and edit profile, manage account
- **Layout:** Two-part inspired by Spotify. Profile view: large centered avatar, name, "Edit profile" button. Settings list: rows with labels + chevrons for Account, preferences, etc. Sign out and delete account at bottom.
- **Entry points:** Bottom tab "Profile", profile icon on Home
- **Exit points:** → Edit profile, → Sign out → Sign in
- **Primary CTA:** "Edit profile"
- **Theme:** Dark background (Spotify-inspired) or could match app theme — TBD
- **Reference:** `profile-settings/Spotify iOS View profile 0.png` (settings list), `Spotify iOS View profile 1.png` (profile view)

## Color Theme Strategy

Dual-theme approach inspired by Edits:
- **Light/white** for browsing and viewing (Home/Projects, Media Picker)
- **Dark/black** for creating and editing (Editor, Export, Share)
- Profile/Settings: dark (Spotify-inspired)

## Key Design Patterns

- **FAB button** for primary create action (black rounded square with "+" icon)
- **Stacked media selectors** with audio-first flow (then photo) on one screen
- **Waveform trimmer** at bottom of editor with draggable trim handles
- **Gradient buttons** for share actions (Instagram gradient: orange → pink)
- **Grid layout** for projects (2-column)
