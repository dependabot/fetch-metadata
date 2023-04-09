import * as github from '@actions/github'
import * as core from '@actions/core'
import nock from 'nock'
import { Context } from '@actions/github/lib/context'
import { getAlert, getMessage, trimSlashes, getCompatibility } from './verified_commits'

beforeAll(() => {
  nock.disableNetConnect()
})

beforeEach(() => {
  jest.restoreAllMocks()

  jest.spyOn(core, 'debug').mockImplementation(jest.fn())
  jest.spyOn(core, 'warning').mockImplementation(jest.fn())

  process.env.GITHUB_REPOSITORY = 'dependabot/dependabot'
})

test('it returns false if the action is not invoked on a PullRequest', async () => {
  expect(await getMessage(mockGitHubClient, mockGitHubOtherContext())).toBe(false)

  expect(core.warning).toHaveBeenCalledWith(
    expect.stringContaining('Event payload missing `pull_request` key.')
  )
})

test('it returns false for an event triggered by someone other than Dependabot', async () => {
  expect(await getMessage(mockGitHubClient, mockGitHubPullContext('jane-doe'))).toBe(false)

  expect(core.debug).toHaveBeenCalledWith(
    expect.stringContaining("PR author 'jane-doe' is not Dependabot.")
  )
})

test('it returns false if the commit was authored by someone other than Dependabot', async () => {
  nock('https://api.github.com').get('/repos/dependabot/dependabot/pulls/101/commits')
    .reply(200, [
      {
        author: {
          login: 'dependanot'
        },
        commit: {
          message: 'Bump lodash from 1.0.0 to 2.0.0'
        }
      }
    ])

  expect(await getMessage(mockGitHubClient, mockGitHubPullContext())).toBe(false)

  expect(core.warning).toHaveBeenCalledWith(
    expect.stringContaining('It looks like this PR was not created by Dependabot, refusing to proceed.')
  )
})

test('it returns false if the commit is has no verification payload', async () => {
  nock('https://api.github.com').get('/repos/dependabot/dependabot/pulls/101/commits')
    .reply(200, [
      {
        author: {
          login: 'dependabot[bot]'
        },
        commit: {
          message: 'Bump lodash from 1.0.0 to 2.0.0',
          verification: null
        }
      }
    ])

  expect(await getMessage(mockGitHubClient, mockGitHubPullContext())).toBe(false)
})

test('it returns the message if the commit is has no verification payload but verification is skipped', async () => {
  nock('https://api.github.com').get('/repos/dependabot/dependabot/pulls/101/commits')
    .reply(200, [
      {
        author: {
          login: 'dependabot[bot]'
        },
        commit: {
          message: 'Bump lodash from 1.0.0 to 2.0.0',
          verification: null
        }
      }
    ])

  expect(await getMessage(mockGitHubClient, mockGitHubPullContext(), true)).toEqual('Bump lodash from 1.0.0 to 2.0.0')
})

test('it returns the message when skip-verification is enabled', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('true')

  nock('https://api.github.com').get('/repos/dependabot/dependabot/pulls/101/commits')
    .reply(200, [
      {
        author: {
          login: 'myUser'
        },
        commit: {
          message: 'Bump lodash from 1.0.0 to 2.0.0',
          verification: false
        }
      }
    ])

  expect(await getMessage(mockGitHubClient, mockGitHubPullContext(), false, true)).toEqual('Bump lodash from 1.0.0 to 2.0.0')
})

test('it returns false if the commit is not verified', async () => {
  nock('https://api.github.com').get('/repos/dependabot/dependabot/pulls/101/commits')
    .reply(200, [
      {
        author: {
          login: 'dependabot[bot]'
        },
        commit: {
          message: 'Bump lodash from 1.0.0 to 2.0.0',
          verification: {
            verified: false
          }
        }
      }
    ])

  expect(await getMessage(mockGitHubClient, mockGitHubPullContext())).toBe(false)
})

test('it returns the commit message for a PR authored exclusively by Dependabot with verified commits', async () => {
  nock('https://api.github.com').get('/repos/dependabot/dependabot/pulls/101/commits')
    .reply(200, [
      {
        author: {
          login: 'dependabot[bot]'
        },
        commit: {
          message: 'Bump lodash from 1.0.0 to 2.0.0',
          verification: {
            verified: true
          }
        }
      },
      {
        commit: {
          message: 'Add some more things.'
        }
      }
    ])

  expect(await getMessage(mockGitHubClient, mockGitHubPullContext())).toEqual('Bump lodash from 1.0.0 to 2.0.0')
})

