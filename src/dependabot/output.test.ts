import * as core from '@actions/core'
import * as Output from './output'

beforeEach(() => {
  jest.restoreAllMocks()

  jest.spyOn(core, 'info').mockImplementation(jest.fn())
  jest.spyOn(core, 'setOutput').mockImplementation(jest.fn())
  jest.spyOn(core, 'startGroup').mockImplementation(jest.fn())
})

const baseDependency = {
  dependencyName: '',
  dependencyType: '',
  updateType: '',
  directory: '',
  packageEcosystem: '',
  targetBranch: '',
  prevVersion: '',
  newVersion: '',
  compatScore: 0,
  maintainerChanges: false,
  dependencyGroup: '',
  alertState: '',
  ghsaId: '',
  cvss: 0
}

test('when given a single dependency it sets its values', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'direct:production',
      updateType: 'version-update:semver-minor',
      directory: 'wwwroot',
      packageEcosystem: 'nuget',
      targetBranch: 'main',
      prevVersion: '1.0.2',
      newVersion: '1.1.3-beta',
      compatScore: 43,
      maintainerChanges: true,
      dependencyGroup: '',
      alertState: 'FIXED',
      ghsaId: 'VERY_LONG_ID',
      cvss: 4.6
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
  expect(core.setOutput).toBeCalledWith('target-branch', 'main')
  expect(core.setOutput).toBeCalledWith('previous-version', '1.0.2')
  expect(core.setOutput).toBeCalledWith('new-version', '1.1.3-beta')
  expect(core.setOutput).toBeCalledWith('compatibility-score', 43)
  expect(core.setOutput).toBeCalledWith('alert-state', 'FIXED')
  expect(core.setOutput).toBeCalledWith('ghsa-id', 'VERY_LONG_ID')
  expect(core.setOutput).toBeCalledWith('cvss', 4.6)
})

test('when given a multiple dependencies, it uses the highest values for types', async () => {
  const updatedDependencies = [
    {
      ...baseDependency,
      dependencyName: 'rspec',
      dependencyType: 'direct:development',
      updateType: 'version-update:semver-minor'
    },
    {
      ...baseDependency,
      dependencyName: 'coffee-rails',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-minor'
    },
    {
      ...baseDependency,
      dependencyName: 'coffeescript',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-major'
    },
    {
      ...baseDependency,
      dependencyName: 'rspec-coffeescript',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-patch'
    }
  ]

  Output.set(updatedDependencies)

  expect(core.setOutput).toHaveBeenCalledWith('updated-dependencies-json', updatedDependencies)

  expect(core.setOutput).toBeCalledWith('dependency-names', 'rspec, coffee-rails, coffeescript, rspec-coffeescript')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:development')
  expect(core.setOutput).toBeCalledWith('update-type', 'version-update:semver-major')
  expect(core.setOutput).toBeCalledWith('directory', '')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', '')
  expect(core.setOutput).toBeCalledWith('target-branch', '')
  expect(core.setOutput).toBeCalledWith('previous-version', '')
  expect(core.setOutput).toBeCalledWith('new-version', '')
  expect(core.setOutput).toBeCalledWith('compatibility-score', 0)
  expect(core.setOutput).toBeCalledWith('alert-state', '')
  expect(core.setOutput).toBeCalledWith('ghsa-id', '')
  expect(core.setOutput).toBeCalledWith('cvss', 0)
})

test('when the dependency has no update type', async () => {
  const updatedDependencies = [
    {
      ...baseDependency,
      dependencyName: 'coffee-rails',
      dependencyType: 'direct:production'
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
  expect(core.setOutput).toBeCalledWith('target-branch', '')
  expect(core.setOutput).toBeCalledWith('previous-version', '')
  expect(core.setOutput).toBeCalledWith('new-version', '')
  expect(core.setOutput).toBeCalledWith('compatibility-score', 0)
  expect(core.setOutput).toBeCalledWith('alert-state', '')
  expect(core.setOutput).toBeCalledWith('ghsa-id', '')
  expect(core.setOutput).toBeCalledWith('cvss', 0)
})

test('when given a multiple dependencies, and some do not have update types', async () => {
  const updatedDependencies = [
    {
      ...baseDependency,
      dependencyName: 'rspec',
      dependencyType: 'direct:development'
    },
    {
      ...baseDependency,
      dependencyName: 'coffee-rails',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-minor'
    },
    {
      ...baseDependency,
      dependencyName: 'coffeescript',
      dependencyType: 'indirect'
    },
    {
      ...baseDependency,
      dependencyName: 'rspec-coffeescript',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-patch'
    }
  ]

  Output.set(updatedDependencies)

  expect(core.setOutput).toHaveBeenCalledWith('updated-dependencies-json', updatedDependencies)

  expect(core.setOutput).toBeCalledWith('dependency-names', 'rspec, coffee-rails, coffeescript, rspec-coffeescript')
  expect(core.setOutput).toBeCalledWith('dependency-type', 'direct:development')
  expect(core.setOutput).toBeCalledWith('update-type', 'version-update:semver-minor')
  expect(core.setOutput).toBeCalledWith('directory', '')
  expect(core.setOutput).toBeCalledWith('package-ecosystem', '')
  expect(core.setOutput).toBeCalledWith('target-branch', '')
  expect(core.setOutput).toBeCalledWith('previous-version', '')
  expect(core.setOutput).toBeCalledWith('new-version', '')
  expect(core.setOutput).toBeCalledWith('compatibility-score', 0)
  expect(core.setOutput).toBeCalledWith('alert-state', '')
  expect(core.setOutput).toBeCalledWith('ghsa-id', '')
  expect(core.setOutput).toBeCalledWith('cvss', 0)
})
