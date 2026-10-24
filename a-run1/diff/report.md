pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 06-PlayLayout.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 06-PlayLayout | 49.596 % | 1.563 % | 3.127 % | FAIL |
| 08-RiftShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 08-RiftShell | 86.823 % | 0.577 % | 1.154 % | FAIL |
| 09-RiftShell.hover.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 09-RiftShell.hover | 2.461 % | 0.018 % | 0.500 % | FAIL |
| 10-RiftRunShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 10-RiftRunShell | 26.215 % | 3.441 % | 6.881 % | FAIL |
| 16-CodexLayout.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 16-CodexLayout | 4.448 % | 0.000 % | 0.500 % | FAIL |
