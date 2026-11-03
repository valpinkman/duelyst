pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 04-ProfileShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 04-ProfileShell | 0.000 % | 0.000 % | 0.500 % | ok |
| 08-BuddiesShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 08-BuddiesShell | 0.000 % | 0.000 % | 0.500 % | ok |
| 09-BuddySelectionShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 09-BuddySelectionShell | 0.139 % | 0.000 % | 0.500 % | ok |
