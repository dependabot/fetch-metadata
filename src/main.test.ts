import * as core from '@actions/core'
import { run } from './main'
import { RequestError } from '@octokit/request-error'
import * as dependabotCommits from './dependabot/verified_commits'
import * as util from './dependabot/util'

beforeEach(() => {
  jest.restoreAllMocks()

  jest.spyOn(core, 'info').mockImplementation(jest.fn())
  jest.spyOn(core, 'setFailed').mockImplementation(jest.fn())
  jest.spyOn(core, 'startGroup').mockImplementation(jest.fn())
})

test('it early exits with an error if github-token is not set', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('')
  jest.spyOn(util, 'getBranchNames').mockReturnValue({ headName: 'dependabot|nuget|feature1', baseName: 'main' })

  await run()

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('github-token is not set!')
  )
  /* eslint-disable no-unused-expressions */
  expect(dependabotCommits.getMessage).not.toHaveBeenCalled
  expect(dependabotCommits.getAlert).not.toHaveBeenCalled
  /* eslint-enable no-unused-expressions */
})

test('it does nothing if the PR is not verified as from Dependabot', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(util, 'getBranchNames').mockReturnValue({ headName: 'dependabot|nuget|feature1', baseName: 'main' })
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.resolve(false)
  ))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('PR is not from Dependabot, nothing to do.')
  )
  /* eslint-disable no-unused-expressions */
  expect(dependabotCommits.getAlert).not.toHaveBeenCalled
  /* eslint-enable no-unused-expressions */
})

test('it does nothing if there is no metadata in the commit', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(util, 'getBranchNames').mockReturnValue({ headName: 'dependabot|nuget|feature1', baseName: 'main' })
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.resolve('Just a commit message, nothing to see here.')
  ))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('PR does not contain metadata, nothing to do.')
  )
  /* eslint-disable no-unused-expressions */
  expect(dependabotCommits.getAlert).not.toHaveBeenCalled
  /* eslint-enable no-unused-expressions */
})

test('it sets the updated dependency as an output for subsequent actions', async () => {
  const mockCommitMessage =
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: coffee-rails\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-minor\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'
  const mockAlert = { alertState: 'FIXED', ghsaId: 'GSHA', cvss: 3.4 }

  jest.spyOn(core, 'getInput').mockImplementation(jest.fn((name) => { return name === 'github-token' ? 'mock-token' : '' }))
  jest.spyOn(util, 'getBranchNames').mockReturnValue({ headName: 'dependabot|nuget|feature1', baseName: 'main' })
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.resolve(mockCommitMessage)
  ))
  jest.spyOn(dependabotCommits, 'getAlert').mockImplementation(jest.fn(
    () => Promise.resolve(mockAlert)
  ))
  jest.spyOn(dependabotCommits, 'getCompatibility').mockImplementation(jest.fn(
    () => Promise.resolve(34)
  ))
  jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())

  await run()

  expect(core.startGroup).toHaveBeenCalledWith(
    expect.stringContaining('Outputting metadata for 1 updated dependency')
  )

  expect(core.setOutput).toHaveBeenCalledWith(
    'updated-dependencies-json',
    [
      {
        dependencyName: 'coffee-rails',
        dependencyType: 'direct:production',
        updateType: 'version-update:semver-minor',
        directory: '/',
        packageEcosystem: 'nuget',
        targetBranch: 'main',
        prevVersion: '4.0.1',
        newVersion: '4.2.2',
        compatScore: 34,
        alertState: '',
        ghsaId: '',
        cvss: 0
      }
    ]
  )

  expect(core.setOutput).toBeCalledWith('dependency-names', 'coffee-rails')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:production')
  expect(core.setOutput).toBeCalledWith('update-type', 'version-update:semver-minor')
  expect(core.setOutput).toBeCalledWith('directory', '/')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', 'nuget')
  expect(core.setOutput).toBeCalledWith('target-branch', 'main')
  expect(core.setOutput).toBeCalledWith('previous-version', '4.0.1')
  expect(core.setOutput).toBeCalledWith('new-version', '4.2.2')
  expect(core.setOutput).toBeCalledWith('compatibility-score', 34)
  expect(core.setOutput).toBeCalledWith('alert-state', '')
  expect(core.setOutput).toBeCalledWith('ghsa-id', '')
  expect(core.setOutput).toBeCalledWith('cvss', 0)
})

