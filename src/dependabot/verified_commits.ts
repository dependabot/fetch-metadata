import * as core from '@actions/core'
import { GitHub } from '@actions/github/lib/utils'
import { Context } from '@actions/github/lib/context'
import type { dependencyAlert } from './update_metadata'
import https from 'https'

const DEPENDABOT_LOGIN = 'dependabot[bot]'

export async function getMessage (client: InstanceType<typeof GitHub>, context: Context, skipCommitVerification = false, skipVerification = false): Promise<string | false> {
  if (skipVerification) {
    core.debug('Skipping pull request verification')
  } else {
    core.debug('Verifying the job is for an authentic Dependabot Pull Request')
  }

  const { pull_request: pr } = context.payload

  if (!pr) {
    core.warning(
      "Event payload missing `pull_request` key. Make sure you're " +
        'triggering this action on the `pull_request` or `pull_request_target` events.'
    )
    return false
  }

  // Don't bother hitting the API if the PR author isn't Dependabot unless verification is disabled
  if (!skipVerification && pr.user.login !== DEPENDABOT_LOGIN) {
    core.debug(`PR author '${pr.user.login}' is not Dependabot.`)
    return false
  }

  const { data: commits } = await client.rest.pulls.listCommits({
    owner: context.repo.owner,
    repo: context.repo.repo,
    pull_number: pr.number
  })

  const { commit, author } = commits[0]

  if (!skipVerification && author?.login !== DEPENDABOT_LOGIN) {
    // TODO: Promote to setFailed
    core.warning(
      'It looks like this PR was not created by Dependabot, refusing to proceed.'
    )
    return false
  }

  if (!skipVerification && !skipCommitVerification && !commit.verification?.verified) {
    // TODO: Promote to setFailed
    core.warning(
      "Dependabot's commit signature is not verified, refusing to proceed."
    )
    return false
  }

  return commit.message
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
      trimSlashes(a.vulnerableManifestPath) === trimSlashes(`${directory}/${a.vulnerableManifestFilename}`) &&
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

export async function getCompatibility (name: string, oldVersion: string, newVersion: string, ecosystem: string): Promise<number> {
  const svg = await new Promise<string>((resolve) => {
    https.get(`https://dependabot-badges.githubapp.com/badges/compatibility_score?dependency-name=${name}&package-manager=${ecosystem}&previous-version=${oldVersion}&new-version=${newVersion}`, res => {
      let data = ''
      res.on('data', chunk => { data += chunk.toString('utf8') })
      res.on('end', () => { resolve(data) })
    }).on('error', () => { resolve('') })
  })

  const scoreChunk = svg.match(/<title>compatibility: (?<score>\d+)%<\/title>/m)
  return scoreChunk?.groups ? parseInt(scoreChunk.groups.score) : 0
}
