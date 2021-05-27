import * as core from '@actions/core'
import { run } from './main'
import * as dependabotCommits from './dependabot/verified_commits'

beforeEach(() => {
  jest.restoreAllMocks()

  jest.spyOn(core, 'setFailed').mockImplementation(jest.fn())
  jest.spyOn(core, 'info').mockImplementation(jest.fn())
})

test('it early exits with an error if github-token is not set', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('')

  await run()

  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining('github-token is not set!')
  )
  /* eslint-disable no-unused-expressions */
  expect(dependabotCommits.getMessage).not.toHaveBeenCalled
  /* eslint-enable no-unused-expressions */
})

test('it does nothing if the PR is not verified as from Dependabot', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.resolve(false)
  ))

  await run()

  expect(core.info).toHaveBeenCalledWith(
    expect.stringContaining('PR is not from Dependabot, nothing to do.')
  )
})

test('it does nothing if there is no metadata in the commit', async () => {
  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.resolve('Just a commit message, nothing to see here.')
  ))

  await run()

  expect(core.info).toHaveBeenCalledWith(
    expect.stringContaining('PR does not contain metadata, nothing to do.')
  )
})

test('it sets the updated dependencies as an output for subsequent actions', async () => {
  const mockCommitMessage = `Bumps [coffee-rails](https://github.com/rails/coffee-rails) from 4.0.1 to 4.2.2.
  - [Release notes](https://github.com/rails/coffee-rails/releases)
  - [Changelog](https://github.com/rails/coffee-rails/blob/master/CHANGELOG.md)
  - [Commits](rails/coffee-rails@v4.0.1...v4.2.2)

  ---
  updated-dependencies:
  - dependency-name: coffee-rails
    dependency-type: direct:production
    update-type: version-update:semver-minor
  ...

  Signed-off-by: dependabot[bot] <support@github.com>`

  jest.spyOn(core, 'getInput').mockReturnValue('mock-token')
  jest.spyOn(dependabotCommits, 'getMessage').mockImplementation(jest.fn(
    () => Promise.resolve(mockCommitMessage)
  ))
  jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())

  await run()

  expect(core.info).toHaveBeenCalledWith(
    expect.stringContaining('Outputting metadata')
  )
  expect(core.setOutput).toHaveBeenCalledWith(
    'updated-dependencies',
    [
      {
        name: 'coffee-rails',
        type: 'direct:production',
        updateType: 'version-update:semver-minor'
      }
    ]
  )
})
