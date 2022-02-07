<p align="center">
  <img src="https://s3.eu-west-2.amazonaws.com/dependabot-images/logo-with-name-horizontal.svg?v5" alt="Dependabot" width="336">
</p>

# Fetch Metadata Action

**Name:** `dependabot/fetch-metadata`

Extract information about the dependencies being updated by a Dependabot-generated PR.

## Usage instructions

Create a workflow file that contains a step that uses: `dependabot/fetch-metadata@v1.1.1`, e.g.

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
      uses: dependabot/fetch-metadata@v1.1.1
      with:
        github-token: "${{ secrets.GITHUB_TOKEN }}"
```

Subsequent actions will have access to the following outputs:

- `steps.dependabot-metadata.outputs.dependency-names`
  - A comma-separated list of the package names updated by the PR.
- `steps.dependabot-metadata.outputs.dependency-type`
  - The type of dependency has determined this PR to be, e.g. `direct:production`. For all possible values, see [the `allow` documentation](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically/configuration-options-for-dependency-updates#allow).
- `steps.dependabot-metadata.outputs.update-type`
  - The highest semver change being made by this PR, e.g. `version-update:semver-major`. For all possible values, see [the `ignore` documentation](https://docs.github.com/en/code-security/supply-chain-security/keeping-your-dependencies-updated-automatically/configuration-options-for-dependency-updates#ignore).
- `steps.dependabot-metadata.outputs.updated-dependencies-json`
  - A JSON string containing the full information about each updated Dependency.

**Note:** These outputs will only be populated if the target Pull Request was opened by Dependabot and contains
**only** Dependabot-created commits.

This metadata can be used along with Action's [expression syntax](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#functions) and the [GitHub CLI](https://github.com/cli/cli) to create
useful automation for your Dependabot PRs.

### Auto-approving

Since the `dependabot/fetch-metadata` Action will set a failure code if it cannot find any metadata, you can
have a permissive auto-approval on all Dependabot PRs like so:

```yaml
name: Dependabot auto-approve
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  dependabot:
    runs-on: ubuntu-latest
    # Checking the author will prevent your Action run failing on non-Dependabot PRs
    if: ${{ github.event.pull_request.user.login == 'dependabot[bot]' }}
    steps:
      - name: Dependabot metadata
        id: dependabot-metadata
        uses: dependabot/fetch-metadata@v1.1.1
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"
      - name: Approve a PR
        run: gh pr review --approve "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### Enabling auto-merge

If you are using [the auto-merge feature](https://docs.github.com/en/github/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request) on your repository,
you can set up an action that will enable Dependabot PRs to merge once CI and other [branch protection rules](https://docs.github.com/en/github/administering-a-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule) are met.

For example, if you want to automatically merge all patch updates to Rails:

```yaml
name: Dependabot auto-merge
on: pull_request_target
permissions:
  pull-requests: write
  contents: write
jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: ${{ github.event.pull_request.user.login == 'dependabot[bot]' }}
    steps:
      - name: Dependabot metadata
        id: dependabot-metadata
        uses: dependabot/fetch-metadata@v1.1.1
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"
      - name: Enable auto-merge for Dependabot PRs
        if: ${{contains(steps.dependabot-metadata.outputs.dependency-names, 'rails') && steps.dependabot-metadata.outputs.update-type == 'version-update:semver-patch'}}
        run: gh pr merge --auto --merge "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### Labelling

If you have other automation or triage workflows based on GitHub labels, you can configure an action to assign these based on the metadata.

For example, if you want to flag all production dependency updates with a label:

```yaml
name: Dependabot auto-label
on: pull_request_target
permissions:
  pull-requests: write
  issues: write
  repository-projects: write
jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: ${{ github.event.pull_request.user.login == 'dependabot[bot]' }}
    steps:
      - name: Dependabot metadata
        id: dependabot-metadata
        uses: dependabot/fetch-metadata@v1.1.1
        with:
          github-token: "${{ secrets.GITHUB_TOKEN }}"
      - name: Add a label for all production dependencies
        if: ${{ steps.dependabot-metadata.outputs.dependency-type == 'direct:production' }}
        run: gh pr edit "$PR_URL" --add-label "production"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```
