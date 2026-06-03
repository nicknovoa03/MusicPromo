# Premium Feel Audit

Source: https://codewithbeto.dev/blog/how-i-make-apps-feel-premium  
Audited: 2026-06-02  
Score: **52/100 — Decent**

The 5 dimensions below define what separates a premium-feeling app from a cheap one. None are about flashy effects — they are 50 invisible decisions users feel but never consciously notice. This document captures where MusicPromo stands today and what to fix.

---

## 1. Press States & Spring Physics — 10/20

**Principle:** Buttons should feel like physical objects. There should be a tiny scale-down in the ~100ms between finger-down and action-fire. Flat opacity fades or no feedback at all feel cheap.

**Current state:**
- `scale: 0.97` on AudioTrimmer circle buttons (`src/components/create/AudioTrimmer.tsx`)
- `scale: 0.99` on TemplateCustomizeModal apply button (`src/components/create/TemplateCustomizeModal.tsx`)
- Opacity-only press states on most other Pressables (TemplateSwitcher, nav items, home project cards, create button, picker items)
- No `pressto`, no `react-native-reanimated`, no spring physics anywhere

**Target:** Every primary CTA and tappable card uses a scale-down press animation with spring physics. Use the `pressto` library (built on reanimated + gesture-handler) for minimal setup.

**Priority:** High — applies to every screen.

---

## 2. Subtle Animations — 10/20

**Principle:** Animate only when motion clarifies what just happened. Every animation should answer a question the user just asked. If you can't name the question, cut it. Speed: 150–300ms. Anything longer feels like the app is showing off.

**Current state:**
- Built-in `Animated` API with `Easing.out(Easing.cubic)` at 240ms for modal open/close — duration is good
- Scroll-driven parallax in EditMediaModal and TemplateSwitcher — purposeful
- No `react-native-reanimated`, no `react-native-ease`
- All animations run on the JS thread (bridge overhead)

**Target:** Use `react-native-ease` for animations — uses Core Animation on iOS and Animator on Android (zero JS overhead). Same timing/easing API shape as what's already written, drop-in replacement.

**Priority:** Medium — performance gain, not a visible regression.

---

## 3. Haptics — 15/20

**Principle:** Haptics confirm state changes and decisions — not navigation, not scrolling, not idle taps. If the user did something the system needs to acknowledge, that's a haptic moment. Too many haptics = noise = cheap.

**Current state:**
- `expo-haptics` installed and used well in 4+ components
- Template selection, trim actions, aspect ratio picks, home screen interactions
- Proper iOS/Android fallback logic with `Context_Click` / `Segment_Tick` variants
- Not fired on every tap — usage pattern is correct

**Target:** Consider migrating to `react-native-pulsar` (Software Mansion) for haptic presets, custom pattern composition, and real-time control. Low urgency — current implementation is solid.

**Priority:** Low — keep doing what's working. Pulsar is a nice-to-have upgrade.

---

## 4. Keyboard Behavior — 9/20

**Principle:** Keyboard behavior separates serious developers from the rest. Inputs must not get covered. The submit button must stay visible. The keyboard layout should animate in sync with the keyboard — not pop. Drag-to-dismiss should feel intentional.

**Current state:**
- `KeyboardAvoidingView` with `behavior="padding"` on iOS across SPK screens and profile
- `keyboardShouldPersistTaps="handled"` in a few scroll views
- No `react-native-keyboard-controller` — layout doesn't animate in sync with keyboard
- No drag-to-dismiss on any text input
- Keyboard pops rather than slides on SPK detail/metadata forms

**Target:** Replace `KeyboardAvoidingView` with `react-native-keyboard-controller`. Implement swipe-down-to-dismiss on SPK prompt/metadata inputs using `react-native-gesture-handler` pan gesture.

**Priority:** High for SPK screens (most keyboard-heavy). Medium for other forms.

---

## 5. Loading & Empty States — 8/20

**Principle:** Spinners say "I'm working, please wait." Premium apps don't ask users to wait. Skeleton screens with shimmer outline the shape of the content before the data arrives — when data shows up, it feels like it was always there. Empty states must explain what goes there, why it's empty, and what to do next.

**Current state:**
- `ActivityIndicator` spinners used for: font loading, save state, delete operations, template customization, background studio
- Home screen empty state is solid: native `ContentUnavailableView` on iOS 17+, icon + title + subtitle fallback
- All other empty conditions (e.g., `FlyerLineupBlock`) return `null` — blank screen
- No skeleton screens, no shimmer anywhere

**Target:**
- Replace home screen project grid spinner with a skeleton shimmer that matches the card layout
- For AI generation flows (future): shimmer text cycling through status messages while generation runs
- For any list that can be empty: add a designed empty state (icon + explanation + CTA), never return `null`

**Priority:** Highest — the home screen is the first screen every user sees, and it currently shows a spinner.

---

## Score Summary

| Dimension | Score | Priority |
|---|---|---|
| Press states | 10/20 | High |
| Subtle animations | 10/20 | Medium |
| Haptics | 15/20 | Low |
| Keyboard behavior | 9/20 | High (SPK) |
| Loading & empty states | 8/20 | **Highest** |
| **Total** | **52/100** | |

**Tier: Decent (41–65)**

---

## Recommended Fix Order

1. **Skeleton shimmer on home screen project grid** (`app/(tabs)/index.tsx`) — most visible gap, self-contained, shippable fast
2. **`pressto` press animations** on primary CTAs — every screen benefits, start with create button and project cards
3. **`react-native-keyboard-controller`** in SPK screens — replaces `KeyboardAvoidingView`, keyboard animates in sync
4. **`react-native-ease`** for existing timing animations — zero JS overhead, drop-in for what's already written
5. **Designed empty states** for FlyerLineupBlock and any other `null` returns on empty data

---

## Libraries Referenced

| Library | Purpose | Status |
|---|---|---|
| `pressto` | Spring physics press animations | Not installed |
| `react-native-ease` | Zero-JS-thread animations (Core Animation / Animator) | Not installed |
| `react-native-pulsar` | Haptic presets + custom patterns | Not installed (using expo-haptics) |
| `react-native-keyboard-controller` | Keyboard-synchronized layout + drag-to-dismiss | Not installed |
| `react-native-reanimated` | Foundation for pressto + gesture animations | Not installed |
| `react-native-gesture-handler` | Pan gesture for swipe-to-dismiss | Not installed |
| `expo-haptics` | Current haptics implementation | Installed, working well |
