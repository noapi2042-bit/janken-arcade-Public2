# Retro Janken Arcade

A smartphone-friendly retro arcade rock-paper-scissors game.

## Character Images

This prototype uses these 7 CPU character images:

- `character_normal.png`
- `character_happy.png`
- `character_smug.png`
- `character_worried.png`
- `character_panic.png`
- `character_excited.png`
- `character_lose.png`

Internal moods such as `win`, `draw`, and `shocked` are mapped to the existing 7 images.

## Scene Images

These scene illustrations are used for intro and ending cutscenes:

- `scene_intro.png`
- `scene_player_win.png`
- `scene_player_lose.png`

## Sounds

Expected sound files:

- `bgm_loop.mp3`
- `bgm_chance.mp3`
- `bgm_final.mp3`
- `bgm_true_end.mp3`
- `cutin_stinger.mp3`
- `se_janken_call.mp3`

`cutin_stinger.mp3` is used only for psych, chance, and final cinematic cut-ins.
`bgm_true_end.mp3` is used only during TRUE END.
`se_janken_call.mp3` is a short under-1-second sound used for the janken call rhythm.

## Controls

After starting the game, a short input guide points to the rock-paper-scissors buttons.

In Final Janken mode, the first button press is a confirmation step. Press the same hand again to lock in the final choice.

## Gallery Progress

Gallery mode is a route-based collection feature.

Main completion targets:

- Normal Clear: win a regular 10-win match
- Game Over: let the continue countdown reach 0 after losing the match
- Chance Time Clear: win after reaching 10 draws and entering 2-point mode
- Final Janken Clear: win after reaching 15 draws and clearing the final janken

Gallery completion is calculated from these 4 route endings.

When all 4 route endings are unlocked, TRUE END becomes available.

Debug unlock buttons save gallery progress to localStorage. Use RESET GALLERY to clear test progress.

## Game Over Route

Losing the match does not immediately unlock Game Over.

After the player loses, the CONTINUE countdown appears.
If the player retries, Game Over is not unlocked.
If the countdown reaches 0, the GAME OVER scene is shown and the Game Over gallery route is unlocked.

This keeps the arcade-style flow:

Lose -> CONTINUE? -> Retry or GAME OVER.

## Gallery Reset During Testing

Gallery progress is saved in localStorage.

During testing, if GALLERY appears on the title screen unexpectedly, open debug mode and press RESET GALLERY, or clear the browser site data.

The release build uses a versioned key:

- `jankenGalleryProgressV3`

Older test keys are ignored.

## True Ending

TRUE END reveals why the CPU character wanted to keep drawing.
It is shown automatically when gallery completion reaches 100% for the first time.

## Relationship Phase

The CPU character gradually changes her behavior.

At first, she plays to win.
As the player reaches repeated draws, her prediction lines become more honest.
The player can intentionally match her hinted hand to continue drawing.

After TRUE END, the character behaves as if she already understands the player's hand.
Prediction lines become much more honest, but the game still remains playable.

## Reset Button

After TRUE END, a RESET button appears on the title screen.

RESET clears gallery progress and TRUE END state.
It represents ending the accumulated relationship and returning to the beginning.

## Post True End Draw Record

After TRUE END, the game changes into a soft endless draw challenge.

The player can try to continue drawing as many times as possible.
The highest post-TRUE-END draw count is saved in localStorage.

The CPU character comments on the current record at the start of a new match.
When the player reaches a new record, she reacts happily.

The record is cleared when the RESET button is pressed.

## Quiet Prediction

Prediction hints have two presentations:

- Cinematic prediction: uses the cut-in effect.
- Quiet prediction: only uses dialogue text.

As the relationship phase progresses, quiet predictions become more frequent and more honest.
This makes the game gradually shift from a simple janken game into a relationship-reading game.

## Ending Dialogue

Ending scenes use RPG-style typewriter text.

- Tap once while text is typing to reveal the full line.
- Tap again after the line is complete to continue.
- A blinking triangle indicates that the player can advance.

## AI Use Disclosure

This project uses AI-assisted image generation and development support.

Tools used:

- ChatGPT
- Suno

This project is not officially sponsored by, endorsed by, or affiliated with OpenAI or Suno.

