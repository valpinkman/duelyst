pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 02-MainMenuItemView.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 02-MainMenuItemView | 0.080 % | 0.090 % | 0.500 % | ok |
| 17-WatchShell.dom | 0.147 % | 0.000 % | 0.050 % | FAIL |
| 17-WatchShell | 0.311 % | 0.000 % | 0.500 % | ok |

## What this is

Throwaway commit on top of the branch (never pushed): `.watch-games-empty h1 { color: #ff4040; margin-top: 80px }`. `run.mjs --before HEAD~1 --after HEAD --screens MainMenuItemView,WatchShell --noise` **exited 1**.

## Visible differences

- **17-WatchShell.dom**: the expected change, and the only one. The single line of text, "No games to watch in this division yet", goes from white to red and moves down about 40 px. It is only 0.147 % of the frame. The old 0.5 % floor let it through, which is why `.dom` images now have a 0.05 % floor.
- **17-WatchShell** (full frame): the same text change over the blurred cocos backdrop. 0.311 % stays under the 0.5 % whole-frame floor, so this row passes and the `.dom` row is the one that catches it.
- **02-MainMenuItemView.dom**: 0.000 %, untouched as expected. The full-frame row differs only in the animated backdrop.

Generated with test/e2e/visual (issue valpinkman/duelyst#71, branch mr/71-screen-visual-diff @ d0bf8041). Magenta boxes are masks (card sprites, main-menu zodiac canvases and hint bubbles), painted identically on both sides. Strips: before | after | diff (changed pixels in red).
