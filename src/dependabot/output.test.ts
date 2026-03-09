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

  expect(core.setOutput).toHaveBeenCalledWith('dependency-names', 'coffee-rails')
  expect(core.setOutput).toHaveBeenCalledWith('dependency-type', 'direct:production')
  expect(core.setOutput).toHaveBeenCalledWith('update-type', 'version-update:semver-minor')
  expect(core.setOutput).toHaveBeenCalledWith('directory', 'wwwroot')
  expect(core.setOutput).toHaveBeenCalledWith('package-ecosystem', 'nuget')
  expect(core.setOutput).toHaveBeenCalledWith('target-branch', 'main')
  expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.0.2')
  expect(core.setOutput).toHaveBeenCalledWith('new-version', '1.1.3-beta')
  expect(core.setOutput).toHaveBeenCalledWith('compatibility-score', 43)
  expect(core.setOutput).toHaveBeenCalledWith('alert-state', 'FIXED')
  expect(core.setOutput).toHaveBeenCalledWith('ghsa-id', 'VERY_LONG_ID')
  expect(core.setOutput).toHaveBeenCalledWith('cvss', 4.6)
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

  expect(core.setOutput).toHaveBeenCalledWith('dependency-names', 'rspec, coffee-rails, coffeescript, rspec-coffeescript')
  expect(core.setOutput).toHaveBeenCalledWith('dependency-type', 'direct:development')
  expect(core.setOutput).toHaveBeenCalledWith('update-type', 'version-update:semver-major')
  expect(core.setOutput).toHaveBeenCalledWith('directory', '')
  expect(core.setOutput).toHaveBeenCalledWith('package-ecosystem', '')
  expect(core.setOutput).toHaveBeenCalledWith('target-branch', '')
  expect(core.setOutput).toHaveBeenCalledWith('previous-version', '')
  expect(core.setOutput).toHaveBeenCalledWith('new-version', '')
  expect(core.setOutput).toHaveBeenCalledWith('compatibility-score', 0)
  expect(core.setOutput).toHaveBeenCalledWith('alert-state', '')
  expect(core.setOutput).toHaveBeenCalledWith('ghsa-id', '')
  expect(core.setOutput).toHaveBeenCalledWith('cvss', 0)
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

  expect(core.setOutput).toHaveBeenCalledWith('dependency-names', 'coffee-rails')
  expect(core.setOutput).toHaveBeenCalledWith('dependency-type', 'direct:production')
  expect(core.setOutput).toHaveBeenCalledWith('update-type', null)
  expect(core.setOutput).toHaveBeenCalledWith('directory', '')
  expect(core.setOutput).toHaveBeenCalledWith('package-ecosystem', '')
  expect(core.setOutput).toHaveBeenCalledWith('target-branch', '')
  expect(core.setOutput).toHaveBeenCalledWith('previous-version', '')
  expect(core.setOutput).toHaveBeenCalledWith('new-version', '')
  expect(core.setOutput).toHaveBeenCalledWith('compatibility-score', 0)
  expect(core.setOutput).toHaveBeenCalledWith('alert-state', '')
  expect(core.setOutput).toHaveBeenCalledWith('ghsa-id', '')
  expect(core.setOutput).toHaveBeenCalledWith('cvss', 0)
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

  expect(core.setOutput).toHaveBeenCalledWith('dependency-names', 'rspec, coffee-rails, coffeescript, rspec-coffeescript')
  expect(core.setOutput).toHaveBeenCalledWith('dependency-type', 'direct:development')
  expect(core.setOutput).toHaveBeenCalledWith('update-type', 'version-update:semver-minor')
  expect(core.setOutput).toHaveBeenCalledWith('directory', '')
  expect(core.setOutput).toHaveBeenCalledWith('package-ecosystem', '')
  expect(core.setOutput).toHaveBeenCalledWith('target-branch', '')
  expect(core.setOutput).toHaveBeenCalledWith('previous-version', '')
  expect(core.setOutput).toHaveBeenCalledWith('new-version', '')
  expect(core.setOutput).toHaveBeenCalledWith('compatibility-score', 0)
  expect(core.setOutput).toHaveBeenCalledWith('alert-state', '')
  expect(core.setOutput).toHaveBeenCalledWith('ghsa-id', '')
  expect(core.setOutput).toHaveBeenCalledWith('cvss', 0)
})
