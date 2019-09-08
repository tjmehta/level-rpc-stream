import MuxDemux, { OptsType } from 'mux-demux'
import { Readable, Stream } from 'stream'
import {
  ReqData,
  writeErrorChunk,
  writeResultChunk,
} from './stream_write_utils'
import decodeBuffers, {
  decodeBuffer,
  isEncodedBuffer,
} from './decode_buffers_stream'

import { LevelUp } from 'levelup'
import Pumpify from 'pumpify'
import decodeErrors from './decode_errors_stream'
import duplexify from 'duplexify'
import encodeBuffers from './encode_buffers_stream'
import encodeErrors from './encode_errors_stream'
import through2 from 'through2'

const pumpify = (...args: Stream[]) => new Pumpify(...args)
pumpify.obj = (...args: Stream[]) => new Pumpify.obj(...args)

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

export const RESPONSE_SUBSTREAM_ID: string = '__res__'

export default function createLevelRPCStream(level: LevelUp) {
  // state
  const streams: Map<string, NodeJS.ReadableStream> = new Map()
  const queries: Map<string, Promise<any>> = new Map()

  // create outStream
  const mux = MuxDemux({ objectMode: true })
  const outStream = mux
  const resStream = pumpify.obj(
    encodeBuffers('result'),
    encodeErrors('error'),
    mux.createWriteStream(RESPONSE_SUBSTREAM_ID),
  )

  // create inStream
  const inStream = through2.obj(function(chunk: ReqData, enc, cb) {
    const { id, op, args: _args } = chunk
    //validate leveldb state
    if (!level.isOpen()) {
      writeErrorChunk(resStream, id, new ClosedError('leveldb is closed'))
      cb()
      return
    }
    //validate id
    if (!validateId(id)) return
    // cast any encoded buffer args
    const args = _args.map(arg => {
      if (isEncodedBuffer(arg)) return decodeBuffer(arg)
      return arg
    })
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
      const [streamId] = (args as any) as [string]
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
      // create dest substream
      const substream = mux.createWriteStream(id)
      // create source stream
      const stream = pumpify.obj(createStream(), encodeBuffers('key', 'value'))
      streams.set(id, stream)
      stream.pipe(substream)
      // handle stream events
      stream.once('end', handleEnd)
      stream.once('error', handleError)
      function handleEnd() {
        stream.removeListener('error', handleError)
        streams.delete(id)
      }
      function handleError(err: Error) {
        stream.removeListener('end', handleEnd)
        substream.error(err.message)
        streams.delete(id)
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

export interface Substream extends Readable {
  id: string
}

export type HandleSubstreamType = (stream: Substream) => void
export interface ObjOptsType extends Omit<OptsType, 'objectMode'> {}
export const demux = (
  opts: ObjOptsType | HandleSubstreamType,
  onStream?: HandleSubstreamType,
) => {
  if (typeof opts === 'function') {
    onStream = opts as HandleSubstreamType
    opts = {}
  }
  if (onStream) {
    const _onStream: HandleSubstreamType = onStream
    return MuxDemux({ ...opts, objectMode: true }, substream => {
      const stream = (pumpify.obj(
        substream,
        decodeBuffers('key', 'value', 'result'),
        decodeErrors('error'),
      ) as unknown) as Substream
      stream.id = substream.meta
      _onStream(stream)
    })
  }
  return MuxDemux({ ...opts, objectMode: true })
}

export class ClosedError extends Error {}
export class ReqError extends Error {}
