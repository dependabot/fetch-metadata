import * as core from '@actions/core'
import { GitHub } from '@actions/github/lib/utils'
import { Context } from '@actions/github/lib/context'
import type { dependencyAlert } from './update_metadata'

const DEPENDABOT_LOGIN = 'dependabot[bot]'

export async function getMessage (client: InstanceType<typeof GitHub>, context: Context): Promise<string | false> {
  core.debug('Verifying the job is for an authentic Dependabot Pull Request')

  const { pull_request: pr } = context.payload

  if (!pr) {
    core.warning(
      "Event payload missing `pull_request` key. Make sure you're " +
        'triggering this action on the `pull_request` or `pull_request_target` events.'
    )
    return false
  }

  // Don't bother hitting the API if the event actor isn't Dependabot
  if (context.actor !== DEPENDABOT_LOGIN) {
    core.debug(`Event actor '${context.actor}' is not Dependabot.`)
    return false
  }

  core.debug('Verifying the Pull Request contents are from Dependabot')

  const { data: commits } = await client.rest.pulls.listCommits({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pr.number
  })

  if (commits.length > 1) {
    warnOtherCommits()
    return false
  }

  const { commit, author } = commits[0]

  if (author?.login !== DEPENDABOT_LOGIN) {
    warnOtherCommits()
    return false
  }

  if (!commit.verification?.verified) {
    // TODO: Promote to setFailed
    core.warning(
      "Dependabot's commit signature is not verified, refusing to proceed."
    )
    return false
  }

  return commit.message
}

function warnOtherCommits (): void {
  core.warning(
    "It looks like this PR has contains commits that aren't part of a Dependabot update. " +
      "Try using '@dependabot rebase' to remove merge commits or '@dependabot recreate' to remove " +
        'any non-Dependabot changes.'
  )
}

export async function getAlert (name: string, version: string, directory: string, client: InstanceType<typeof GitHub>, context: Context): Promise<dependencyAlert> {
  const alerts: any = await client.graphql(`
     {
       repository(owner: "${context.repo.owner}", name: "${context.repo.repo}") { 
         vulnerabilityAlerts(first: 100) {
           nodes {
             vulnerableManifestFilename
             vulnerableManifestPath
             vulnerableRequirements
             state
             securityVulnerability { 
               package { name } 
             }
             securityAdvisory { 
              cvss { score }
              ghsaId 
             }
           }
         }
       }
     }`)

  const nodes = alerts?.repository?.vulnerabilityAlerts?.nodes
  const found = nodes.find(a => (version === '' || a.vulnerableRequirements === `= ${version}`) &&
      trimSlashes(a.vulnerableManifestPath) === `${trimSlashes(directory)}/${a.vulnerableManifestFilename}` &&
      a.securityVulnerability.package.name === name)

  return {
    alertState: found?.state ?? '',
    ghsaId: found?.securityAdvisory.ghsaId ?? '',
    cvss: found?.securityAdvisory.cvss.score ?? 0.0
  }
}

export function trimSlashes (value: string): string {
  return value.replace(/^\/+/, '').replace(/\/+$/, '')
}
