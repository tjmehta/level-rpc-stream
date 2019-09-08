import through2 from 'through2'

export default (...keys: Array<string>) =>
  through2.obj((chunk, enc, cb) => {
    if (typeof chunk === 'object') {
      // decode buffer keys
      keys.forEach(key => {
        if (isEncodedBuffer(chunk[key])) {
          chunk[key] = decodeBuffer(chunk[key])
        }
      })
    }
    cb(null, chunk)
  })

export function isEncodedBuffer(obj: any): boolean {
  return Boolean(obj && typeof obj.__buff__ === 'string')
}

export function decodeBuffer(obj: { __buff__: string }) {
  return Buffer.from(obj.__buff__, 'base64')
}
