# Retro Janken Arcade - Character Size Fix

This is a CSS-only fix.

## What changed

- Keeps the CPU character larger on phones where the browser viewport height becomes short.
- Adjusts only `.character-frame` inside the existing `@media (max-height: 760px)` and `@media (max-height: 680px)` blocks.
- Does not change `script.js`.
- Does not change debug mode.
- Does not change the existing win / lose / draw / chance / final animations.

## Files to upload

Upload only this file to the repository root:

- `style.css`

If the change does not appear on GitHub Pages immediately, reload the page after clearing cache or wait a few minutes for the browser to re-check the CSS.