test('if there are multiple dependencies, it summarizes them', async () => {
  const mockCommitMessage =
    'Bump coffee-rails from 4.0.1 to 4.2.2 in api/main\n' +
    'Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.\n' +
    '- [Release notes](https://github.com/rails/coffee-rails/releases)\n' +
    '- [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)\n' +
    '- [Commits](rails/coffee-rails@v4.0.1...v4.2.2)\n' +
    '\n' +
    '---\n' +
    'updated-dependencies:\n' +
    '- dependency-name: coffee-rails\n' +
    '  dependency-type: direct:production\n' +
    '  update-type: version-update:semver-minor\n' +
    '- dependency-name: coffeescript\n' +
    '  dependency-type: indirect\n' +
    '  update-type: version-update:semver-major\n' +
    '...\n' +
    '\n' +
    'Signed-off-by: dependabot[bot] <support@github.com>'
  const mockAlert = { alertState: '', ghsaId: '', cvss: 0 }

  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(util, 'getBranchNames').mockReturnValue({ headName: 'dependabot/npm_and_yarn/api/main/feature1', baseName: 'trunk' })
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.resolve(mockCommitMessage)
  ))
  jest.spyOn(dependabotCommits, 'getAlert').mockImplementation(jest.fn(
    () => Promise.resolve(mockAlert)
  ))
  jest.spyOn(dependabotCommits, 'getCompatibility').mockImplementation(jest.fn(
    () => Promise.resolve(34)
  ))
  jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())

  await run()

  expect(core.startGroup).toHaveBeenCalledWith(
    expect.stringContaining('Outputting metadata for 2 updated dependencies')
  )

  expect(core.setOutput).toHaveBeenCalledWith(
    'updated-dependencies-json',
    [
      {
        dependencyName: 'coffee-rails',
        dependencyType: 'direct:production',
        updateType: 'version-update:semver-minor',
        directory: '/api/main',
        packageEcosystem: 'npm_and_yarn',
        targetBranch: 'trunk',
        prevVersion: '4.0.1',
        newVersion: '4.2.2',
        compatScore: 34,
        alertState: '',
        ghsaId: '',
        cvss: 0
      },
      {
        dependencyName: 'coffeescript',
        dependencyType: 'indirect',
        updateType: 'version-update:semver-major',
        directory: '/api/main',
        packageEcosystem: 'npm_and_yarn',
        targetBranch: 'trunk',
        prevVersion: '',
        newVersion: '',
        compatScore: 34,
        alertState: '',
        ghsaId: '',
        cvss: 0
      }
    ]
  )

  expect(core.setOutput).toBeCalledWith('dependency-names', 'coffee-rails, coffeescript')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:production')
  expect(core.setOutput).toBeCalledWith('update-type', 'version-update:semver-major')
  expect(core.setOutput).toBeCalledWith('directory', '/api/main')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', 'npm_and_yarn')
  expect(core.setOutput).toBeCalledWith('target-branch', 'trunk')
  expect(core.setOutput).toBeCalledWith('previous-version', '4.0.1')
  expect(core.setOutput).toBeCalledWith('new-version', '4.2.2')
  expect(core.setOutput).toBeCalledWith('compatibility-score', 34)
  expect(core.setOutput).toBeCalledWith('alert-state', '')
  expect(core.setOutput).toBeCalledWith('ghsa-id', '')
  expect(core.setOutput).toBeCalledWith('cvss', 0)
})

test('it sets the action to failed if there is an unexpected exception', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(util, 'getBranchNames').mockReturnValue({ headName: 'dependabot|nuget|feature1', baseName: 'main' })
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.reject(new Error('Something bad happened!'))
  ))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('Something bad happened!')
  )
  /* eslint-disable no-unused-expressions */
  expect(dependabotCommits.getAlert).not.toHaveBeenCalled
  /* eslint-enable no-unused-expressions */
})

test('it sets the action to failed if there is a request error', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(util, 'getBranchNames').mockReturnValue({ headName: 'dependabot|nuget|feature1', baseName: 'main' })
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.reject(new RequestError('Something bad happened!', 500, {
      headers: {},
      request: {
        method: 'GET',
        url: 'https://api.github.com/repos/dependabot/dependabot/pulls/101/commits',
        headers: {
          authorization: 'foo'
        }
      }
    }))
  ))

  await run()

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('(500) Something bad happened!')
  )
  /* eslint-disable no-unused-expressions */
  expect(dependabotCommits.getAlert).not.toHaveBeenCalled
  /* eslint-enable no-unused-expressions */
})
