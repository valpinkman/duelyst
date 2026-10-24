pixelmatch threshold 0.1; a screen fails above max(floor, 2 x noise), the floor being 0.5 % for a whole frame and 0.05 % for a .dom image.

| Screen | Diff | Noise | Limit | Result |
| --- | --- | --- | --- | --- |
| 03-QuestLogShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 03-QuestLogShell | 0.768 % | 1.196 % | 2.393 % | ok |
| 04-ProfileShell.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 04-ProfileShell | 0.000 % | 0.000 % | 0.500 % | ok |
| 05-ProfileShell-faction-levels.dom | 0.010 % | 0.000 % | 0.050 % | ok |
| 05-ProfileShell-faction-levels | 0.011 % | 0.000 % | 0.500 % | ok |
| 06-ProfileShell-rank-history.dom | 0.003 % | 0.000 % | 0.050 % | ok |
| 06-ProfileShell-rank-history | 0.002 % | 0.000 % | 0.500 % | ok |
| 07-ProfileShell-match-history.dom | 0.331 % | 0.333 % | 0.666 % | ok |
| 07-ProfileShell-match-history | 0.351 % | 0.353 % | 0.706 % | ok |
| 08-BuddiesLayout.dom | 0.000 % | 0.000 % | 0.050 % | ok |
| 08-BuddiesLayout | 0.549 % | 0.712 % | 1.424 % | ok |
