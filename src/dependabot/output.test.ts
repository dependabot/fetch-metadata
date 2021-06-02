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
      updateType: 'version-update:semver-minor'
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
})

test('when given a multiple dependencies, it uses the highest values for types', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'rspec',
      dependencyType: 'direct:development',
      updateType: 'version-update:semver-minor'
    },
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-minor'
    },
    {
      dependencyName: 'coffeescript',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-major'
    },
    {
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
})

test('when the dependency has no update type', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'direct:production',
      updateType: ''
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
})

test('when given a multiple dependencies, and some do not have update types', async () => {
  const updatedDependencies = [
    {
      dependencyName: 'rspec',
      dependencyType: 'direct:development',
      updateType: ''
    },
    {
      dependencyName: 'coffee-rails',
      dependencyType: 'indirect',
      updateType: 'version-update:semver-minor'
    },
    {
      dependencyName: 'coffeescript',
      dependencyType: 'indirect',
      updateType: ''
    },
    {
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
})
