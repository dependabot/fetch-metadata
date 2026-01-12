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

/**
 * @see https://docs.github.com/en/graphql/reference/objects#repositoryvulnerabilityalert
 */
interface RepositoryVulnerabilityAlert {
  vulnerableManifestFilename: string;
  vulnerableManifestPath: string;
  vulnerableRequirements: string;
  state: "OPEN" | "FIXED" | "DISMISSED";
  securityVulnerability: {
    package: {
      name: string;
    };
  };
  securityAdvisory: {
    cvss: {
      score: number;
    };
    ghsaId: string;
  };
}

interface RepositoryVulnerabilityAlertsResult {
  repository: {
    vulnerabilityAlerts: {
      nodes: RepositoryVulnerabilityAlert[];
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      }
    }
  }
}

export function createFetchVulnerabilityAlertsQuery(repoOwner: string, repoName: string, nResults: number = 100, endCursor?: string): string {
  const first = nResults < 1 || nResults > 100 ? 100 : nResults;
  return `
    {
      repository(owner: "${repoOwner}", name: "${repoName}") {
        vulnerabilityAlerts(first: ${first} ${endCursor ? ', after: "' + endCursor + '"' : ''}) {
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
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }`
}

type FindAlertFunction = (element: RepositoryVulnerabilityAlert) => boolean;

function createFindAlertFunction(name: string, version: string, directory: string): FindAlertFunction {
  return function (repoAlert: RepositoryVulnerabilityAlert) {
    return (
      (version === "" || repoAlert.vulnerableRequirements === `${version}` || repoAlert.vulnerableRequirements === `= ${version}`) &&
      trimSlashes(repoAlert.vulnerableManifestPath) === trimSlashes(`${directory}/${repoAlert.vulnerableManifestFilename}`) &&
      repoAlert.securityVulnerability.package.name === name
    );
  };
}

async function fetchAndFilterVulnerabilityAlerts(
    client: InstanceType<typeof GitHub>,
    repoOwner: string,
    repoName: string,
    fetchDepth: number,
    findFn: FindAlertFunction,
    endCursor?: string
): Promise<RepositoryVulnerabilityAlert | undefined> {
  let fetchedResults = 0;
  while (true) {
    core.debug(`Fetching vulnerability alerts for cursor ${endCursor ?? 'start'}`);
    const query = createFetchVulnerabilityAlertsQuery(repoOwner, repoName, fetchDepth - fetchedResults, endCursor);
    const result: RepositoryVulnerabilityAlertsResult = await client.graphql(query);

    const nodes = result.repository.vulnerabilityAlerts.nodes;
    const found = nodes.find(findFn);

    if (found) {
      return found;
    }
    if (!result.repository.vulnerabilityAlerts.pageInfo.hasNextPage) {
      return undefined;
    }

    fetchedResults += nodes.length;
    if (fetchDepth > 0 && fetchedResults >= fetchDepth) {
      core.warning("Query has more results, but reached number of max results configured via fetch-depth");
      break;
    }

    endCursor = result.repository.vulnerabilityAlerts.pageInfo.endCursor;
  }

  return undefined;
}

export async function getAlert (name: string, version: string, directory: string, client: InstanceType<typeof GitHub>, context: Context, fetchDepth: number): Promise<dependencyAlert> {
  const findFn = createFindAlertFunction(name, version, directory);

  const repoAlert = await fetchAndFilterVulnerabilityAlerts(client, context.repo.owner, context.repo.repo, fetchDepth, findFn);

  if (repoAlert) {
    core.debug(`Found matching vulnerability alert`);
    return {
      alertState: repoAlert?.state ?? '',
      ghsaId: repoAlert?.securityAdvisory.ghsaId  ?? '',
      cvss: repoAlert?.securityAdvisory.cvss.score ?? 0
    }
  }

  core.debug(`Did not find matching vulnerability alert`);
  return {
    alertState: '',
    ghsaId: '',
    cvss: 0,
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
