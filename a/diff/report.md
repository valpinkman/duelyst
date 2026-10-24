pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 06-PlayLayout.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 06-PlayLayout | 0.000 % | 0.000 % | 0.500 % | ok |
| 08-RiftShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 08-RiftShell | 0.444 % | 0.047 % | 0.500 % | ok |
| 09-RiftShell.hover.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 09-RiftShell.hover | 1.738 % | 0.774 % | 1.547 % | FAIL |
| 10-RiftRunShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 10-RiftRunShell | 3.271 % | 4.457 % | 8.914 % | ok |
| 16-CodexLayout.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 16-CodexLayout | 0.000 % | 0.000 % | 0.500 % | ok |
