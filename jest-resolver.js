// Custom resolver that adds 'import' condition for ESM-only @actions/* packages
// and handles subpath imports not in exports maps
const path = require('path')

module.exports = (request, options) => {
  if (request.startsWith('@actions/')) {
    try {
      return options.defaultResolver(request, {
        ...options,
        conditions: [...(options.conditions || []), 'import'],
      })
    } catch {
      // Subpath not in exports map — resolve the file directly
      const resolved = path.join(options.rootDir, 'node_modules', request + '.js')
      return resolved
    }
  }
  return options.defaultResolver(request, options)
}
