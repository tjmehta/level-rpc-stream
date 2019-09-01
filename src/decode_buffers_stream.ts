import through2 from 'through2'

export default (...keys: Array<string>) =>
  through2.obj((chunk, enc, cb) => {
    if (typeof chunk === 'object') {
      // decode buffer keys
      keys.forEach(key => {
        if (chunk[key] && chunk[key].__buff__) {
          chunk[key] = decodeBuffer(chunk[key])
        }
      })
    }
    cb(null, chunk)
  })

function decodeBuffer(obj: { __buff__: string }) {
  return Buffer.from(obj.__buff__, 'base64')
}
