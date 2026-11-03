pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 25-BuddiesShell-add-prompt.dom | 0.000 % | - | 0.050 % | ok |
| 25-BuddiesShell-add-prompt | 0.000 % | - | 0.500 % | ok |
| 26-BuddiesShell-search-nomatch.dom | 0.000 % | - | 0.050 % | ok |
| 26-BuddiesShell-search-nomatch | 0.000 % | - | 0.500 % | ok |
