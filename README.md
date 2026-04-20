<h1 align="center">
    <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://user-images.githubusercontent.com/7659/174594540-5e29e523-396a-465b-9a6e-6cab5b15a568.svg">
        <source media="(prefers-color-scheme: dark)" srcset="https://user-images.githubusercontent.com/7659/174594559-0b3ddaa7-e75b-4f10-9dee-b51431a9fd4c.svg">
        <img src="https://user-images.githubusercontent.com/7659/174594540-5e29e523-396a-465b-9a6e-6cab5b15a568.svg" alt="Dependabot" width="336">
    </picture>
</h1>

# Fetch Metadata Action

**Name:** `dependabot/fetch-metadata`

Extract information about the dependencies being updated by a Dependabot-generated PR.

## Usage instructions

Create a workflow file that contains a step that uses: `dependabot/fetch-metadata@v2`, e.g.

```yaml
# .github/workflows/dependabot-prs.yml
name: Dependabot Pull Request
on: pull_request
jobs:
  dependabot:
    permissions:
      pull-requests: read
    runs-on: ubuntu-latest
    if: github.event.pull_request.user.login == 'dependabot[bot]' && github.repository == 'owner/my_repo'
    steps:
    - name: Fetch Dependabot metadata
      id: dependabot-metadata
      uses: dependabot/fetch-metadata@v2
      with:
        alert-lookup: true
        compat-lookup: true
        github-token: "${{ secrets.PAT_TOKEN }}"
```

Supported inputs are:

- `github-token` (string)
  - The `GITHUB_TOKEN` secret
  - Defaults to `${{ github.token }}`
  - Note: this must be set to a [personal access token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) or an [installation access token (App Token)](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app) if you enable `alert-lookup` or `compat-lookup`.
