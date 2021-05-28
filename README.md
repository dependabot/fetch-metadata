<p align="center">
  <img src="https://s3.eu-west-2.amazonaws.com/dependabot-images/logo-with-name-horizontal.svg?v5" alt="Dependabot" width="336">
</p>

# Fetch Metadata Action

**Name:** `dependabot/fetch-metadata`

Extract information from about the dependency being updated by a Dependabot-generated PR.

## Usage instructions

Create a workflow file that contains a step that uses: dependabot/fetch-metadata@v1`, e.g.

```yaml
-- .github/workflows/dependabot-prs.yml
name: Dependabot Pull Request
on: pull_request_target

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Fetch Dependabot metadata
      id: dependabot-metadata
      uses: dependabot/fetch-metadata
      with:
        github-token: "${{ secrets.GITHUB_TOKEN }}"
```

Subsequent actions will have access to the following outputs:

- `steps.dependabot-metadata.outputs.dependency-name`
  - The updated package name
- `steps.dependabot-metadata.outputs.dependency-type`
  - The type of dependency Dependabot has determined this to be, e.g. "direct:production"
- `steps.dependabot-metadata.outputs.update-name`
  - The semver change being made, e.g. "version-update:semver-major"

**Note:** These outputs will only be populated if the target Pull Request was opened by Dependabot and contains
**only** Dependabot-created commits.

This metadata can be used along with Action's [expression syntax](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#functions) and the [GitHub CLI](https://github.com/cli/cli) to create
useful automation for your Dependabot PRs.

### Auto-approving

```yaml
name: Dependabot auto-approve
description: Auto-approve Dependabot PRs
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  dependabot:
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata
      - name: Approve a PR
        run: gh pr review --approve "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### Enabling GitHub automerge

```yaml
name: Dependabot auto-merge
description: Enable GitHub Automerge for patch updates on `bar`
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  dependabot:
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata
      - name: Enable auto-merge for Dependabot PRs # respects checks and approvals
        if: ${{steps.metadata.outputs.dependency_name == "bar" && steps.metadata.outputs.update_type == "version-update:semver-patch"}}
        run: gh pr merge --auto --merge "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### Labelling

```yaml
name: Dependabot auto-label
description: Label all production dependencies with the "production" label
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  dependabot:
    if: ${{ github.actor == 'dependabot[bot]' }}
    steps:
      - name: Dependabot metadata
        id: metadata
        uses: dependabot/fetch-metadata
      - name: Add a label for all production dependencies
        if: contains(steps.metadata.outputs.dependency_type, "production")
        run: gh pr edit "$PR_URL" --add-label "production"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```
