/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

// You can delete this file if you're not using it
const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const crypto = require('crypto');

const SHA_ALGO = 'sha512'

const getContentSecurityPolicy = (text) => {
  const hash = crypto.createHash(SHA_ALGO);
  hash.update(text)
  const sha = hash.digest('base64')
  return `'${SHA_ALGO}-${sha}'`
}

exports.onPostBuild = async ({ reporter }, pluginOptions) => {
  const activity = reporter.activityTimer(`Build manifest.json`)
  activity.start()

  const manifest = JSON.parse(fs.readFileSync('manifest.json'))

  // gatsby-chunk-mapping, gatsby-script-loader
  const $ = cheerio.load(fs.readFileSync(path.join('public', 'index.html')))
  const contentSecurityPolicies = ['gatsby-chunk-mapping', 'gatsby-script-loader'].map(id => {
      const html = $(`#${id}`).html()
      return getContentSecurityPolicy(html)
    }
  )
  manifest.content_security_policy = manifest.content_security_policy.replace(
    ';', ` ${contentSecurityPolicies.join(' ')};`
  )
  //Write manifest
  fs.writeFileSync(
    path.join(`public`, `manifest.json`),
    JSON.stringify(manifest)
  )

  activity.end()
 }
