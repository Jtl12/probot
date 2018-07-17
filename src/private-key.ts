import fs from 'fs'

// tslint:disable-next-line:no-var-requires
const isBase64 = require('is-base64')

const hint = `please use:
  * \`--private-key=/path/to/private-key\` flag, or
  * \`PRIVATE_KEY\` environment variable, or
  * \`PRIVATE_KEY_PATH\` environment variable
`

/**
 * Finds a private key through various user-(un)specified methods.
 * Order of precedence:
 * 1. Explicit path (CLI option)
 * 2. `PRIVATE_KEY` env var
 * 3. `PRIVATE_KEY_PATH` env var
 * 4. Any file w/ `.pem` extension in current working dir
 * @param filepath - Explicit, user-defined path to keyfile
 * @returns Private key
 * @private
 */
function findPrivateKey (filepath: string): Buffer | string {
  if (filepath) {
    return fs.readFileSync(filepath)
  }
  if (process.env.PRIVATE_KEY) {
    const cert = process.env.PRIVATE_KEY
    const begin = '-----BEGIN RSA PRIVATE KEY-----'
    const end = '-----END RSA PRIVATE KEY-----'
    if (cert.includes(begin) && cert.includes(end)) {
      // Full key with new lines
      return cert.replace(/\\n/g, '\n')
    } else {
      // Cert doesn't look like an RSA key, so let's see if it matches when we convert it
      if (isBase64(cert)) {
        const decodedCert = Buffer.from(cert, 'base64').toString()
        if (decodedCert.includes(begin) && decodedCert.includes(end)) {
          return decodedCert
        }
      }
    }
    throw new Error(`The contents of \`PRIVATE_KEY\` could not be validated. Please check to ensure you've copied the contents of the .pem file correctly.`)
  }
  if (process.env.PRIVATE_KEY_PATH) {
    return fs.readFileSync(process.env.PRIVATE_KEY_PATH)
  }
  const pemFiles = fs.readdirSync(process.cwd())
    .filter(path => path.endsWith('.pem'))
  if (pemFiles.length > 1) {
    throw new Error(
      `Found several private keys: ${pemFiles.join(', ')}. ` +
      `To avoid ambiguity ${hint}`
    )
  } else if (pemFiles[0]) {
    return findPrivateKey(pemFiles[0])
  }
  throw new Error(`Missing private key for GitHub App, ${hint}`)
}

module.exports = {
  findPrivateKey
}
