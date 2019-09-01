import through2 from 'through2'

export default (...keys: Array<string>) =>
  through2.obj((chunk, enc, cb) => {
    if (typeof chunk === 'object') {
      // decode buffer keys
      keys.forEach(key => {
        if (chunk[key] instanceof Buffer) {
          chunk[key] = encodeBuffer(chunk[key])
        }
      })
    }
    cb(null, chunk)
  })

function encodeBuffer(buff: Buffer) {
  return {
    __buff__: buff.toString('base64'),
  }
}
