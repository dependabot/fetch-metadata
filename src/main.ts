import * as core from '@actions/core'
import * as github from '@actions/github'
import * as verifiedCommits from './dependabot/verified_commits'
import * as updateMetadata from './dependabot/update_metadata'

export async function run (): Promise<void> {
  const token = core.getInput('github-token')

  if (!token) {
    /* eslint-disable no-template-curly-in-string */
    core.setFailed(
      'github-token is not set! Please add \'github-token: "${{ secrets.GITHUB_TOKEN }}"\' to your workflow file.'
    )
    /* eslint-enable no-template-curly-in-string */
    return
  }

  const githubClient = github.getOctokit(token)

  // Validate the job
  const commitMessage = await verifiedCommits.getMessage(githubClient, github.context)

  if (commitMessage) {
    // Parse metadata
    core.info('Parsing Dependabot metadata/')

    const updatedDependencies = updateMetadata.parse(commitMessage)

    if (updatedDependencies.length > 0) {
      core.info(`Outputting metadata for the update to '${updatedDependencies[0].dependencyName}'.`)

      core.setOutput('dependency-name', updatedDependencies[0].dependencyName)
      core.setOutput('dependency-type', updatedDependencies[0].dependencyType)
      core.setOutput('update-type', updatedDependencies[0].updateType)
    } else {
      core.info('PR does not contain metadata, nothing to do.')
    }
  } else {
    core.info('PR is not from Dependabot, nothing to do.')
  }
}

run()
