# Flyer workflow design

_Started 2026-05-12 02:40 UTC_

---

## User

GitHub connected

## Assistant

Hi! GitHub is connected. You can now paste a repository URL and I'll explore its structure, import files you need, and use it as reference for design work.

Go ahead and share a GitHub repo link whenever you're ready!

## User

I want to add a similar workflow but for making flyers for announcing shows! lets brainstorm! do you need my repo first?

## Assistant

Let me explore the local app first to understand the current system, then we can brainstorm the flyer workflow!

_[tool: local_ls]_

Thanks for granting access! Let me explore the app structure now.

_[tool: local_ls]_

Ready when you are! Once you grant access, I'll explore the app and we can brainstorm the flyer workflow together.

## User

i need to give you the updated code in the repo i think

## Assistant

Perfect! Go ahead and paste the GitHub repo URL and I'll import the relevant files to understand the current workflow. That'll give us a solid foundation for brainstorming the flyer feature.Got it! No problem — let's work from your GitHub repo instead. Paste the URL and I'll dive into the code to understand the current music promo workflow, then we can brainstorm how to adapt it for show flyers.

## User

https://github.com/nicknovoa03/MusicPromo/tree/phase-8

## Assistant

Let me explore the repo to understand the current workflow.

_[tool: github_get_tree]_

Let me dig deeper into the app structure and read the CLAUDE.md to understand the current workflow.

_[tool: github_read_file]_

_[tool: github_get_tree]_

_[tool: github_get_tree]_

Let me read the brand guide and product requirements to get a full picture.

_[tool: github_read_file]_

_[tool: github_read_file]_

Great! I've got the full context now. Here's what I'm seeing:

**Current state:** MusicPromo is a React Native/Expo app for creating short promo videos from a photo + audio clip. The workflow is: pick media → trim audio → preview → export → save/share to Instagram or TikTok. It uses FFmpeg for rendering, Clerk for auth, Convex for backend, and follows Meta's Edits app aesthetic (light for browsing, dark for editing).

**For adding a flyer workflow**, here are the key design questions so I can brainstorm with you:

1. **Flyer scope** — Are flyers about announcing *individual shows* (venue/date/time + artist info + maybe a promo video thumbnail), or are they more general *tour announcement* flyers (multiple shows, heavily design-customizable)?

2. **Media inputs** — What should feed a flyer? Just the photo/audio from a promo project, or also text (artist name, date, venue, ticket link)? Should artists be able to upload custom artwork or use templates?

3. **Output format** — Is the flyer primarily for:
   - Printing (PDF, high-res)
   - Digital sharing (Instagram story/feed, email, web)
   - Both?

4. **Design customization** — How much control should artists have?
   - Pick from curated templates (like the 3 vinyl/CD templates for promos)?
   - Tweak colors, fonts, layout?
   - Free-form text editing?

5. **Integration with promos** — Should flyers live in the same "Create" tab, or a separate feature? Can an artist create a flyer from an existing project?

6. **Show data** — Do you have a database/form for entering show details (venue, date, city), or is that all manual text entry per flyer?

Let me know your thinking on these, and I can sketch out a workflow design!

## User

1. Yes a flyer's about announcing in a individual shows yeah let's let's keep it with that And it would have yeah the venue date time artist info The promo would be something you would generate separate from that and I can give an example of what some cool some cool ones look like.

2. No yeah we're also want to put in Photos audio would be really cool too to put an audio onto a project and text And I think it would make sense for artists to be able to upload custom artwork and use templates I want to have multiple flyer templates.

3. The output format will be for digital sharing and also for printing yeah you can do both Maybe just one for now just to keep it simple but design wise it's kind of the same thing so let's just do both.

4. Yeah I want to have some basic curated templates and from there they can choose the colors fonts adjust some other things from it and then also have freeform text editing that'd be huge.

