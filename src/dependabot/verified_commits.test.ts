import * as github from '@actions/github'
import * as core from '@actions/core'
import nock from 'nock'
import { Context } from '@actions/github/lib/context'
import { getAlert, getMessage, trimSlashes } from './verified_commits'

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

test('it returns the alert state if it matches all 3', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '4.0.1', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: 'DISMISSED', cvss: 4.5, ghsaId: 'FOO' })
})

test('it returns the alert state if it matches 2 and the version is blank', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: 'DISMISSED', cvss: 4.5, ghsaId: 'FOO' })
})

test('it returns default if it does not match the version', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '4.0.2', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })
})

test('it returns default if it does not match the directory', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee-script', '4.0.1', '/', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })
})

test('it returns default if it does not match the name', async () => {
  nock('https://api.github.com').post('/graphql', query)
    .reply(200, response)

  expect(await getAlert('coffee', '4.0.1', '/wwwroot', mockGitHubClient, mockGitHubPullContext())).toEqual({ alertState: '', cvss: 0, ghsaId: '' })
})

test('trimSlashes should only trim slashes from both ends', () => {
  expect(trimSlashes('')).toEqual('')
  expect(trimSlashes('///')).toEqual('')
  expect(trimSlashes('/abc/')).toEqual('abc')
  expect(trimSlashes('/a/b/c/')).toEqual('a/b/c')
  expect(trimSlashes('//a//b//c//')).toEqual('a//b//c')
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
