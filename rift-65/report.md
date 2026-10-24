pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 08-RiftDeckSelectLayout.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 08-RiftDeckSelectLayout | 0.685 % | 0.321 % | 0.641 % | FAIL |
| 09-RiftRunShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 09-RiftRunShell | 5.002 % | 4.304 % | 8.608 % | ok |

## Port

#65: rift run on Lit (`duelyst-rift-run` in a Marionette shell). Before: 2714dd3d. After: 86171078.

## Visible differences

None that come from the port.
- **09-RiftRunShell.dom**: 0.000 %.
- **09-RiftRunShell** (full frame): 5.0 % against a noise of 4.3 %. Both sides show the same four generals (Lilithe Blightchaser, Kara Winterblade, Ciphyron Ascendant, Scioness Sajj) at the same positions. The red pixels are only the generals' idle sprite animation and the glow around each card frame. (This row needed a 6 s hold before capturing. Without it, the cocos deal-in animation was caught at different stages: 1 card before, 4 after.)
- **08-RiftDeckSelectLayout.dom**: 0.000 %.
- **08-RiftDeckSelectLayout** (full frame): **marked FAIL**, 0.685 % against a limit of 0.641 %. The diff is only the lava particle band along the bottom edge. Title, run card ("LEVEL: 1, RATING: 400, 0 / 10") and ticket buttons are identical. This is a false positive from canvas animation: the single noise capture happened to catch calmer lava (0.32 %) than the earlier run (1.25 %). So run.mjs exited 1 here.

Generated with test/e2e/visual (issue valpinkman/duelyst#71, branch mr/71-screen-visual-diff @ d0bf8041). Magenta boxes are masks (card sprites, main-menu zodiac canvases and hint bubbles), painted identically on both sides. Strips: before | after | diff (changed pixels in red).