- `alert-lookup` (boolean)
  - If `true`, then populate the `alert-state`, `ghsa-id` and `cvss` outputs.
  - Defaults to `false`
  - Note: the `github-token` field must be set to a [personal access token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) or an [installation access token (App Token)](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app). For more details, see [this](#use-with-app-token)
- `compat-lookup` (boolean)
  - If `true`, then populate the `compatibility-score` output.
  - Defaults to `false`
  - Note: the `github-token` field must be set to a [personal access token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).
- `skip-commit-verification` (boolean)
  - If `true`, then the action will not expect the commits to have a verification signature. **It is required to set this to 'true' in GitHub Enterprise Server**
  - Defaults to `false`
- `skip-verification` (boolean)
    - If `true`, the action will not validate the user or the commit verification status
    - Defaults to `false`

Subsequent actions will have access to the following outputs:

- `steps.dependabot-metadata.outputs.dependency-names`
  - A comma-separated list of the package names updated by the PR.
- `steps.dependabot-metadata.outputs.dependency-type`
  - The type of dependency has determined this PR to be.  Possible values are: `direct:production`, `direct:development` and `indirect`.  See [the `allow` documentation](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference#dependency-type-allow) for descriptions of each.
- `steps.dependabot-metadata.outputs.update-type`
  - The highest semver change being made by this PR, e.g. `version-update:semver-major`. For all possible values, see [the `ignore` documentation](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference#ignore--).
- `steps.dependabot-metadata.outputs.updated-dependencies-json`
  - A JSON string containing the full information about each updated Dependency.
- `steps.dependabot-metadata.outputs.directory`
  - The `directory` configuration that was used by dependabot for this updated Dependency.
- `steps.dependabot-metadata.outputs.package-ecosystem`
  - The `package-ecosystem` configuration that was used by dependabot for this updated Dependency.
- `steps.dependabot-metadata.outputs.target-branch`
  - The `target-branch` configuration that was used by dependabot for this updated Dependency.
- `steps.dependabot-metadata.outputs.previous-version`
  - The version that this PR updates the dependency from.
- `steps.dependabot-metadata.outputs.new-version`
  - The version that this PR updates the dependency to.
- `steps.dependabot-metadata.outputs.alert-state`
  - If this PR is associated with a security alert and `alert-lookup` is `true`, this contains the current state of that alert (OPEN, FIXED or DISMISSED).
- `steps.dependabot-metadata.outputs.ghsa-id`
  - If this PR is associated with a security alert and `alert-lookup` is `true`, this contains the GHSA-ID of that alert.
- `steps.dependabot-metadata.outputs.cvss`
  - If this PR is associated with a security alert and `alert-lookup` is `true`, this contains the CVSS value of that alert (otherwise it contains 0).
- `steps.dependabot-metadata.outputs.compatibility-score`
  - If this PR has a known compatibility score and `compat-lookup` is `true`, this contains the compatibility score (otherwise it contains 0).
- `steps.dependabot-metadata.outputs.maintainer-changes`
  - Whether or not the the body of this PR contains the phrase "Maintainer changes" which is an indicator of whether or not any maintainers have changed.
- `steps.dependabot-metadata.outputs.dependency-group`
  - The dependency group that the PR is associated with (otherwise it is an empty string).

**Note:** By default, these outputs will only be populated if the target Pull Request was opened by Dependabot and contains
**only** Dependabot-created commits. To override, see `skip-commit-verification` / `skip-verification`.

This metadata can be used along with Action's [expression syntax](https://docs.github.com/en/actions/reference/context-and-expression-syntax-for-github-actions#functions) and the [GitHub CLI](https://github.com/cli/cli) to create
useful automation for your Dependabot PRs.

> [!NOTE]
> Workflows triggered by Dependabot on the `pull_request` event [run with a read-only `GITHUB_TOKEN`](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions-for-workflow-runs-triggered-by-dependabot) and cannot access user-defined repository or organization secrets. The GitHub-provided token is still available, but only with read-only permissions (prefer `github.token` when referring to that built-in token in examples). If your workflow needs write permissions or access to user-defined secrets, use the [`pull_request_target`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target) event or a separate workflow triggered by [`workflow_run`](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run). The examples below use `pull_request_target` for this reason.

### Auto-approving

Since the `dependabot/fetch-metadata` Action will set a failure code if it cannot find any metadata, you can
have a permissive auto-approval on all Dependabot PRs like so:

> [!NOTE]
> The `GITHUB_TOKEN` approval will come from the `github-actions[bot]` user.
> If your branch protection rules use ["Require approval of the most recent reviewable push"](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches#require-pull-request-reviews-before-merging)
> or restrict which users/teams can provide approving reviews, this approval may not satisfy your merge requirements.
> In those cases, consider using a [PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
> or [GitHub App token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app) instead, but store that credential as a secret, grant it the least privilege needed, and do not expose it to untrusted or PR-controlled code paths. This is especially important for workflows triggered by `pull_request_target`: do not make such secrets available to steps that run code from the pull request.

```yaml
name: Dependabot auto-approve
on: pull_request_target
permissions:
  pull-requests: write
jobs:
  dependabot:
    runs-on: ubuntu-latest
    # Checking the author will prevent your Action run failing on non-Dependabot PRs
    if: github.event.pull_request.user.login == 'dependabot[bot]' && github.repository == 'owner/my_repo'
    steps:
      - name: Dependabot metadata
        id: dependabot-metadata
        uses: dependabot/fetch-metadata@v2
      - uses: actions/checkout@v4
      - name: Approve a PR if not already approved
        run: |
          gh pr checkout "$PR_URL" # sets the upstream metadata for `gh pr status`
          if [ "$(gh pr status --json reviewDecision -q .currentBranch.reviewDecision)" != "APPROVED" ];
          then gh pr review --approve "$PR_URL"
          else echo "PR already approved, skipping additional approvals to minimize emails/notification noise.";
          fi
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### Enabling auto-merge

If you are using [the auto-merge feature](https://docs.github.com/en/github/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request) on your repository,
you can set up an action that will enable Dependabot PRs to merge once CI and other [branch protection rules](https://docs.github.com/en/github/administering-a-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule) are met. Enabling auto-merge requires [write permissions](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request#enabling-auto-merge) on the repository. When using `pull_request_target`, the `GITHUB_TOKEN` [has read/write access](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions) and satisfies this requirement when configured with `contents: write` and `pull-requests: write`.

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
    if: github.event.pull_request.user.login == 'dependabot[bot]' && github.repository == 'owner/my_repo'
    steps:
      - name: Dependabot metadata
        id: dependabot-metadata
        uses: dependabot/fetch-metadata@v2
      - name: Enable auto-merge for Dependabot PRs
        if: ${{contains(steps.dependabot-metadata.outputs.dependency-names, 'rails') && steps.dependabot-metadata.outputs.update-type == 'version-update:semver-patch'}}
        run: gh pr merge --auto --merge "${{github.event.pull_request.html_url}}"
        env:
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
    if: github.event.pull_request.user.login == 'dependabot[bot]' && github.repository == 'owner/my_repo'
    steps:
      - name: Dependabot metadata
        id: dependabot-metadata
        uses: dependabot/fetch-metadata@v2
      - name: Add a label for all production dependencies
        if: ${{ steps.dependabot-metadata.outputs.dependency-type == 'direct:production' }}
        run: gh pr edit "${{github.event.pull_request.html_url}}" --add-label "production"
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### Use with App Token
First, create a [GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps) and set the appropriate permissions.

For example, to use the features below, the minimum [permissions](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app) required for the GitHub App are as follows:

- `alert-lookup` : `Dependabot alerts: Read only`

Please add any necessary permissions for your job as needed.

The following is an example of using an [installation access token (App Token)](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app) in `github-token`.

```yml
on: pull_request
jobs:
  dependabot:
    runs-on: ubuntu-latest
    if: github.event.pull_request.user.login == 'dependabot[bot]' && github.repository == 'owner/my_repo'
    steps:
      - uses: actions/create-github-app-token@v2
        id: app-token
        with:
          # Store these as repository or organization GitHub Dependabot secrets
          # (e.g. Settings → Secrets and variables → Dependabot → GH_APP_ID, GH_APP_PRIVATE_KEY)
          app-id: ${{ secrets.GH_APP_ID }} # GitHub App ID
          private-key: ${{ secrets.GH_APP_PRIVATE_KEY }} # GitHub App Private key

      - name: Dependabot metadata
        id: dependabot-metadata
        uses: dependabot/fetch-metadata@v2
        with:
          github-token: ${{ steps.app-token.outputs.token }}
          alert-lookup: true
```

## Notes for project maintainers:

<details><summary>:book: Release guide</summary>
<p>

## Dependabot PRs

- We expect Dependabot PRs to be passing CI and have any changes to the `dist/` folder built for production dependencies
- Some development dependencies may fail the `dist/` check if they modify the TypeScript compilation, these should be updated manually via `npm run build`. See the [`dependabot-build`](https://github.com/dependabot/fetch-metadata/blob/main/.github/workflows/dependabot-build.yml) action for details.

## Tagging a new release

  Publish a new release by running the [`Release - Bump Version`](https://github.com/dependabot/fetch-metadata/actions/workflows/release-bump-version.yml) workflow and following the instructions on the job summary.

  In a nutshell the process will be:

  1. Run the action to generate a version bump PR.
  2. Merge the PR.
  3. Tag that merge commit as a new release using the format `v1.2.3`. The job summary contains a URL pre-populated with the correct version for the title and tag.
  4. Once the release is tagged, another GitHub Action workflow automatically publishes the new version of the immutable action package for this release.

</p>
</details>
