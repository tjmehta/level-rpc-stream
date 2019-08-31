import MuxDemux, { HandleSubstreamType, OptsType } from 'mux-demux'
import {
  ReqData,
  writeErrorChunk,
  writeResultChunk,
} from './stream_write_utils'

import { LevelUp } from 'levelup'
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
  DSTREAM = 'DSTREAM',
}
const opsStr = (() => {
  const ops = Object.keys(OPERATIONS)
  const lastOp = ops.pop()
  return ops.join(', ') + `, or ${lastOp}`
})()

export const RESPONSE_SUBSTREAM_ID = '__res__'

export default function createLevelRPCStream(level: LevelUp) {
  // state
  const streams: Map<string, NodeJS.ReadableStream> = new Map()
  const queries: Map<string, Promise<any>> = new Map()

  // create outStream
  const mux = MuxDemux({ objectMode: true })
  const resStream = mux.createWriteStream(RESPONSE_SUBSTREAM_ID)
  const outStream = mux

  // create inStream
  const inStream = through2.obj(function(chunk: ReqData, enc, cb) {
    const { id, op, args } = chunk
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
      handleOperationStream(id, () => level.createReadStream(...args))
    } else if (op === OPERATIONS.KSTREAM) {
      // key stream operation
      handleOperationStream(id, () => level.createKeyStream(...args))
    } else if (op === OPERATIONS.VSTREAM) {
      // value stream operation
      handleOperationStream(id, () => level.createValueStream(...args))
    } else if (op === OPERATIONS.DSTREAM) {
      const [streamId] = args
      if (!streams.has(streamId)) {
        writeErrorChunk(
          resStream,
          id,
          new ReqError(`stream with id does not exist: ${streamId}`),
        )
      } else {
        // @ts-ignore
        const result = streams.get(streamId).destroy()
        writeResultChunk(resStream, id, result)
      }
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
      const p = promise
        .then(result => {
          writeResultChunk(resStream, id, result)
        })
        .catch(err => {
          writeErrorChunk(resStream, id, err)
        })
        .finally(() => {
          queries.delete(id)
        })
      queries.set(id, p)
      return p
    }
    function handleOperationStream(
      id: string,
      createStream: () => NodeJS.ReadableStream,
    ) {
      if (streams.has(id)) {
        writeErrorChunk(
          resStream,
          id,
          new ReqError(`stream with id already exists: ${id}`),
        )
        return
      }
      // create stream
      const stream = createStream()
      streams.set(id, stream)
      // create substream
      const substream = mux.createWriteStream(id)
      stream.pipe(substream)
      // handle stream event
      stream.once('end', handleEnd)
      stream.once('error', handleError)
      function handleEnd() {
        stream.removeListener('error', handleError)
        streams.delete(id)
      }
      function handleError(err: Error) {
        stream.removeListener('end', handleEnd)
        streams.delete(id)
        substream.error(err.message)
      }
    }
  })

  // create duplex
  const duplex = duplexify.obj()

  if (!level.isOpen()) {
    inStream.pause()
    level.once('open', () => {
      duplex.setReadable(outStream)
      duplex.setWritable(inStream)
      inStream.resume()
    })
  } else {
    duplex.setReadable(outStream)
    duplex.setWritable(inStream)
    inStream.resume()
  }

  duplex.on('error', attemptCleanUp)
  inStream.on('end', attemptCleanUp)
  function attemptCleanUp(err?: Error) {
    if (queries.size === 0) return cleanUp(err)
    return Promise.all(queries.values())
      .catch(err => console.error('query error while ending', err))
      .finally(() => cleanUp(err))
  }
  function cleanUp(err?: Error) {
    inStream.destroy()
    streams.forEach((stream, id) => {
      // @ts-ignore
      stream.destroy()
      streams.delete(id)
    })
    resStream.destroy()
    if (err) {
      outStream.emit('error', err)
    } else {
      outStream.end()
    }
  }

  return duplex
}

export interface ObjOptsType extends Omit<OptsType, 'objectMode'> {}
export const demux = (
  opts: ObjOptsType | HandleSubstreamType,
  onStream?: HandleSubstreamType,
) => {
  if (typeof opts === 'function') {
    onStream = opts
    opts = {}
    return MuxDemux({ ...opts, objectMode: true }, onStream)
  }
  return MuxDemux({ ...opts, objectMode: true })
}

export class ClosedError extends Error {}
export class ReqError extends Error {}
