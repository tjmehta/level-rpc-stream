declare module 'mux-demux' {
  import { Duplex, Readable, Writable } from 'stream'
  // opts type
  interface OptsType {
    circular?: boolean
    keepOpen?: boolean
    objectMode?: boolean
    unexpectedFinishError?: boolean
  }
  interface ObjOptsType extends Omit<OptsType, 'objectMode'> {}

  class DuplexSubstream extends Duplex {
    meta: string
    error(message: string): void
  }
  class ReadableSubstream extends Readable {
    meta: string
    error(message: string): void
  }
  class WritableSubstream extends Writable {
    meta: string
    error(message: string): void
  }

  // handleStream type
  function handleSubstream(
    stream: DuplexSubstream | ReadableSubstream | WritableSubstream,
  ): void
  type HandleSubstreamType = typeof handleSubstream

  // muxdemux type
  class MuxDemux extends Duplex {
    constructor(
      opts?: OptsType | HandleSubstreamType,
      handleSubstream?: HandleSubstreamType,
    )
    createStream(name: string): DuplexSubstream
    createReadStream(name: string): ReadableSubstream
    createWriteStream(name: string): WritableSubstream
  }

  function createMuxDemux(
    opts?: OptsType | HandleSubstreamType,
    handleSubstream?: HandleSubstreamType,
  ): MuxDemux

  export default createMuxDemux
}

declare module 'mux-demux/msgpack' {
  import createMuxDemux from 'mux-demux'
  export default createMuxDemux
}
