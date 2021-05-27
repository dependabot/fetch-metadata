import * as YAML from 'yaml'

interface updatedDependency {
  dependencyName: string,
  dependencyType: string,
  updateType: string,
}

export function parse (commitMessage: string): Array<updatedDependency> {
  const yamlFragment = commitMessage.match(/-{3}\n(?<dependencies>[\S|\s]*?)(?=\s*\.{3}\n)/m)

  if (yamlFragment?.groups) {
    const data = YAML.parse(yamlFragment.groups.dependencies)

    if (data['updated-dependencies']) {
      return data['updated-dependencies'].map(dependency => {
        return {
          dependencyName: dependency['dependency-name'],
          dependencyType: dependency['dependency-type'],
          updateType: dependency['update-type']
        }
      })
    }
  }

  return []
}
