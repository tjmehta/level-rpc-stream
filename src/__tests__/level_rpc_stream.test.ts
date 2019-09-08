import { OPERATIONS, RESPONSE_SUBSTREAM_ID } from '../level_rpc_stream'
import createLevelRPCStream, { demux } from '../level_rpc_stream'

import { Duplexify } from 'duplexify'
import { Stream } from 'stream'
import level from 'level'
import pDefer from 'p-defer'
import through2 from 'through2'

jest.setTimeout(100)

jest.mock('level', () => () => {
  // imports
  const { EventEmitter } = require('events')

  // variables
  const level = new EventEmitter()

  // mock level
  return Object.assign(level, {
    isOpen: jest.fn(),
    isClosed: jest.fn(),
    batch: jest.fn(),
    put: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    createReadStream: jest.fn(),
    createKeyStream: jest.fn(),
    createValueStream: jest.fn(),
    once: jest.fn(),
  })
})

describe('createLevelRPCStream', () => {
  let ctx: any

  beforeEach(() => {
    ctx = {}
    ctx.mockLevel = level('fake')
  })

  describe('leveldb is closed', () => {
    beforeEach(() => {
      ctx.mockLevel.isOpen.mockReturnValue(false)
      ctx.mockLevel.isClosed.mockReturnValue(true)
    })

    it('should create a stream', () => {
      const stream = createLevelRPCStream(ctx.mockLevel)
      expect(stream).toBeInstanceOf(Stream)
    })
  })

  describe('leveldb is open', () => {
    beforeEach(() => {
      ctx.mockLevel.isOpen.mockReturnValue(true)
      ctx.mockLevel.isClosed.mockReturnValue(false)
    })

    it('should create a stream', () => {
      const stream = createLevelRPCStream(ctx.mockLevel)
      expect(stream).toBeInstanceOf(Stream)
    })

    describe('mocked level put', () => {
      beforeEach(() => {
        ctx.deferred = pDefer()
        ctx.mockLevel.put.mockImplementation(() => ctx.deferred.promise)
      })

      describe('level put error', () => {
        beforeEach(() => {
          ctx.deferred.reject(new Error('boom'))
        })

        it('should reject w/ error', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.PUT,
            args: ['key', 'val'],
          })

          expect(result).toMatchInlineSnapshot(`
            Object {
              "error": [Error: boom],
              "id": "id",
            }
          `)
        })
      })

      describe('level put resolves', () => {
        beforeEach(() => {
          ctx.deferred.resolve('value')
        })

        it('should resolve w/ result', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const args = ['key', 'val']
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.PUT,
            args,
          })

          expect(ctx.mockLevel.put).toHaveBeenCalledWith(...args)
          expect(result).toMatchInlineSnapshot(`
            Object {
              "id": "id",
              "result": "value",
            }
          `)
        })
      })
    })

    describe('mocked level get', () => {
      beforeEach(() => {
        ctx.deferred = pDefer()
        ctx.mockLevel.get.mockImplementation(() => ctx.deferred.promise)
      })

      describe('end tests', () => {
        it('should end duplex on end after queries complete', done => {
          let count = 0
          const stream = createLevelRPCStream(ctx.mockLevel)
          const out = through2.obj()
          stream.pipe(out.resume())
          out.on('end', checkDone)
          writePromise(stream, {
            id: 'id',
            op: OPERATIONS.GET,
            args: ['key'],
          }).then(checkDone)
          setTimeout(() => {
            stream.end()
          }, 0)
          setTimeout(() => {
            ctx.deferred.resolve('value')
          }, 10)
          function checkDone() {
            count++
            if (count === 2) done()
          }
        })
      })

      describe('level get error', () => {
        beforeEach(() => {
          ctx.deferred.reject(new Error('boom'))
        })

        it('should reject w/ error', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.GET,
            args: ['key'],
          })

          expect(result).toMatchInlineSnapshot(`
            Object {
              "error": [Error: boom],
              "id": "id",
            }
          `)
        })
      })

      describe('level get resolves', () => {
        beforeEach(() => {
          ctx.deferred.resolve('value')
        })

        it('should resolve w/ result', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const args = ['key']
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.GET,
            args,
          })

          expect(ctx.mockLevel.get).toHaveBeenCalledWith(...args)
          expect(result).toMatchInlineSnapshot(`
            Object {
              "id": "id",
              "result": "value",
            }
          `)
        })
      })

      describe('level get resolves (buffer)', () => {
        beforeEach(() => {
          ctx.deferred.resolve(Buffer.from('valu2'))
        })

        it('should resolve w/ result', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const args = ['key']
          const res = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.GET,
            args,
          })

          expect(ctx.mockLevel.get).toHaveBeenCalledWith(...args)
          // @ts-ignore
          expect(res.result).toBeInstanceOf(Buffer)
          expect(res).toMatchInlineSnapshot(`
            Object {
              "id": "id",
              "result": Object {
                "data": Array [
                  118,
                  97,
                  108,
                  117,
                  50,
                ],
                "type": "Buffer",
              },
            }
          `)
        })
      })
    })

    describe('mocked level del', () => {
      beforeEach(() => {
        ctx.deferred = pDefer()
        ctx.mockLevel.del.mockImplementation(() => ctx.deferred.promise)
      })

      describe('level del error', () => {
        beforeEach(() => {
          ctx.deferred.reject(new Error('boom'))
        })

        it('should reject w/ error', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.DEL,
            args: ['key'],
          })

          expect(result).toMatchInlineSnapshot(`
            Object {
              "error": [Error: boom],
              "id": "id",
            }
          `)
        })
      })

      describe('level del resolves', () => {
        beforeEach(() => {
          ctx.deferred.resolve()
        })

        it('should resolve w/ result', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const args = ['key']
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.DEL,
            args,
          })

          expect(ctx.mockLevel.del).toHaveBeenCalledWith(...args)
          expect(result).toMatchInlineSnapshot(`
            Object {
              "id": "id",
            }
          `)
        })
      })
    })

    describe('mocked level batch', () => {
      beforeEach(() => {
        ctx.deferred = pDefer()
        ctx.mockLevel.batch.mockImplementation(() => ctx.deferred.promise)
        ctx.args = [
          [
            { type: 'del', key: 'father' },
            { type: 'put', key: 'name', value: 'Yuri Irsenovich Kim' },
            { type: 'put', key: 'dob', value: '16 February 1941' },
            { type: 'put', key: 'spouse', value: 'Kim Young-sook' },
            { type: 'put', key: 'occupation', value: 'Clown' },
          ],
        ]
      })

      describe('level batch error', () => {
        beforeEach(() => {
          ctx.deferred.reject(new Error('boom'))
        })

        it('should reject w/ error', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.BATCH,
            args: ctx.args,
          })

          expect(result).toMatchInlineSnapshot(`
            Object {
              "error": [Error: boom],
              "id": "id",
            }
          `)
        })
      })

      describe('level batch resolves', () => {
        beforeEach(() => {
          ctx.deferred.resolve()
        })

        it('should resolve w/ result', async () => {
          const stream = createLevelRPCStream(ctx.mockLevel)
          const result = await writePromise(stream, {
            id: 'id',
            op: OPERATIONS.BATCH,
            args: ctx.args,
          })

          expect(ctx.mockLevel.batch).toHaveBeenCalledWith(...ctx.args)
          expect(result).toMatchInlineSnapshot(`
            Object {
              "id": "id",
            }
          `)
        })
      })
    })

    describe('mocked level createReadStream', () => {
      beforeEach(() => {
        ctx.mockReadStream = through2.obj()
        ctx.mockLevel.createReadStream.mockReturnValue(ctx.mockReadStream)
        ctx.args = [{ gte: 'foo' }]
      })

      it('should forward data events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'data')
        stream.write({
          id: reqId,
          op: OPERATIONS.RSTREAM,
          args: ctx.args,
        })

        // mock event
        const expectedResult = {
          key: 'key',
          val: 'val',
        }
        ctx.mockReadStream.write(expectedResult)

        // wait for substream event
        const result = await eventPromise
        expect(ctx.mockLevel.createReadStream).toHaveBeenCalledWith(...ctx.args)
        expect(result).toEqual(expectedResult)
      })

      it('should forward error events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'error')
        stream.write({
          id: reqId,
          op: OPERATIONS.RSTREAM,
          args: ctx.args,
        })

        // mock event
        ctx.mockReadStream.emit('error', new Error('boom'))

        // wait for substream event
        const err: Error = await eventPromise
        expect(ctx.mockLevel.createReadStream).toHaveBeenCalledWith(...ctx.args)
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toMatch(/boom/)
      })

      it('should forward end events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'end')
        stream.write({
          id: reqId,
          op: OPERATIONS.RSTREAM,
          args: ctx.args,
        })

        // mock event
        ctx.mockReadStream.write('hello')
        ctx.mockReadStream.end()

        // wait for substream event
        const result = await eventPromise
        expect(ctx.mockLevel.createReadStream).toHaveBeenCalledWith(...ctx.args)
        expect(result).toBeUndefined()
      })
    })

    describe('mocked level createKeyStream', () => {
      beforeEach(() => {
        ctx.mockReadStream = through2.obj()
        ctx.mockLevel.createKeyStream.mockReturnValue(ctx.mockReadStream)
        ctx.args = [{ gte: 'foo' }]
      })

      it('should forward data events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'data')
        stream.write({
          id: reqId,
          op: OPERATIONS.KSTREAM,
          args: ctx.args,
        })

        // mock event
        const expectedResult = 'key'
        ctx.mockReadStream.write(expectedResult)

        // wait for substream event
        const result = await eventPromise
        expect(ctx.mockLevel.createKeyStream).toHaveBeenCalledWith(...ctx.args)
        expect(result).toEqual(expectedResult)
      })

      it('should forward error events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'error')
        stream.write({
          id: reqId,
          op: OPERATIONS.KSTREAM,
          args: ctx.args,
        })

        // mock event
        ctx.mockReadStream.emit('error', new Error('boom'))

        // wait for substream event
        const err: Error = await eventPromise
        expect(ctx.mockLevel.createKeyStream).toHaveBeenCalledWith(...ctx.args)
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toMatch(/boom/)
      })

      it('should forward end events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'end')
        stream.write({
          id: reqId,
          op: OPERATIONS.KSTREAM,
          args: ctx.args,
        })

        // mock event
        ctx.mockReadStream.write('hello')
        ctx.mockReadStream.end()

        // wait for substream event
        const result = await eventPromise
        expect(ctx.mockLevel.createKeyStream).toHaveBeenCalledWith(...ctx.args)
        expect(result).toBeUndefined()
      })
    })

    describe('mocked level createValueStream', () => {
      beforeEach(() => {
        ctx.mockReadStream = through2.obj()
        ctx.mockLevel.createValueStream.mockReturnValue(ctx.mockReadStream)
        ctx.args = [{ gte: 'foo' }]
      })

      it('should forward data events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'data')
        stream.write({
          id: reqId,
          op: OPERATIONS.VSTREAM,
          args: ctx.args,
        })

        // mock event
        const expectedResult = 'val'
        ctx.mockReadStream.write(expectedResult)

        // wait for substream event
        const result = await eventPromise
        expect(ctx.mockLevel.createValueStream).toHaveBeenCalledWith(
          ...ctx.args,
        )
        expect(result).toEqual(expectedResult)
      })

      it('should forward error events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'error')
        stream.write({
          id: reqId,
          op: OPERATIONS.VSTREAM,
          args: ctx.args,
        })

        // mock event
        ctx.mockReadStream.emit('error', new Error('boom'))

        // wait for substream event
        const err: Error = await eventPromise
        expect(ctx.mockLevel.createValueStream).toHaveBeenCalledWith(
          ...ctx.args,
        )
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toMatch(/boom/)
      })

      it('should forward end events', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        const eventPromise = onSubstreamEvent(stream, reqId, 'end')
        stream.write({
          id: reqId,
          op: OPERATIONS.VSTREAM,
          args: ctx.args,
        })

        // mock event
        ctx.mockReadStream.write('hello')
        ctx.mockReadStream.end()

        // wait for substream event
        const result = await eventPromise
        expect(ctx.mockLevel.createValueStream).toHaveBeenCalledWith(
          ...ctx.args,
        )
        expect(result).toBeUndefined()
      })

      it('should destroy a stream', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'
        stream.write({
          id: reqId,
          op: OPERATIONS.VSTREAM,
          args: ctx.args,
        })
        const result = await writePromise(
          stream,
          {
            id: reqId + 2,
            op: OPERATIONS.DSTREAM,
            args: [reqId],
          },
          true,
        )

        expect(ctx.mockLevel.createValueStream).toHaveBeenCalledWith(
          ...ctx.args,
        )
        expect(result).toMatchInlineSnapshot(`
          Object {
            "id": "id2",
          }
        `)
      })

      it('should not destroy a non-existant stream', async () => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const reqId = 'id'

        const result = await writePromise(stream, {
          id: reqId,
          op: OPERATIONS.DSTREAM,
          args: ['nonExistantStreamId'],
        })

        expect(result).toMatchInlineSnapshot(`
          Object {
            "error": [Error: stream with id does not exist: nonExistantStreamId],
            "id": "id",
          }
        `)
      })
    })

    describe('end tests', () => {
      it('should end duplex on end', done => {
        const stream = createLevelRPCStream(ctx.mockLevel)
        const out = through2.obj()
        stream.pipe(out.resume())
        out.on('end', done)
        setTimeout(() => {
          stream.write({})
          stream.end()
        }, 0)
      })
    })
  })
})

async function onSubstreamEvent(
  stream: Duplexify,
  substreamId: string,
  event: string,
): Promise<any> {
  return new Promise(resolve => {
    stream.pipe(
      demux(substream => {
        const name = substream.id
        if (name === RESPONSE_SUBSTREAM_ID) return
        if (name !== substreamId) {
          console.warn('onSubstreamEvent: unknown substream', name)
          return
        }
        substream.on(event, resolve)
        substream.resume()
      }),
    )
  })
}

async function writePromise(stream: Duplexify, data: {}, hasStreams?: boolean) {
  return new Promise((resolve, reject) => {
    stream.pipe(
      demux(substream => {
        const name = substream.id
        if (!hasStreams && name !== RESPONSE_SUBSTREAM_ID) {
          console.warn('writePromise: unknown substream', name)
          return
        }
        substream.on('data', resolve)
        substream.on('error', reject)
      }),
    )
    stream.write(data)
  })
}
