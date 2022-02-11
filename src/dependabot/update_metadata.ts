import * as YAML from 'yaml'

export interface updatedDependency {
  dependencyName: string,
  dependencyType: string,
  updateType: string,
  directory: string,
  packageEcosystem: string,
  targetBranch: string
}

export function parse (commitMessage: string, branchName: string, mainBranch: string): Array<updatedDependency> {
  const yamlFragment = commitMessage.match(/^-{3}\n(?<dependencies>[\S|\s]*?)\n^\.{3}\n/m)

  if (yamlFragment?.groups && branchName.startsWith('dependabot')) {
    const data = YAML.parse(yamlFragment.groups.dependencies)

    // Since we are on the `dependabot` branch (9 letters), the 10th letter in the branch name is the delimiter
    const delim = branchName[10]
    const chunks = branchName.split(delim)
    const dirname = chunks.slice(2, -1).join(delim) || '/'

    if (data['updated-dependencies']) {
      return data['updated-dependencies'].map(dependency => {
        return {
          dependencyName: dependency['dependency-name'],
          dependencyType: dependency['dependency-type'],
          updateType: dependency['update-type'],
          directory: dirname,
          packageEcosystem: chunks[1],
          targetBranch: mainBranch
        }
      })
    }
  }

  return []
}
