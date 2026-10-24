pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 01-TutorialLessonsShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 01-TutorialLessonsShell | 0.000 % | 0.000 % | 0.500 % | ok |
| 02-MainMenuItemView.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 02-MainMenuItemView | 0.140 % | 2.076 % | 4.151 % | ok |

## Port

#58: tutorial lessons on Lit (`<duelyst-tutorial-lessons>`). Before: e1fce258 (parent of the merge). After: e1543e19.

## Visible differences

None.
- **01-TutorialLessonsShell**: pixel-identical, 0.000 % on both the `.dom` image and the full frame. Same title, same three skipped lessons with the red slash, same CONTINUE and SKIP placement.
- **02-MainMenuItemView.dom**: 0.000 %. The full frame differs by 0.140 % in the animated cocos backdrop only (floating lanterns, sunset glow), well under its own noise of 2.08 %.

Generated with test/e2e/visual (issue valpinkman/duelyst#71, branch mr/71-screen-visual-diff @ d0bf8041). Magenta boxes are masks (card sprites, main-menu zodiac canvases and hint bubbles), painted identically on both sides. Strips: before | after | diff (changed pixels in red).
