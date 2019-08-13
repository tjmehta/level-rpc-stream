import {
  ReqData,
  writeErrorChunk,
  writeResultChunk,
} from './stream_write_utils'

import { LevelUp } from 'levelup'
import MuxDemux from 'mux-demux/msgpack'
import duplexify from 'duplexify'
import through2 from 'through2'

export enum OPERATIONS {
  PUT = 'PUT',
  GET = 'GET',
  DEL = 'DEL',
  BATCH = 'BATCH',
  RSTREAM = 'RSTREAM',
  KSTREAM = 'KSTREAM',
  VSTREAM = 'VSTREAM',
}
const opsStr = (() => {
  const ops = Object.keys(OPERATIONS)
  const lastOp = ops.pop()
  return ops.join(', ') + `, or ${lastOp}`
})()

export const RESPONSE_SUBSTREAM_ID = '__res__'

export default function createLevelRPCStream(level: LevelUp) {
  const mux = MuxDemux()
  const resStream = mux.createWriteStream(RESPONSE_SUBSTREAM_ID)
  const outStream = mux.pipe(through2.obj())
  const inStream = through2.obj()
  const levelInStream = through2.obj(function(
    { id, op, args }: ReqData,
    enc,
    cb,
  ) {
    //validate leveldb state
    if (!level.isOpen()) {
      writeErrorChunk(resStream, id, new ClosedError('leveldb is closed'))
      cb()
      return
    }
    //validate id
    if (!validateId(id)) return
    // has operation
    if (op === OPERATIONS.PUT) {
      // put operation
      // @ts-ignore
      handleOperationPromise(id, level.put(...args))
    } else if (op === OPERATIONS.GET) {
      // get operation
      // @ts-ignore
      handleOperationPromise(id, level.get(...args))
    } else if (op === OPERATIONS.DEL) {
      // del operation
      // @ts-ignore
      handleOperationPromise(id, level.del(...args))
    } else if (op === OPERATIONS.BATCH) {
      // batch operation
      // @ts-ignore
      handleOperationPromise(id, level.batch(...args))
    } else if (op === OPERATIONS.RSTREAM) {
      // read stream operation
      handleOperationStream(id, level.createReadStream(...args))
    } else if (op === OPERATIONS.KSTREAM) {
      // key stream operation
      handleOperationStream(id, level.createKeyStream(...args))
    } else if (op === OPERATIONS.VSTREAM) {
      // value stream operation
      handleOperationStream(id, level.createValueStream(...args))
    } else {
      // unknown operation
      writeErrorChunk(
        resStream,
        id,
        new ReqError(`operation must be: ${opsStr}`),
      )
    }
    cb()

    // utils
    function validateId(id: any) {
      const isValid = typeof id === 'string'
      if (!isValid) {
        writeErrorChunk(resStream, id, new ReqError('id must be a string'))
        cb()
        return false
      }
      return true
    }
    function handleOperationPromise(id: string, promise: Promise<any>) {
      return promise
        .then(result => {
          writeResultChunk(resStream, id, result)
        })
        .catch(err => {
          writeErrorChunk(resStream, id, err)
        })
    }
    function handleOperationStream(id: string, stream: NodeJS.ReadableStream) {
      const substream = mux.createWriteStream(id)
      stream.pipe(substream)
      stream.on('error', (err: Error) => substream.error(err.message))
    }
  })

  if (level.isOpen()) {
    inStream.pipe(levelInStream)
  } else {
    inStream.pause()
    level.once('open', () => inStream.pipe(levelInStream))
  }

  return duplexify.obj(inStream, outStream)
}

export class ClosedError extends Error {}
export class ReqError extends Error {}