const query = '{"query":"\\n     {\\n       repository(owner: \\"dependabot\\", name: \\"dependabot\\") { \\n         vulnerabilityAlerts(first: 100) {\\n           nodes {\\n             vulnerableManifestFilename\\n             vulnerableManifestPath\\n             vulnerableRequirements\\n             state\\n             securityVulnerability { \\n               package { name } \\n             }\\n             securityAdvisory { \\n              cvss { score }\\n              ghsaId \\n             }\\n           }\\n         }\\n       }\\n     }"}'

const response = {
  data: {
    repository: {
      vulnerabilityAlerts: {
        nodes: [
          {
            vulnerableManifestFilename: 'package.json',
            vulnerableManifestPath: 'wwwroot/package.json',
            vulnerableRequirements: '= 4.0.1',
            state: 'DISMISSED',
            securityVulnerability: { package: { name: 'coffee-script' } },
            securityAdvisory: { cvss: { score: 4.5 }, ghsaId: 'FOO' }
          }
        ]
      }
    }
  }
}

const responseWithManifestFileAtRoot = {
  data: {
    repository: {
      vulnerabilityAlerts: {
        nodes: [
          {
            vulnerableManifestFilename: 'package.json',
            vulnerableManifestPath: 'package.json',
            vulnerableRequirements: '= 4.0.1',
            state: 'DISMISSED',
            securityVulnerability: { package: { name: 'coffee-script' } },
            securityAdvisory: { cvss: { score: 4.5 }, ghsaId: 'FOO' }
          }
        ]
      }
    }
  }
}

test('it returns the alert state if it matches all 3', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '4.0.1', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: 'DISMISSED', cvss: 4.5, ghsaId: 'FOO' })

  nock('https://api.github.com').post('/graphql', query)
    .reply(200, responseWithManifestFileAtRoot)

  expect(await getAlert('coffee-script', '4.0.1', '/', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: 'DISMISSED', cvss: 4.5, ghsaId: 'FOO' })
})

test('it returns the alert state if it matches 2 and the version is blank', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: 'DISMISSED', cvss: 4.5, ghsaId: 'FOO' })

  nock('https://api.github.com').post('/graphql', query)
    .reply(200, responseWithManifestFileAtRoot)

  expect(await getAlert('coffee-script', '', '/', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: 'DISMISSED', cvss: 4.5, ghsaId: 'FOO' })
})

test('it returns default if it does not match the version', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '4.0.2', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })

  nock('https://api.github.com').post('/graphql', query)
    .reply(200, responseWithManifestFileAtRoot)

  expect(await getAlert('coffee-script', '4.0.2', '/', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })
})

test('it returns default if it does not match the directory', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '4.0.1', '/', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })

  nock('https://api.github.com').post('/graphql', query)
    .reply(200, responseWithManifestFileAtRoot)

  expect(await getAlert('coffee-script', '4.0.1', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })
})

test('it returns default if it does not match the name', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee', '4.0.1', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })

  nock('https://api.github.com').post('/graphql', query)
    .reply(200, responseWithManifestFileAtRoot)

  expect(await getAlert('coffee', '4.0.1', '/', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })
})

test('trimSlashes should only trim slashes from both ends', () => {
  expect(trimSlashes('')).toEqual('')
  expect(trimSlashes('///')).toEqual('')
  expect(trimSlashes('/abc/')).toEqual('abc')
  expect(trimSlashes('/a/b/c/')).toEqual('a/b/c')
  expect(trimSlashes('//a//b//c//')).toEqual('a//b//c')
})

