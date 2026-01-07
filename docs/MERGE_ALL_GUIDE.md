# How to Create a "Merge-All" Pull Request

This guide explains how to use the `merge-all-prs.sh` script to create a single aggregator pull request that combines multiple open PRs. This is useful for landing a group of related features at once.

## Overview

The `merge-all-prs.sh` script automates the following process:

1.  **Creates a `merge-all` branch:** A fresh branch is created from the `master` branch.
2.  **Fetches and merges branches:** It fetches and merges a list of specified branches one by one.
3.  **Runs tests:** After each successful merge, it runs the project's test suite to ensure that no regressions have been introduced.
4.  **Handles failures:** The script will stop if a merge conflict occurs or if the tests fail, allowing you to resolve the issue before continuing.

## Prerequisites

- You must have `pnpm` installed and all project dependencies up to date (`pnpm install`).
- You must have a clean working directory.

## Usage

To use the script, run it from the root of the repository and provide a space-separated list of the branches you want to merge.

### Example

```bash
./scripts/merge-all-prs.sh feature/feature-1 feature/feature-2 bugfix/fix-bug-1
```

In this example, the script will attempt to merge the following branches into the `merge-all` branch in this order:

1.  `feature/feature-1`
2.  `feature/feature-2`
3.  `bugfix/fix-bug-1`

## How it Works

1.  **Branch Creation:** The script will create a new branch named `merge-all` from the `master` branch. If a `merge-all` branch already exists, it will prompt you to delete it and start fresh.

2.  **Sequential Merging:** The script will iterate through the list of branches you provide and merge them into the `merge-all` branch one at a time.

3.  **Testing:** After each successful merge, the script will run the command `pnpm test`. If the tests pass, it will proceed to the next branch.

## Handling Failures

### Merge Conflicts

If a merge conflict occurs, the script will stop and provide instructions on how to resolve the conflict. You will need to resolve the conflicts in a separate terminal, commit the changes, and then you can either re-run the script with the remaining branches or merge them manually.

### Test Failures

If the tests fail after a merge, the script will stop. This indicates that the last merged branch introduced a regression. You will need to investigate the test failures, fix the issues in the `merge-all` branch, and then continue the merge process manually.

## After the Script Completes

If the script completes successfully, the `merge-all` branch will contain all the merged branches, and all the tests will be passing. You can then push the branch to the remote repository and create a pull request.

```bash
git push origin merge-all
```
