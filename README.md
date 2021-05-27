<p align="center">
  <img src="https://s3.eu-west-2.amazonaws.com/dependabot-images/logo-with-name-horizontal.svg?v5" alt="Dependabot" width="336">
</p>

# Dependabot Pull Request Action

**Name:** `dependabot/pull-request-action`
## Usage instructions

Create a workflow file that contains a step that uses: dependabot/pull-request-action@v1`, e.g.

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
      uses: dependabot/pull-request-action
      with:
        github-token: "${{ secrets.GITHUB_TOKEN }}"
```

Subsequent actions will have access to `steps.dependabot-metadata.outputs.updated-dependencies` which will contain a
JSON object with information about the changes, e.g.

```json
[
  {
    "dependencyName": "dependabot-core",
    "dependencyType": "direct:production",
    "updateType": "version-update:semver-major"
  }
]
```

**Note:** This output will only be populated if the target Pull Request was opened by Dependabot and contains **only** Dependabot-created commits.

### Auto-approving

NYI

### Enabling GitHub automerge

NYI

## Why?

NYI

## Development and release process

NYI
