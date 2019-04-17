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

  const $ = cheerio.load(fs.readFileSync(path.join('public', 'index.html')))
  const scripts = []
  $('script').each(function (_, element) {
    const content = $(this).html()
    scripts.push(content)
  })
  const contentSecurityPolicies = scripts.filter(x => x).map(getContentSecurityPolicy)
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
