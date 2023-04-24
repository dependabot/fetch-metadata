import * as core from '@actions/core'
import * as github from '@actions/github'
import { RequestError } from '@octokit/request-error'
import * as verifiedCommits from './dependabot/verified_commits'
import * as updateMetadata from './dependabot/update_metadata'
import * as output from './dependabot/output'
import * as util from './dependabot/util'

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

  try {
    const githubClient = github.getOctokit(token)

    // Validate the job
    const commitMessage = await verifiedCommits.getMessage(githubClient, github.context, core.getBooleanInput('skip-commit-verification'), core.getBooleanInput('skip-verification'))
    const branchNames = util.getBranchNames(github.context)
    const body = util.getBody(github.context)
    let alertLookup: updateMetadata.alertLookup | undefined
    if (core.getInput('alert-lookup')) {
      alertLookup = (name, version, directory) => verifiedCommits.getAlert(name, version, directory, githubClient, github.context)
    }
    const scoreLookup = core.getInput('compat-lookup') ? verifiedCommits.getCompatibility : undefined

    if (commitMessage) {
      // Parse metadata
      core.info('Parsing Dependabot metadata')

      const updatedDependencies = await updateMetadata.parse(commitMessage, body, branchNames.headName, branchNames.baseName, alertLookup, scoreLookup)

      if (updatedDependencies.length > 0) {
        output.set(updatedDependencies)
      } else {
        core.setFailed('PR does not contain metadata, nothing to do.')
      }
    } else {
      core.setFailed('PR is not from Dependabot, nothing to do.')
    }
  } catch (error) {
    if (error instanceof RequestError) {
      core.setFailed(`Api Error: (${error.status}) ${error.message}`)
      return
    }
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('There was an unexpected error.')
    }
  }
}

run()
