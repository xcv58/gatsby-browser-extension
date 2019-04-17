const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const crypto = require('crypto');
const WriteFilePlugin = require('write-file-webpack-plugin')


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

exports.onCreateWebpackConfig = ({
  stage, getConfig, rules, loaders, actions
}) => {
  console.log('onCreateWebpackConfig:', stage)
  if (stage != 'develop') { return }
  console.log(getConfig().output);
  console.log(getConfig().entry);
  const config = getConfig()
  const { plugins, output, entry } = config
  actions.replaceWebpackConfig({
    ...config,
    output: {
      ...output,
      path: path.join('/Users/xcv58/work/gatsby-browser-extension', 'public')
    },
    entry: {
      ...entry,
      commons: [
        // 'webpack-dev-server/client?http://localhost:8000',
        // 'webpack/hot/dev-server',
        'event-source-polyfill',
        // '/Users/xcv58/work/gatsby-browser-extension/node_modules/webpack-hot-middleware/client.js?path=/__webpack_hmr&reload=true&overlay=false',
        '/Users/xcv58/work/gatsby-browser-extension/node_modules/webpack-hot-middleware/client.js?path=http://localhost:8000/__webpack_hmr&reload=true&overlay=false',
        '/Users/xcv58/work/gatsby-browser-extension/.cache/app'
      ]
      // config.entry[entryName] = [
      //   'webpack-dev-server/client?http://localhost:' + env.PORT,
      //   'webpack/hot/dev-server'
      // ].concat(config.entry[entryName])
    },
    plugins: [...plugins, new WriteFilePlugin()]
  })

  console.log('after:')
  console.log(getConfig().output);
}
