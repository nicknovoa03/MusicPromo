# Round 5: Critical Flows and Edge Cases — CONFIRMED

## Core Flow: Create a Promo Video

```
Open app → Sign in (Clerk) OR "Continue as Guest"
  → Tap "Create"
  → Pick audio from device (MP3, WAV, M4A)
  → Pick photo from device (camera roll)
  → Choose aspect ratio (9:16 or 1:1)
  → Trim audio (user selects which section of the audio to use)
  → Preview the video (selected template with photo + audio playing)
  → User can swap photo or audio without losing the other selections
  → Tap "Export"
  → Video renders on-device (continues even if app is backgrounded)
  → Success screen: "Save to Camera Roll" / "Share to Instagram" / "Share to TikTok" / "Done"
  → Project metadata saved to Convex
```

### Key Flow Details
- **Non-destructive editing:** Changing the photo doesn't clear the audio selection, and vice versa. User can freely swap inputs before export.
- **Audio trimming:** User selects which section of their audio plays in the clip (not just "first N seconds").
- **Background rendering:** If user backgrounds the app during rendering, it continues.

## Audio Source

- **v1:** Device file picker only (MP3, WAV, M4A files on the device)
- **Phase 2 (deferred):** SoundCloud URL paste → extract audio. Many indie artists have music on SoundCloud, so this is a high-value future add.

## First-Time User Flow

- Onboarding screens after first sign-in — quick walkthrough of how the app works.
- Exact onboarding UX TBD (Mobbin research).
- After onboarding → create screen.

## Guest Mode

- Users can "Continue as Guest" without signing in.
- Guests get full create/export functionality.
- Analytics still tracked (anonymous identity in PostHog).
- Guest can upgrade to full account later (Clerk anonymous → authenticated session merge).
- Signing out = effectively same as guest mode in terms of local functionality.
- Advantage of signing in: named identity for analytics + project history synced to account.

## Edge Cases

| Scenario | Behavior |
|---|---|
| User picks one input but cancels the other | Stay on create screen, keep selected media, can't proceed without both photo + audio |
| Audio file too long | User picks which section to use (trim UI) |
| Unsupported audio format | File picker filtered to only show compatible formats (MP3, WAV, M4A) |
| Video rendering fails | Fail gracefully — error message + retry button |
| Device out of storage mid-export | Fail gracefully — "Not enough storage" error |
| App backgrounded during rendering | Continue rendering in background |
| No internet + not signed in | Show "Continue as Guest" option — works fully offline for creation |
| No internet + signed in | Allow local rendering; queue Convex metadata write, sync when online. Subtle "will sync when online" indicator. |
| Push notification tapped | Deep link to app home |
| Original files deleted from device (revisiting project) | Fail gracefully — "Files not found" error on the project |

## Re-Export / Revisit Flow

- User opens Projects → taps past project
- Can view details + edit settings (change aspect ratio, length) + re-export
- If original photo/audio files have been deleted from device → show "Files not found" error gracefully
- Can still see project metadata (date, settings used)

## Share Flow (Post-Export)

Success screen with explicit buttons:
1. **Save to Camera Roll**
2. **Share to Instagram** (native share intent → Instagram's own Story/Post/Reel picker)
3. **Share to TikTok** (native share intent → TikTok's own UI)
4. **Done** (return to projects or home)

## Sign-Out & Account Deletion

- **Sign out:** Clears session, user returns to sign-in/guest screen. Local files stay on device.
- **Account deletion:** Available from profile screen (required by Apple App Store). Soft-delete in Convex (mark as deleted, retain data on backend). User-facing: account and data appear deleted.
- **Convex data on deletion:** Soft-delete (retained on backend, not visible to user).

## Assumptions (Round 5)

| # | Assumption | Impact if Wrong |
|---|---|---|
| A16 | SoundCloud integration deferred to Phase 2 | If it's a must-have for v1, adds significant scope (API integration, audio extraction, TOS concerns) |
| A17 | Offline Convex queueing deferred to Phase 1 (AsyncStorage + retry on reconnect). Phase 0 requires internet. | If queueing is complex, may push to Phase 2 and require internet for all metadata saves |
| A18 | Guest mode uses Clerk anonymous sessions | Need to verify Clerk supports this in React Native SDK |
| A19 | File picker can be filtered to show only compatible audio formats | Depends on Expo DocumentPicker / MediaLibrary API capabilities |
| A20 | Background rendering continues when app is backgrounded | May need expo-task-manager or similar for reliable background execution on iOS |
| A21 | Soft-delete satisfies Apple's account deletion requirement | Need to verify Apple's exact requirements — they may require full data purge |
