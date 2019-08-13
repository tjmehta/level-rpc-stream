import { OPERATIONS, RESPONSE_SUBSTREAM_ID } from '../level_rpc_stream'

import { Duplexify } from 'duplexify'
import MuxDemux from 'mux-demux/msgpack'
import { Stream } from 'stream'
import createLevelRPCStream from '../level_rpc_stream'
import level from 'level'
import pDefer from 'p-defer'
import through2 from 'through2'

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
              "error": Object {
                "message": "boom",
                "name": "Error",
              },
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
              "error": Object {
                "message": "boom",
                "name": "Error",
              },
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
              "error": Object {
                "message": "boom",
                "name": "Error",
              },
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
              "result": undefined,
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
              "error": Object {
                "message": "boom",
                "name": "Error",
              },
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
              "result": undefined,
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
              "error": Object {
                "message": "boom",
                "name": "Error",
              },
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
              "result": undefined,
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
        const eventPromise = onSubstreamEvent(stream, reqId, 'close')
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
        const eventPromise = onSubstreamEvent(stream, reqId, 'close')
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
        const eventPromise = onSubstreamEvent(stream, reqId, 'close')
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
    })
  })
})

async function onSubstreamEvent(
  stream: Duplexify,
  substreamId: string,
  event: string,
): Promise<any> {
  return new Promise(resolve => {
    stream
      .pipe(
        MuxDemux(substream => {
          const name = substream.meta
          if (name === RESPONSE_SUBSTREAM_ID) return
          if (name !== substreamId) {
            console.warn('onSubstreamEvent: unknown substream', name)
            return
          }
          substream.on(event, resolve)
        }),
      )
      .pipe(stream)
  })
}

async function writePromise(stream: Duplexify, data: {}) {
  return new Promise((resolve, reject) => {
    stream
      .pipe(
        MuxDemux(substream => {
          const name = substream.meta
          if (name !== RESPONSE_SUBSTREAM_ID) {
            console.warn('writePromise: unknown substream', name)
            return
          }
          substream.on('data', resolve)
          substream.on('error', reject)
        }),
      )
      .pipe(stream)
    stream.write(data)
  })
}
