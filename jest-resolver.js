// Custom resolver that adds 'import' condition for ESM-only @actions/* packages
module.exports = (request, options) => {
  if (request.startsWith('@actions/')) {
    return options.defaultResolver(request, {
      ...options,
      conditions: [...(options.conditions || []), 'import'],
    })
  }
  return options.defaultResolver(request, options)
}