5. yes use the existing create tab workflow! I'm trying to think how artists would create a flyer from the existing project It would probably only use possibly the audio this is kind of something different than a music promo so I don't think they really are too intertwined.

6. i do not have a database


let me know if this makes sense

## Assistant

Perfect, that makes sense! Let me clarify a couple quick things before I brainstorm:

**Quick clarifications:**

1. **Audio on flyer** — So artists can *add audio* to a flyer project (like a 10-second clip of the song playing when someone views it digitally)? Or is it more like: the audio file is *referenced* for metadata (song title, artist), but the flyer itself is static/visual-only?

2. **Show data entry** — Since you don't have a shows database yet, should the flyer picker have a simple form where artists manually enter:
   - Venue name
   - Date (calendar picker?)
   - Time
   - City
   - Ticket link (optional)
   
   Then those populate into the template? Or would you rather keep it even simpler for now?

3. **Template examples** — You mentioned you have cool flyer examples. Can you share a screenshot or link so I can see the visual style you're imagining? (Color treatment, layout, typography, imagery placement, etc.)

4. **Separation from promo** — So the flyer *create flow* would be its own path separate from the promo-video create, right? Like maybe a "Create" screen with two options: "Promo Video" vs "Show Flyer"?

Once I see the examples and get clarity on those two points, I can sketch a full workflow + design system for the flyer feature!

## User

1. Yeah I would like to add audio to the flyer in the same way where you can adjust the of the audio you want to do and also trim it we should add that same functionality into the flyer and essentially make it into a video Maybe eventually we can add some moving components to this video too to make it look like a GIF or like the Flyers moving right like a small video but we can consider that for the future.

2. all except ticket link. we cannot embed that.

3. attaching images of flyer i like 

4. Yes currently on the app when you go to create you can create a music promo you can create an SPK a song press kit and you'll be able to create a flyer maybe we name it something you know a little bit more brandable but that's the gist

## Assistant

Excellent — those flyers are *gorgeous*. I'm seeing a clear visual language here:

**Flyer DNA:**
- **Aesthetic:** Bold, high-contrast, event-focused typography + bold backgrounds (solid gradients, textured overlays, halftone patterns)
- **Key elements:** Event title (huge/bold), date/time/venue (organized info blocks), artist lineup, event tag/descriptor (top corner badge), some have illustrative elements (the circle graphic, hand imagery)
- **Color strategy:** Vibrant gradients (purple/gold, coral/pink, rainbow pastels, warm neutrals) + high-contrast text
- **Typography:** Mix of clean sans-serif (headers) + stylized display fonts (event names), layered for visual hierarchy
- **Density:** Information-packed but intentional, not cluttered

Now let me ask the **final design questions** to sketch this properly:

1. **Flyer dimensions** — Should they be:
   - Square (1:1) for Instagram feed?
   - Portrait (9:16) for Stories/mobile?
   - A4 (print standard)?
   - All of the above, selectable?

2. **Branding** — Should every flyer have a MusicPromo watermark/badge, or keep them fully artist-owned?

3. **Template count** — You said "multiple templates" — are you thinking 3-5 curated styles (like the vinyl/cd/whole promo set), or a larger library?

4. **Feature priorities for MVP** — In order, what matters most?
   - Template picker + text editing?
   - Audio trim + preview?
   - Color/font customization?
   - Photo upload?

Once I lock those down, I'll sketch a **full workflow** (from Create tab → Flyer Picker → Editor → Preview/Export) + a **design system** matching your brand.

## User

1. lets keep it simple for now 9:16 and 4:5

2. small watermark like in the musicpromo videos

3. lets just focus 3 for now but this will be a big part of the app later with lots of templates! so we should make the mechanics modular

4. For the MVP yes we need at least A template picker we need to be able to edit the text trim audio review it yes Change the colors change the fonts and upload custom photos that we could possibly use in the flyer somewhere

## Assistant

