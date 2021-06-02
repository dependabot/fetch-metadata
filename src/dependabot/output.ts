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
  const dependencyNames = updatedDependencies.map(dependency => {
    return dependency.dependencyName
  }).join(', ');
  const dependencyType = maxDependencyTypes(updatedDependencies);
  const updateType = maxSemver(updatedDependencies);

  core.startGroup(`Outputting metadata for ${Pluralize('updated dependency', updatedDependencies.length, true)}`);
  core.info(`outputs.dependency-names: ${dependencyNames}`);
  core.info(`outputs.dependency-type: ${dependencyType}`);
  core.info(`outputs.update-type: ${updateType}`);
  core.endGroup();

  core.setOutput('updated-dependencies-json', updatedDependencies)
  core.setOutput('dependency-names', dependencyNames);
  core.setOutput('dependency-type', dependencyType);
  core.setOutput('update-type', updateType);
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
