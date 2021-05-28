import Pluralize from 'pluralize';
import * as core from '@actions/core'
import { updatedDependency } from "./update_metadata"

export function set (updatedDependencies: Array<updatedDependency>): void {
  core.info(`Outputting metadata for ${Pluralize( 'updated dependency', updatedDependencies.length, true )}`)

  core.setOutput('updated-dependencies-json', updatedDependencies)

  core.setOutput('dependency-names', updatedDependencies.map(dependency => {
    return dependency.dependencyName
  }).join(", "))
  core.setOutput('dependency-type', updatedDependencies[0].dependencyType)
  core.setOutput('update-type', updatedDependencies[0].updateType)
}
