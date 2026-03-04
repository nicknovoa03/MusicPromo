# Template Parity System

This project uses a preview/export parity contract so templates can be added once and stay visually aligned.

## Core Rule

A template's preview and export must read the same shared spec values for:

- geometry/layout
- vinyl tone (shade, label, hole)
- key stage colors

## Current Shared Spec Files

- `src/lib/simpleSpinTemplateSpec.ts`
- `src/lib/spinningCdTemplateSpec.ts`
- `src/lib/vinylTemplateSpec.ts`

## Registration Contract

Each template in `src/lib/templates.ts` declares:

- `StageComponent` (preview UI)
- `renderVideo` (FFmpeg export)
- `parity.layoutSpec`
- `parity.vinylTone`

## Add a New Template (Checklist)

1. Create `<template>NameTemplateSpec.ts` with all geometry constants.
2. Add any reusable color/tone constants (or use `vinylTemplateSpec`).
3. Build preview `StageComponent` only from shared spec values.
4. Build FFmpeg renderer only from shared spec values.
5. Register template in `src/lib/templates.ts` with `parity` metadata.
6. Verify in app: screenshot preview + export frame and compare.

## Why This Works

Spec-first templates remove drift caused by duplicated "magic numbers" in two places. It also makes template additions predictable: define spec once, consume it in both preview and exporter.
