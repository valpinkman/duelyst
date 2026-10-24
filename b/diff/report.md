pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 08-RiftShell.dom | 0.001 % | 0.000 % | 0.050 % | ok |
| 08-RiftShell | 0.029 % | 1.281 % | 2.562 % | ok |
