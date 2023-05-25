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
  }).join(', ')
  const dependencyType = maxDependencyTypes(updatedDependencies)
  const updateType = maxSemver(updatedDependencies)

  const firstDependency = updatedDependencies[0]
  const directory = firstDependency?.directory
  const ecosystem = firstDependency?.packageEcosystem
  const target = firstDependency?.targetBranch
  const prevVersion = firstDependency?.prevVersion
  const newVersion = firstDependency?.newVersion
  const compatScore = firstDependency?.compatScore
  const maintainerChanges = firstDependency?.maintainerChanges
  const alertState = firstDependency?.alertState
  const alertSeverity = firstDependency?.alertSeverity
  const ghsaId = firstDependency?.ghsaId
  const cvss = firstDependency?.cvss
  const cwes = firstDependency?.cwes
  const alertDescription = firstDependency?.alertDescription
  const alertIdentifiers = firstDependency?.alertIdentifiers
  const alertSummary = firstDependency?.alertSummary

  core.startGroup(`Outputting metadata for ${Pluralize('updated dependency', updatedDependencies.length, true)}`)
  core.info(`outputs.dependency-names: ${dependencyNames}`)
  core.info(`outputs.dependency-type: ${dependencyType}`)
  core.info(`outputs.update-type: ${updateType}`)
  core.info(`outputs.directory: ${directory}`)
  core.info(`outputs.package-ecosystem: ${ecosystem}`)
  core.info(`outputs.target-branch: ${target}`)
  core.info(`outputs.previous-version: ${prevVersion}`)
  core.info(`outputs.new-version: ${newVersion}`)
  core.info(`outputs.compatibility-score: ${compatScore}`)
  core.info(`outputs.maintainer-changes: ${maintainerChanges}`)
  core.info(`outputs.alert-state: ${alertState}`)
  core.info(`outputs.alert-severity: ${alertSeverity}`)
  core.info(`outputs.ghsa-id: ${ghsaId}`)
  core.info(`outputs.cvss: ${cvss}`)
  core.info(`outputs.cwes: ${cwes}`)
  core.info(`outputs.alert-description: ${alertDescription}`)
  core.info(`outputs.alert-identifiers: ${alertIdentifiers}`)
  core.info(`outputs.alert-summary: ${alertSummary}`)
  core.endGroup()

  core.setOutput('updated-dependencies-json', updatedDependencies)
  core.setOutput('dependency-names', dependencyNames)
  core.setOutput('dependency-type', dependencyType)
  core.setOutput('update-type', updateType)
  core.setOutput('directory', directory)
  core.setOutput('package-ecosystem', ecosystem)
  core.setOutput('target-branch', target)
  core.setOutput('previous-version', prevVersion)
  core.setOutput('new-version', newVersion)
  core.setOutput('compatibility-score', compatScore)
  core.setOutput('maintainer-changes', maintainerChanges)
  core.setOutput('alert-state', alertState)
  core.setOutput('alert-severity', alertSeverity)
  core.setOutput('ghsa-id', ghsaId)
  core.setOutput('cvss', cvss)
  core.setOutput('cwes', cwes)
  core.setOutput('alert-description', alertDescription)
  core.setOutput('alert-identifiers', alertIdentifiers)
  core.setOutput('alert-summary', alertSummary)
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
