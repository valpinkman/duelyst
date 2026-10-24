pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 02-MainMenuItemView.dom | 0.000 % | 0.098 % | 0.195 % | ok |
| 02-MainMenuItemView | 1.449 % | 2.083 % | 4.167 % | ok |
| 17-WatchShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 17-WatchShell | 0.837 % | 1.147 % | 2.295 % | ok |

## Port

#63: watch screen on Lit (`<duelyst-watch>`). Before: e1543e19. After: 2714dd3d.

## Visible differences

None in the screen itself.
- **17-WatchShell.dom**: pixel-identical, 0.000 %. Same tabs (Live streams / Replays), same division row with Bronze selected, same empty-state line, same close button.
- **17-WatchShell** (full frame): 0.837 %, all in one blob at the bottom right. That is the blurred cocos backdrop's sunset glow, which animates; its own noise is 1.15 %.
- **02-MainMenuItemView**: 0.000 % on the `.dom` image. The full frame differs only in the floating lanterns at the top and the sunset clouds at the bottom right.

Generated with test/e2e/visual (issue valpinkman/duelyst#71, branch mr/71-screen-visual-diff @ d0bf8041). Magenta boxes are masks (card sprites, main-menu zodiac canvases and hint bubbles), painted identically on both sides. Strips: before | after | diff (changed pixels in red).