Perfect! Now I have everything I need. Let me lay out the **brainstorm** and then sketch a design:

_[tool: update_todos]_

## 🎬 Flyer Workflow Brainstorm

**The workflow mirrors the promo video flow but is optimized for event announcements:**

```
Create Tab → Choose "Show Flyer"
    ↓
Flyer Media Picker (audio + photo + show info)
    • Select or record audio clip (trim just like promo)
    • Upload custom photo OR use blank/colored bg
    • Enter: Event Title, Date, Time, City, Venue
    ↓
Flyer Editor (dark theme, like promo editor)
    • Template rail: swipe between 3 curated styles
    • Text blocks: tap to edit (event title, date, time, venue, artist, genres)
    • Colors: tap to change primary/accent/bg colors
    • Fonts: choose from 2-3 font pairings per template
    • Photo: swap or reposition
    • Live preview updates instantly
    ↓
Preview (with audio trim scrubber + play/pause)
    • See flyer with audio playing
    • Optional template-info badge (like promo)
    ↓
Export as Video (MP4 with audio, like promo)
    • Render duration: ~5-10 seconds (just the flyer, not the full audio)
    • Can export as still image (PNG/JPG) too (future)
    ↓
Share to Instagram/TikTok + Save to Camera Roll
```

---

## 🎨 Template Strategy (Modular for Future Growth)

**3 MVP Templates:**
1. **"Bold"** — Big event title, stacked info blocks, gradient bg, halftone overlay (like DISCO at dusk)
2. **"Vibrant"** — Color-blocked layout, circular imagery element, clean sans-serif + display font mix (like Summer Loading)
3. **"Minimal"** — Pastel gradient bg, centered text, soft typography, room for custom photo (like Thursday Night Fever)

Each template has:
- Configurable text blocks (event title, date, time, venue, artist, descriptor)
- Configurable colors (primary text, accent, background gradient/solid)
- Configurable fonts (2-3 pairings per template)
- Optional photo slot placement
- Optional decorative elements (halftone, overlay texture, badge accent)

**Modular architecture:**
- Each template is a React component with props for `{textContent, colors, fonts, photo, audioTrimRange}`
- Shared color/font token system (so future templates inherit the same tweakable palette)
- Template registry makes it easy to add #4, #5, #6 later without rewriting the editor

---

## 🎯 Design Decisions

- **Aspect ratio:** 9:16 portrait (Stories-first) + 4:5 square (Feed-first). User picks on entry.
- **Audio:** Optional but recommended. Adds impact when sharing as a video. Trimmed just like promo.
- **Export:** MP4 video by default (promo-style with audio), with option to export static image (future).
- **Theme:** Dark editor (consistent with promo), light media picker (consistent with promo picker).
- **Watermark:** Small MusicPromo badge in corner (like promo videos).

---

Now I'll **design the full UI + sketch the 3 templates**. Shall I create an interactive design document in HTML showing:
1. The picker flow (show info entry form)
2. The editor (template rail, text editing, color/font tweaks)
3. The 3 template previews (9:16 + 4:5 examples)
4. The export/share screen

Should I pull your brand colors and fonts from the repo to make it pixel-perfect, or work from the design system you shared (Inter font, dark/light theme, high-contrast accents)?

## User

amazing i love the breakdown, only thing is id want an option to export with static image out of the box

## Assistant

Perfect! So **both MP4 (with audio) and static image (PNG/JPG)** as export options from the start. That's cleaner UX — users can pick what they need immediately.

Now let me create the **interactive design** showing the full flyer workflow + the 3 template styles. I'll:

1. Import your brand colors/fonts from the repo
2. Design the picker → editor → preview → export flow
3. Show all 3 templates in both 9:16 and 4:5 aspect ratios
4. Make the editor tweakable so you can see color/font changes live

Let me grab the design tokens from your codebase first:

_[tool: github_get_tree]_

