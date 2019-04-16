/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

// You can delete this file if you're not using it
const fs = require('fs')
const path = require('path')

exports.onPostBuild = async ({ reporter }, pluginOptions) => {
  const activity = reporter.activityTimer(`Build manifest.json`)
  activity.start()

  const manifest = JSON.parse(fs.readFileSync('manifest.json'))

  // TODO: generate content_security_policy for inline script, references:
  // https://www.w3.org/TR/2015/CR-CSP2-20150721/#script-src-hash-usage
  // https://report-uri.com/home/hash
  //Write manifest
  fs.writeFileSync(
    path.join(`public`, `manifest.json`),
    JSON.stringify(manifest)
  )

  activity.end()
 }
