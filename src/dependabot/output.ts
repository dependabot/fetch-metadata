import Pluralize from 'pluralize'
import * as core from '@actions/core'
import { updatedDependency } from './update_metadata'

const DEPENDENCY_TYPES_PRIORITY = [
  'direct:production',
  'direct:development',
  'indirect'
]
const UPDATE_TYPES_PRIORITY = [
  'version-update:semver-major',
  'version-update:semver-minor',
  'version-update:semver-patch'
]

export function set (updatedDependencies: Array<updatedDependency>): void {
  core.info(`Outputting metadata for ${Pluralize('updated dependency', updatedDependencies.length, true)}`)

  core.setOutput('updated-dependencies-json', updatedDependencies)

  core.setOutput('dependency-names', updatedDependencies.map(dependency => {
    return dependency.dependencyName
  }).join(', '))
  core.setOutput('dependency-type', maxDependencyTypes(updatedDependencies))
  core.setOutput('update-type', maxSemver(updatedDependencies))
}

function maxDependencyTypes (updatedDependencies: Array<updatedDependency>): string {
  const dependencyTypes = updatedDependencies.reduce(function (dependencyTypes, dependency) {
    dependencyTypes.add(dependency.dependencyType)
    return dependencyTypes
  }, new Set())

  return DEPENDENCY_TYPES_PRIORITY.find(dependencyType => dependencyTypes.has(dependencyType)) || 'unknown'
}

function maxSemver (updatedDependencies: Array<updatedDependency>): string | null {
  const semverLevels = updatedDependencies.reduce(function (semverLevels, dependency) {
    semverLevels.add(dependency.updateType)
    return semverLevels
  }, new Set())

  return UPDATE_TYPES_PRIORITY.find(semverLevel => semverLevels.has(semverLevel)) || null
}
