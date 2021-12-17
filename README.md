# calculate-nx-affected-head-base

Calculate the `head` and `base` shas for `nx affected` command.

Based on [https://github.com/nrwl/nx-set-shas](https://github.com/nrwl/nx-set-shas).

`nrwl/nx-set-shas` works as described on [https://github.com/nrwl/nx-set-shas#problem](https://github.com/nrwl/nx-set-shas#problem).

## How does it work

### Push to main branch

This action will calculate the SHAs exactly the same was as `nrwl/nx-set-shas`.

### Push to non-main (feature) branch

This action will set `head` to `HEAD` commit of feature branch,
and `base` to the commit in main branch (`master` or `main` usually)
from which the feature branch originated.

So also exactly the same algorithm as used by `nrwl/nx-set-shas`, but it will
react to any push on feature branch, and not just PR.
