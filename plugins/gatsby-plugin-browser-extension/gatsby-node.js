const fs = require('fs')
const path = require('path')
const cheerio = require('cheerio')
const crypto = require('crypto');
const WriteFilePlugin = require('write-file-webpack-plugin')

const SHA_ALGO = 'sha512'

const BASE_URL = 'http://localhost:8000'

const getContentSecurityPolicy = (text) => {
  const hash = crypto.createHash(SHA_ALGO);
  hash.update(text)
  const sha = hash.digest('base64')
  return `'${SHA_ALGO}-${sha}'`
}

const getFile = (file) => {
  const { INIT_CWD } = process.env
  return path.join(INIT_CWD, file)
}

const getFileInPublic = (file) => getFile(path.join('public', file))

const copyManifestFile = () => {
  const filePath = getFile('manifest.json')
  const manifest = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  if (process.env.NODE_ENV === 'development') {
    manifest.content_security_policy = manifest.content_security_policy.replace(';', ` ${BASE_URL};`)
  } else {
    const $ = cheerio.load(fs.readFileSync(getFileInPublic('index.html')))
    const scripts = []
    $('script').each(function (_, element) {
      const content = $(this).html()
      scripts.push(content)
    })
    const contentSecurityPolicies = scripts.filter(x => x).map(getContentSecurityPolicy)
    manifest.content_security_policy = manifest.content_security_policy.replace(';', ` ${contentSecurityPolicies.join(' ')};`)
  }

  fs.writeFileSync(
    getFileInPublic('manifest.json'),
    JSON.stringify(manifest)
  )
}

exports.onPreInit = ({ reporter }) => {
  const activity = reporter.activityTimer(`Setup process.env.GATSBY_WEBPACK_PUBLICPATH`)
  activity.start()
  if (!process.env.GATSBY_WEBPACK_PUBLICPATH) {
    process.env.GATSBY_WEBPACK_PUBLICPATH = BASE_URL + '/'
  }
  activity.end()
}

exports.onCreateDevServer = ({ reporter }) => {
  const activity = reporter.activityTimer(`Rewrite index.html & copy manifest.json`)
  activity.start()
  const htmlFile = getFileInPublic('index.html')
  const $ = cheerio.load(fs.readFileSync(htmlFile))
  $('script').each(function (_, element) {
    const $$ = $(this)
    const src = `${BASE_URL}${$$.attr('src')}`
    $$.attr('src', src)
  })
  fs.writeFileSync(htmlFile, $.html())
  copyManifestFile()
  activity.end()
}


exports.onPostBootstrap = ({ reporter }) => {
  const activity = reporter.activityTimer(`Setup .cache/socketIo.js`)
  const socketIoFile = getFile('.cache/socketIo.js')
  const socketIoFileContent = fs.readFileSync(socketIoFile, 'utf8')
  fs.writeFileSync(socketIoFile, socketIoFileContent.replace('= io()', `= io('${BASE_URL}')`))
  activity.end()
}

exports.onPostBuild = async ({ reporter }, pluginOptions) => {
  const activity = reporter.activityTimer(`Build manifest.json`)
  activity.start()
  copyManifestFile()
  activity.end()
}

exports.onCreateWebpackConfig = ({ stage, getConfig, actions }) => {
  const config = getConfig()
  if (stage != 'develop') {
    return
  }
  const { plugins, output, entry } = config
  actions.replaceWebpackConfig({
    ...config,
    output: { ...output, path: getFile('public') },
    plugins: [...plugins, new WriteFilePlugin()]
  })
}
