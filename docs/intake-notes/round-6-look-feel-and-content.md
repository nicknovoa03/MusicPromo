# Round 6: Look, Feel, and Content — CONFIRMED

Primary design reference: **Meta's Edits app** (Instagram companion for video editing). Secondary references: Spotify (profile/settings), Snapchat (trimmer), Shopee (trimmer toolbar).

## Brand Adjectives

1. **Clean** — minimal, uncluttered, purposeful
2. **Modern** — contemporary design patterns, feels current
3. **Creative** — reflects the artistic audience
4. **Easy** — intuitive, no learning curve
5. **Professional** — polished, not toylike

## Color Direction

### Dual-Theme Approach (Edits-Inspired)

**Light mode (browsing/viewing):**
- Background: White (`#FFFFFF`)
- Surface: Light gray (`#F5F5F5`)
- Text: Near-black (`#1A1A1A`)
- Secondary text: Gray (`#8E8E93`)
- Used on: Home/Projects, Media Picker

**Dark mode (creating/editing):**
- Background: Black (`#000000`)
- Surface: Dark gray (`#1C1C1E`)
- Text: White (`#FFFFFF`)
- Secondary text: Light gray (`#ABABAB`)
- Used on: Editor/Trimmer, Export, Share screens

**Accent colors:**
- Primary CTA: Blue/purple (`#5856D6` — similar to Edits "Continue" button)
- Instagram gradient: Orange → Pink → Purple (for "Share to Instagram" button)
- Success: Green
- Error: Red
- FAB button: Black with white "+" icon

## Typography

- **Style:** Clean sans-serif, modern and professional
- **Direction:** SF Pro (iOS system font) or Inter — clean, legible, no-nonsense
- **Type scale (proposed):**
  - H1: 28pt bold — screen titles ("Projects", "Ready to share")
  - H2: 22pt semibold — section headers
  - Body: 16pt regular — descriptions, instructions
  - Caption: 13pt regular — metadata (dates, file sizes), timestamps
  - Button: 17pt semibold — CTA buttons

## Tone of Voice

- **Casual and clear** — not overly hype, not robotic
- **Encouraging but minimal** — "Ready to share", "Create your first project"
- **Informational when needed** — "Please don't close the app or lock your screen" (during export)
- **Do:** Use plain language, short sentences, action-oriented copy
- **Don't:** Use jargon, be overly enthusiastic, use ALL CAPS for emphasis

### Key Copy (Draft)

- Empty projects: "Create your first project" / "Keep track of your drafts and finished videos all in one place."
- Export progress: "58%" / "Please don't close the app or lock your screen."
- Export complete: "Ready to share" / "This video was saved to your camera roll."
- Share buttons: "Share to Instagram" / "Share to TikTok"
- Errors: "Something went wrong. Please try again." + retry button
- Files not found: "Original files no longer on this device."

## Motion / Animation

- **Level:** Fluid but not flashy — smooth transitions, not bouncy
- **Export progress:** Animated percentage counter + gradient border fill (Edits-style)
- **Page transitions:** Standard iOS push/pop navigation
- **Tab switching:** Instant/crossfade
- **FAB button:** Subtle press feedback (scale down on press)
- **Reduce motion:** Respect system `reduceMotionEnabled` setting

## Component Patterns (from References)

- **Buttons:** Rounded rectangles. Primary = filled (blue/purple or gradient). Secondary = outlined or gray fill.
- **Cards:** Rounded corners, thumbnail + text below (project cards in grid)
- **Tab bar:** Bottom-fixed, icon + label, 3 tabs
- **Create picker:** Single-screen stacked media selectors (audio first, photo second) with action buttons in header
- **Timeline:** Audio waveform trimmer at bottom of editor with draggable trim handles
- **Modals/sheets:** Partial-height bottom sheets for edit/template controls
- **Toasts:** Subtle confirmation text (e.g., "This video was saved to your camera roll")

## Performance Expectations

- App cold start: Under 3 seconds
- Preview render: Near-instant (on-device)
- Video export: Under 60 seconds
- Tab switching: Instant
- Media picker loading: Progressive (show grid as items load)