const svgContents = `<svg width="132.9" height="20" viewBox="0 0 1329 200" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" role="img" aria-label="compatibility: 75%">
  <title>compatibility: 75%</title>
  <linearGradient id="a" x2="0" y2="100%">
    <stop offset="0" stop-opacity=".1" stop-color="#EEE"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="m"><rect width="1329" height="200" rx="30" fill="#FFF"/></mask>
  <g mask="url(#m)">
    <rect width="969" height="200" fill="#555"/>
    <rect width="360" height="200" fill="#3C1" x="969"/>
    <rect width="1329" height="200" fill="url(#a)"/>
  </g>
  <g aria-hidden="true" fill="#fff" text-anchor="start" font-family="Verdana,DejaVu Sans,sans-serif" font-size="110">
    <text x="220" y="148" textLength="709" fill="#000" opacity="0.25">compatibility</text>
    <text x="210" y="138" textLength="709">compatibility</text>
    <text x="1024" y="148" textLength="260" fill="#000" opacity="0.25">75%</text>
    <text x="1014" y="138" textLength="260">75%</text>
  </g>
  <image x="40" y="35" width="130" height="130" xlink:href="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiB2aWV3Qm94PSIwIDAgNTQgNTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMzAgMTV2LTNoLTVhMSAxIDAgMDEtMS0xVjRhMSAxIDAgMDExLTFoN2ExIDEgMCAwMTEgMXYxMWgxNWEzIDMgMCAwMTMgM3YxMmgyYTEgMSAwIDAxMSAxdjEwYTEgMSAwIDAxLTEgMWgtMnY2YTMgMyAwIDAxLTMgM0g2YTMgMyAwIDAxLTMtM3YtNkgxYTEgMSAwIDAxLTEtMVYzMWExIDEgMCAwMTEtMWgyVjE4YTMgMyAwIDAxMy0zem02Ljg1NCAyMy42NDNsNi4yOS02LjI4OWExLjIxIDEuMjEgMCAwMDAtMS43MWwtMS4yOS0xLjI5YTEuMjEgMS4yMSAwIDAwLTEuNzEgMEwzNS45OTggMzMuNWwtMS42NDUtMS42NDVhMS4yMSAxLjIxIDAgMDAtMS43MSAwbC0xLjI5IDEuMjlhMS4yMSAxLjIxIDAgMDAwIDEuNzFsMy43OSAzLjc5YTEuMjEgMS4yMSAwIDAwMS43MSAwem0tMTMuNzEtNi4yODlsLTYuMjkgNi4yOWExLjIxIDEuMjEgMCAwMS0xLjcxIDBsLTMuNzktMy43OWExLjIxIDEuMjEgMCAwMTAtMS43MWwxLjI5LTEuMjlhMS4yMSAxLjIxIDAgMDExLjcxIDBMMTYgMzMuNWw0LjE0NC00LjE0NWExLjIxIDEuMjEgMCAwMTEuNzExIDBsMS4yOSAxLjI5YTEuMjEgMS4yMSAwIDAxMCAxLjcxeiIgZmlsbD0iI2ZmZiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+Cg=="/>
</svg>`

test('getCompatibility pulls out the score', async () => {
  nock('https://dependabot-badges.githubapp.com').get('/badges/compatibility_score?dependency-name=coffee-script&package-manager=npm_and_yarn&previous-version=2.1.3&new-version=2.2.0')
    .reply(200, svgContents)

  expect(await getCompatibility('coffee-script', '2.1.3', '2.2.0', 'npm_and_yarn')).toEqual(75)
})

test('getCompatibility fails gracefully', async () => {
  nock('https://dependabot-badges.githubapp.com').get('/badges/compatibility_score?dependency-name=coffee-script&package-manager=npm_and_yarn&previous-version=2.1.3&new-version=2.2.0')
    .reply(200, '')

  expect(await getCompatibility('coffee-script', '2.1.3', '2.2.0', 'npm_and_yarn')).toEqual(0)
})

test('getCompatibility handles errors', async () => {
  nock('https://dependabot-badges.githubapp.com').get('/badges/compatibility_score?dependency-name=coffee-script&package-manager=npm_and_yarn&previous-version=2.1.3&new-version=2.2.0')
    .reply(500, '')

  expect(await getCompatibility('coffee-script', '2.1.3', '2.2.0', 'npm_and_yarn')).toEqual(0)
})

const mockGitHubClient = github.getOctokit('mock-token')

function mockGitHubOtherContext (): Context {
  const ctx = new Context()
  ctx.payload = {
    issue: {
      number: 100
    }
  }
  return ctx
}

function mockGitHubPullContext (author = 'dependabot[bot]'): Context {
  const ctx = new Context()
  ctx.payload = {
    pull_request: {
      number: 101,
      user: {
        login: author
      }
    },
    repository: {
      name: 'dependabot',
      owner: {
        login: 'dependabot'
      }
    }
  }
  return ctx
}
