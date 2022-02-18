import * as YAML from 'yaml'

export interface dependencyAlert {
  alertState: string,
  ghsaId: string,
  cvss: number
}

export interface updatedDependency extends dependencyAlert {
  dependencyName: string,
  dependencyType: string,
  updateType: string,
  directory: string,
  packageEcosystem: string,
  targetBranch: string,
  prevVersion: string,
  newVersion: string
}

export interface alertLookup {
    (dependencyName: string, dependencyVersion: string, directory: string): Promise<dependencyAlert>;
}

export async function parse (commitMessage: string, branchName: string, mainBranch: string, lookup: alertLookup): Promise<Array<updatedDependency>> {
  const firstLine = commitMessage.split('\n')[0]
  const directory = firstLine.match(/ in (?<directory>[^ ]+)$/)
  const bumpFragment = commitMessage.match(/^Bumps .* from (?<from>\d[^ ]*) to (?<to>\d[^ ]*)\.$/m)
  const yamlFragment = commitMessage.match(/^-{3}\n(?<dependencies>[\S|\s]*?)\n^\.{3}\n/m)

  if (yamlFragment?.groups && branchName.startsWith('dependabot')) {
    const data = YAML.parse(yamlFragment.groups.dependencies)

    // Since we are on the `dependabot` branch (9 letters), the 10th letter in the branch name is the delimiter
    const delim = branchName[10]
    const chunks = branchName.split(delim)
    const dirname = directory?.groups?.directory ?? '/'
    const prev = bumpFragment?.groups?.from ?? ''
    const next = bumpFragment?.groups?.to ?? ''

    if (data['updated-dependencies']) {
      return await Promise.all(data['updated-dependencies'].map(async (dependency, index) => ({
        dependencyName: dependency['dependency-name'],
        dependencyType: dependency['dependency-type'],
        updateType: dependency['update-type'],
        directory: dirname,
        packageEcosystem: chunks[1],
        targetBranch: mainBranch,
        prevVersion: index === 0 ? prev : '',
        newVersion: index === 0 ? next : '',
        ...await lookup(dependency['dependency-name'], index === 0 ? prev : '', dirname)
      })))
    }
  }

  return Promise.resolve([])
}
