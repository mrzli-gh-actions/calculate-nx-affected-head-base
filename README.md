# calculate-nx-affected-head-base

Calculate the `head` and `base` shas for `nx affected` command.

Based on [https://github.com/nrwl/nx-set-shas](https://github.com/nrwl/nx-set-shas).

`nrwl/nx-set-shas` works as described on [https://github.com/nrwl/nx-set-shas#problem](https://github.com/nrwl/nx-set-shas#problem).

## Input parameters

- `main-branch-name` - name of the main branch.
- `version-bump-commit-message-summary-matcher`
  - Regex used to match the commit summary.
  - If successfully matched, the commit is considered a release chore.
  - Only a single commit is tried, the chronologically earliest immediate child (if there are multiple)
    of commit connected to the last successful workflow run.
  - Example: `^chore(release): `

## Output parameters

-  `base` - base commit sha used in `nx affected` calculation.
-  `head` - head commit sha used in `nx affected` calculation.

## How does it work

### Push to main branch

This action will calculate the SHAs similar to the way `nrwl/nx-set-shas` does it.
It will however allow you to take into account a release chore commit that is potentially run after the last successful CI run.
It will then take it as `base` instead of the commit connected to the successful run,
to take version increments (done by release chore) out of the `nx affected` calculation.

### Push to non-main (feature) branch

This action will set `head` to `HEAD` commit of feature branch,
and `base` to the commit in main branch (`master` or `main` usually)
from which the feature branch originated.

So it is very similar to the algorithm as used by `nrwl/nx-set-shas`,
but it will react to any push on feature branch, not to PR.
