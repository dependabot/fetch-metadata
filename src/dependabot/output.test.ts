import * as core from '@actions/core'
import * as Output from './output'

beforeEach(() => {
  jest.restoreAllMocks()

  jest.spyOn(core, 'info').mockImplementation(jest.fn())
  jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())
  jest.spyOn(core, 'startGroup').mockImplementation(jest.fn())
})

test('when given a single dependency it sets its values', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'direct:production',
      updateType: 'version-update:semver-minor',
      directory: 'wwwroot',
      packageEcosystem: 'nuget',
      targetBranch: 'main'
    }
  ]

  Output.set(updatedDependencies)

  expect(core.startGroup).toHaveBeenCalledWith(
    expect.stringContaining('Outputting metadata for 1 updated dependency')
  )

  expect(core.setOutput).toHaveBeenCalledWith('updated-dependencies-json', updatedDependencies)

  expect(core.setOutput).toBeCalledWith('dependency-names', 'coffee-rails')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:production')
  expect(core.setOutput).toBeCalledWith('update-type', 'version-update:semver-minor')
  expect(core.setOutput).toBeCalledWith('directory', 'wwwroot')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', 'nuget')
  expect(core.setOutput).toBeCalledWith('target_branch', 'main')
})

test('when given a multiple dependencies, it uses the highest values for types', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'rspec',
      dependencyType: 'direct:development',
      updateType: 'version-update:semver-minor',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    },
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-minor',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    },
    {
      dependencyName: 'coffeescript',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-major',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    },
    {
      dependencyName: 'rspec-coffeescript',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-patch',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    }
  ]

  Output.set(updatedDependencies)

  expect(core.setOutput).toHaveBeenCalledWith('updated-dependencies-json', updatedDependencies)

  expect(core.setOutput).toBeCalledWith('dependency-names', 'rspec, coffee-rails, coffeescript, rspec-coffeescript')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:development')
  expect(core.setOutput).toBeCalledWith('update-type', 'version-update:semver-major')
  expect(core.setOutput).toBeCalledWith('directory', '')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', '')
  expect(core.setOutput).toBeCalledWith('target_branch', '')
})

test('when the dependency has no update type', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'direct:production',
      updateType: '',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    }
  ]

  Output.set(updatedDependencies)

  expect(core.startGroup).toHaveBeenCalledWith(
    expect.stringContaining('Outputting metadata for 1 updated dependency')
  )

  expect(core.setOutput).toHaveBeenCalledWith('updated-dependencies-json', updatedDependencies)

  expect(core.setOutput).toBeCalledWith('dependency-names', 'coffee-rails')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:production')
  expect(core.setOutput).toBeCalledWith('update-type', null)
  expect(core.setOutput).toBeCalledWith('directory', '')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', '')
  expect(core.setOutput).toBeCalledWith('target_branch', '')
})

test('when given a multiple dependencies, and some do not have update types', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'rspec',
      dependencyType: 'direct:development',
      updateType: '',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    },
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-minor',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    },
    {
      dependencyName: 'coffeescript',
      dependencyType: 'indirect',
      updateType: '',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    },
    {
      dependencyName: 'rspec-coffeescript',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-patch',
      directory: '',
      packageEcosystem: '',
      targetBranch: ''
    }
  ]

  Output.set(updatedDependencies)

  expect(core.setOutput).toHaveBeenCalledWith('updated-dependencies-json', updatedDependencies)

  expect(core.setOutput).toBeCalledWith('dependency-names', 'rspec, coffee-rails, coffeescript, rspec-coffeescript')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:development')
  expect(core.setOutput).toBeCalledWith('update-type', 'version-update:semver-minor')
  expect(core.setOutput).toBeCalledWith('directory', '')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', '')
  expect(core.setOutput).toBeCalledWith('target_branch', '')
})
