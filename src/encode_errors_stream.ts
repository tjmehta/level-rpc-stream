import through2 from 'through2'

export default (...keys: Array<string>) =>
  through2.obj((chunk, enc, cb) => {
    if (typeof chunk === 'object') {
      // encode error keys
      keys.forEach(key => {
        if (chunk[key] instanceof Error) {
          chunk[key] = encodeError(chunk[key])
        }
      })
    }
    cb(null, chunk)
  })

function encodeError(
  err: Error,
): { __err__: { name: string; message: string } } {
  return {
    __err__: {
      name: err.name,
      message: err.message,
    },
  }
}
