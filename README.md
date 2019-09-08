# level-rpc-stream

Control a level db over a duplex stream. If you're looking for a full network server/client leveldb solution check out level-rpc-server.

# Installation

```js
npm i --save level-rpc-stream
```

# Usage

## Examples

### Create a LevelRPCStream

```js
import createLevelStream from `level-rpc-stream`

const db = ... // any level db like require('level')('foo')

// create a duplex rpc stream for interacting with level
const stream = createLevelStream(db)
```

### Perform Level Operations

#### Send a `get` request

To perform a get operation on level db using level-rpc-stream, you have to write an operation object (containing an id, operation, and args) to the stream. This will invoke the equivalent method on the level db instance, with the passed args.

```js
// Get key data using stream, equivalent to `db.get('key')`
stream.write({
  id: requestId,
  op: OPERATIONS.GET,
  args: ['key'],
})
```

#### Send a `get` request full example

To receive a response from the level-rpc-stream you have to pipe to `demux`. `demux` splits the level-rpc-stream's readable stream into multiple substreams. All responses from leveldb promise operations are sent over the "response substream".

```js
import createLevelStream, {
  demux,
  RESPONSE_SUBSTREAM_ID,
  OPERATIONS
} from `level-rpc-stream`
import uuid from 'uuid'

const db = ... // any level db
const stream = createLevelStream(db)

// perform a `get` operation and recieve a response
const requestId = uuid()
// receive response data over the level-rpc-stream substreams
stream.pipe(demux((substream) => {
  // all request responses are emitted over the "response substream"
  if (substream.id === RESPONSE_SUBSTREAM_ID) {
    // substream is the "response substream"
    substream.on('data', (data) => {
      if (data.id === requestId) {
        // recieved a response for the `get` operation
        // check if the get operation rejected with an error
        if (data.error) {
          // errors will Error instances
          throw data.error
        }
        // the get operation succeeded and resolved a result
        // if `get` resolves a buffer, the result will be a valid buffer
        console.log(data.result) // <Buffer 68 65 6c 6c 6f 20 77 6f 72 6c 64>
      }
    })
  }
}))

// Get key data using stream, equivalent to `db.get('key')`
stream.write({
  id: requestId, //unique request id string
  op: OPERATIONS.GET,
  args: ['key']
})
```

#### Send a `createReadStream` request full example

LevelDB supports streaming operations like `createReadStream`, `createKeyStream`, and `createValueStream`. level-rpc-stream supports streaming responses by using substreams. Each streaming response will create a new substream over the level-rpc-stream readable stream.

```js
import createLevelStream, {
  demux,
  RESPONSE_SUBSTREAM_ID,
  OPERATIONS
} from `level-rpc-stream`
import uuid from 'uuid'

const db = ... // any level db
const stream = createLevelStream(db)

// perform a `createReadStream` operation and recieve it's stream response
const requestId = uuid()
// receive response data over the level-rpc-stream substreams
stream.pipe(demux((substream) => {
  // the `createReadStream` substream id will match the request's id
  if (substream.id === requestId) {
    // substream is a level db read stream, and will emit all the stream events: 'data', 'end', 'error', etc
    substream.on('data', (data) => {
      console.log(data)
      /*
      {
        key: <Buffer 66 6f 6f>,
        val: <Buffer 68 65 6c 6c 6f 20 77 6f 72 6c 64>
      }
      */
    })
  }
}))

// Write `createReadStream` operation
stream.write({
  id: requestId, //unique request id string
  op: OPERATIONS.RSTREAM,
  args: [{ /* createReadStream options */ }]
})
```

## Documentation

### createLevelStream(leveldb)

`createLevelStream` is the default export of this module. It accepts a leveldb instance and returns a level-rpc-stream. `levelStream` (level-rpc-stream instance), is a duplex stream. The writable stream is an object stream that accepts operations as objects, that invoke methods on leveldb instance. The readable stream is the multiplexed stream (has substreams) where responses and streams from level are read.

### levelStream.write

`levelStream.write` is used to send operations to leveldb. The supported operations are PUT, GET, DEL, BATCH, RSTREAM (createReadStream), KSTREAM (createKeyStream), VSTREAM (createValueStream), and DSTREAM (allows you to destroy a level stream by id). All of these operations are formatted like `{ id, op, args }`. `id` is the request id, `op` is the operation (use OPERATIONS), and `args` are the arguments passed to the leveldb associated method.

Operation Requests Examples

```js
// PUT operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.PUT,
  args: ['key', 'val'],
})

// GET operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.GET,
  args: ['key'],
})

// DEL operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.DEL,
  args: ['key'],
})

// BATCH operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.BATCH,
  args: [
    [
      { type: 'del', key: 'key1' },
      { type: 'put', key: 'key2', value: 'value2' },
    ],
  ],
})

// BATCH operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.DSTREAM,
  args: [streamId],
})
```

Stream Requests Examples

For stream options checkout: [levelup's docs](https://github.com/Level/levelup#dbcreatereadstreamoptions)

```js
// RSTREAM operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.RSTREAM,
  args: [streamOpts],
})

// KSTREAM operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.KSTREAM,
  args: [streamOpts],
})

// DEL operation
levelStream.write({
  id: 'some_unique_id',
  op: OPERATIONS.DEL,
  args: [streamOpts],
})
```

### demux

`levelStreams` readable stream is a multiplexed stream (has substreams). All operation request responses are can be read from the "response substream". The response substream's id is exported as `RESPONSE_SUBSTREAM_ID`. Stream operations (like RSTREAM) will create new substreams on the readable stream. Check out the examples above "Send a `get` request and recieve the response" and "Send a `createReadStream` request full example".

# License

MIT