_[tool: github_get_tree]_

_[tool: github_read_file]_

_[tool: github_read_file]_

Perfect! I have all the design tokens. Now I'll create an **interactive design document** showing the complete flyer workflow with the 3 templates, live editing, and both export options.

_[tool: write_file]_

_[tool: show_to_user]_

Perfect! I've created a **complete design document** for the Show Flyer feature showing:

✅ **Feature Overview** — All 7 key capabilities (templates, audio trim, text editing, colors, fonts, photo upload, dual export)

✅ **Workflow Flow** — 4-step user journey: Create Menu → Media Picker → Editor → Export

✅ **3 Template Styles** — Bold (textured/dark), Vibrant (colorful), Minimal (pastel) with visual previews and design rationale

✅ **Editor Interface Mockup** — Dark editing surface showing template rail, text inputs, color swatches, font picker, audio/photo controls

✅ **Export Options** — Both MP4 video (with audio) and static image (PNG/JPG), both aspect ratios (9:16 + 4:5)

✅ **Architecture Notes** — Modular template system, shared design tokens, aspect-ratio agnostic rendering, FFmpeg integration

✅ **Next Steps** — 6-phase implementation roadmap from data model → components → picker → editor → renderer → integration

---

**Key design decisions baked in:**
- Matches your existing MusicPromo aesthetic (Inter font, dark/light theme, design tokens)
- Reuses existing trim UI logic from promo workflow
- Modular template system ready for future expansion (easy to add templates #4, #5, #6 later)
- Both video + image exports from day one
- Small watermark (like promos)
- Event info fields: title, date, time, venue, city

Take a look and let me know what you'd like to adjust — colors, template styles, layout, or any of the next-steps priorities! 🎉

## User

oh hell no, the idea is there but that design looks like shit. redo it and make it look on brand to what already exists

## Assistant

_[tool: copy_starter_component]_

_[tool: copy_starter_component]_

You're right — that was a web design doc, not an app design. Let me redo this as actual iOS app screens that match the MusicPromo aesthetic (light browse / dark edit, Inter, neutral high-contrast, like Meta's Edits app).

_[tool: read_file]_

_[tool: grep]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: write_file]_

Let me rebuild this properly — as actual iOS app screens matching the existing MusicPromo Edits-app aesthetic, with the textured/grainy/halftone flyer treatments from your references.Now let me write the screens and the main canvas file:

_[tool: write_file]_

_[tool: grep]_

Now let me write the main HTML file that wraps it all together:

_[tool: write_file]_

_[tool: show_html]_

_[tool: done]_

_[tool: fork_verifier_agent]_

I've rebuilt this as actual iOS app screens on a design canvas matching your existing MusicPromo aesthetic. Take a look at the canvas — you can pan, zoom, and focus any artboard. Here's what's there:

**3 Flyer Templates** (top section) — Designed with proper texture/grain/halftone to match your references:
- **Heat** — warm radial gradient + halftone dots (DISCO at dusk vibe)
- **Iridescent** — holographic rainbow gradient + condensed type (EUPHOR EASTER vibe)
- **Vintage** — warm grainy radial + script + Anton (Thursday Night Fever vibe)

**Browse Flow** (light theme) — Create menu (3 options: Promo / SPK / Flyer) + Flyer details form with audio/photo cards and event detail rows

**Editor** (dark theme) — Matches the existing editor pattern: large preview + template rail + tab bar (Text / Colors / Fonts / Photo / Audio). Includes a text-editing state showing the selected title block + audio trim screen with waveform

**Export sheet** — Video MP4 or static image PNG, 9:16 / 4:5 toggle, IG gradient share button

**Template Variants** — Same template at 9:16 vs 4:5 to show the system adaptsTake a look — the templates should now feel closer to your reference flyers, and the iOS screens should match your existing MusicPromo light/dark theme split. Let me know which template directions to push further or what to tweak!