## Credits

Created by noa_pi.

Images and development support: ChatGPT
Music generated with Suno

## Music Use Note

Music was generated with Suno.

If the music was created with Suno's free/basic plan, it should be treated as non-commercial use only unless the license conditions are changed or upgraded.

Please check Suno's current terms before commercial distribution, monetization, or redistribution.

## Assets

Additional optional gallery images:

- `scene_chance_win.png`
- `scene_final_win.png`
- `scene_true_end.png`

If missing, the game keeps running and uses fallback or COMING SOON behavior.

## Route Hints

Some ending messages and draw-route dialogue hint at how to reach the hidden routes.

## Route Hint Priority

Route endings can be unlocked in any order.

The game does not assume that Chance Time Clear always happens before Final Janken Clear.

Ending hints are based on the remaining locked gallery routes, not on a fixed route order.

If Final Janken Clear is unlocked before Chance Time Clear, the game will not hint that there is something beyond 15 draws.


## Stable Core Fixes 2026-06-09

This build intentionally keeps the restored arcade animation feel.
The changes are limited to gameplay stability and operability:

- Kept the original one-file `script.js` structure.
- Kept the existing Debug behavior; `?debug` and the existing debug panel flow are not removed.
- Added keyboard shortcuts without changing the visual animation layer:
  - `1` or `G`: Rock / グー
  - `2` or `C`: Scissors / チョキ
  - `3` or `P`: Paper / パー
  - Gallery: `Escape`, `ArrowLeft`, `ArrowRight`
  - Scene dialogue: `Enter` or `Space`
- Added flow guards so older async title, intro, scene, or round animations are less likely to overwrite the current state after retry/reset/debug operations.

The goal of this patch is not refactoring.
The goal is to keep the current game feel while making the game loop safer.

## Lightweight Performance Fix 2026-06-09

This build keeps the current arcade animation style, but adds a low-end mobile performance mode for devices where the first janken input or audio timing can feel heavy.

Main changes:

- Keeps the one-file `script.js` structure and keeps `?debug` debug mode.
- Adds automatic lightweight mode for low-power devices, and manual controls:
  - `?lite=1` or `?perf=lite` forces lightweight mode.
  - `?full=1` or `?perf=full` forces the full visual mode.
- Warms up the janken call sound pool during the intro so the first rock-paper-scissors button press is less likely to stall.
- Avoids creating AudioContext at page load on low-power mode; audio is initialized after the user's start tap.
- Disables per-character text blip sounds in lightweight mode to reduce audio-thread load and perceived sound drift.
- Defers non-essential scene image preloading in lightweight mode so it does not compete with the first playable input.
- Reduces only expensive continuous CSS effects in lightweight mode, such as always-on glow/drop-shadow/mix-blend pressure.

The main win/lose/draw, chance, final, hand pop, and CRT direction are intentionally preserved.


## Tap Responsiveness Fix 2026-06-09

This build keeps the visual arcade style, but makes the bottom rock-paper-scissors buttons respond on `pointerdown` instead of waiting for the delayed compatibility `click` event on touch devices.

This reduces occasional sluggishness on low-end Android phones when the player taps the three choice buttons repeatedly at a steady rhythm.

The patch also suppresses duplicate delayed click handling after pointer input and lightly reduces disabled-button filter cost in Lite Performance mode.

## Janken Call Lag Fix 2026-06-09

This build keeps the arcade animation direction but reduces lag around the Janken call on lower-end phones.

Changes:

- Shortened the `ジャン` / `ケン` / `ポン` call timing only in Lite Performance mode.
- In Lite Performance mode, the Janken call uses the lightweight WebAudio fallback instead of repeatedly restarting the MP3 one-shot sound.
- Added a short input buffer while a round is resolving, so a tap that lands just before the buttons are re-enabled can be used for the next round instead of feeling ignored.
- Kept `?debug`, existing animations, Chance Time, Final Janken, Gallery, and the single-file `script.js` structure.

Testing note:

- On low-end Android devices, test both the normal URL and `?lite=1`.
- If the Janken call still feels late, check the file dimensions and file size of `character_*.png` and `janken_*.png`. Oversized PNGs can still cause decode and repaint pressure even when the JavaScript is optimized.
