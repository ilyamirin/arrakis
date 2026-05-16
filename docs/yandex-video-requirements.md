# Yandex Games Video Requirements

Project working notes for preparing Gameplay Video and Advertising Videos for Yandex Games moderation.

## Current Moderation Risks

The last moderation feedback pointed to two video-specific problems:

- Language mismatch in vertical promo video `[en]`: English title mixed with Russian in-game text.
- Third-party HUD in media: browser chrome, Yandex shell, status bars, clocks, charge bars, address bars, or recording UI.

The runtime issues from the same review are tracked separately:

- Cropped game elements at screen edges.
- Interstitial ad shown with delay.
- Untranslated in-game text such as `Collector`.

## Technical Targets

Gameplay videos:

- Vertical: `9:16`, MP4, recommended `1080x1920`, minimum height `400px`, duration up to `28s`, size up to `100 MB`.
- Horizontal: `16:9`, MP4, recommended `1920x1080`, minimum height `400px`, duration up to `28s`, size up to `100 MB`.
- Gameplay must be at least 70% of the video duration.

Advertising videos:

- Up to 20 files can be uploaded.
- Vertical: `9:16`, recommended `1080x1920`, minimum `720x1280`.
- Horizontal: `16:9`, recommended `1920x1080`, minimum `1280x720`.
- Can be more edited than gameplay videos, but must still reflect the real game.

## Language Rules

Any text visible in uploaded media must match the language of the draft where the media is used.

For this project:

- English media must not contain Russian or Turkish UI text.
- Russian media must not contain English game terms such as `Collector`, `Sinkjaw`, `Skimmer`, `Amber`, `New Run`, `Guide`, `Moves`, or `Position`.
- Turkish media must not contain English or Russian UI text.

Safe options:

- Make separate media per language and aspect ratio.
- Or remove all changeable UI text from the edit and show only clean gameplay.

## Required Source Recordings

Minimum if no localizable text is visible in the final videos:

- One vertical/mobile clean gameplay source.
- One horizontal/desktop clean gameplay source.

Minimum if localizable UI text is visible:

- English vertical/mobile source.
- English horizontal/desktop source.
- Russian vertical/mobile source.
- Russian horizontal/desktop source.

If Turkish media will be uploaded too, add:

- Turkish vertical/mobile source.
- Turkish horizontal/desktop source.

The same clean sources can be used to cut both Gameplay Video and Advertising Videos if there is enough variety and pacing.

## Recording Mode

Record in normal clean game mode, not inside the Yandex Games shell.

Do not record:

- Browser address bar or tabs.
- Yandex Games catalog frame, debug panel, rating, carousel, or top/bottom platform UI.
- Phone status bar, clock, battery, charge indicator, network icons, home indicator, or notification overlays.
- Mouse cursor, unless deliberately used as part of an approved gameplay-style capture.
- OBS, QuickTime, media player, or operating system UI.

Yandex mode is still required for SDK/ad callback testing, but it should not be used as the visual source for store videos unless the frame is cropped to pure game content only.

## Capture Guidance

Use a clean browser viewport or render/capture pipeline that outputs only the game area.

Recommended captures:

- Vertical/mobile: `1080x1920`, game scaled cleanly, no device shell.
- Horizontal/desktop: `1920x1080`, game scaled cleanly, no browser shell.

Before sending source files for editing, check:

- No text is cut off.
- Board and HUD are fully inside the frame.
- The selected language is consistent through the whole recording.
- There are no third-party overlays.
- Audio, if included, does not contain notification or system sounds.

## Output Plan

For each language/aspect pair, produce:

- Gameplay Video: mostly continuous gameplay, less edited, shows real interaction.
- Advertising Video: faster pacing, stronger moments, transitions allowed, still truthful to the game.

If a single language-neutral edit is desired, avoid all words in the video and rely on gameplay visuals only.
