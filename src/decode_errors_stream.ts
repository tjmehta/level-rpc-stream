import through2 from 'through2'

export default (...keys: Array<string>) =>
  through2.obj((chunk, enc, cb) => {
    if (typeof chunk === 'object') {
      // decode buffer keys
      keys.forEach(key => {
        if (chunk[key] && chunk[key].__err__) {
          chunk[key] = decodeError(chunk[key])
        }
      })
    }
    cb(null, chunk)
  })

function decodeError(obj: { __err__: { name: string; message: string } }) {
  const err = new Error(obj.__err__.message)
  err.name = obj.__err__.name
  delete err.stack
  return err
}
