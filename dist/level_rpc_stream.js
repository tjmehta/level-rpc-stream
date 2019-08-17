'use strict'
var __extends =
  (this && this.__extends) ||
  (function() {
    var extendStatics = function(d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function(d, b) {
            d.__proto__ = b
          }) ||
        function(d, b) {
          for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]
        }
      return extendStatics(d, b)
    }
    return function(d, b) {
      extendStatics(d, b)
      function __() {
        this.constructor = d
      }
      d.prototype =
        b === null ? Object.create(b) : ((__.prototype = b.prototype), new __())
    }
  })()
var __importDefault =
  (this && this.__importDefault) ||
  function(mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
var stream_write_utils_1 = require('./stream_write_utils')
var msgpack_1 = __importDefault(require('mux-demux/msgpack'))
var duplexify_1 = __importDefault(require('duplexify'))
var through2_1 = __importDefault(require('through2'))
var OPERATIONS
;(function(OPERATIONS) {
  OPERATIONS['PUT'] = 'PUT'
  OPERATIONS['GET'] = 'GET'
  OPERATIONS['DEL'] = 'DEL'
  OPERATIONS['BATCH'] = 'BATCH'
  OPERATIONS['RSTREAM'] = 'RSTREAM'
  OPERATIONS['KSTREAM'] = 'KSTREAM'
  OPERATIONS['VSTREAM'] = 'VSTREAM'
})((OPERATIONS = exports.OPERATIONS || (exports.OPERATIONS = {})))
var opsStr = (function() {
  var ops = Object.keys(OPERATIONS)
  var lastOp = ops.pop()
  return ops.join(', ') + (', or ' + lastOp)
})()
exports.RESPONSE_SUBSTREAM_ID = '__res__'
function createLevelRPCStream(level) {
  var mux = msgpack_1.default()
  var resStream = mux.createWriteStream(exports.RESPONSE_SUBSTREAM_ID)
  var outStream = mux.pipe(through2_1.default.obj())
  var inStream = through2_1.default.obj()
  var levelInStream = through2_1.default.obj(function(_a, enc, cb) {
    var id = _a.id,
      op = _a.op,
      args = _a.args
    //validate leveldb state
    if (!level.isOpen()) {
      stream_write_utils_1.writeErrorChunk(
        resStream,
        id,
        new ClosedError('leveldb is closed'),
      )
      cb()
      return
    }
    //validate id
    if (!validateId(id)) return
    // has operation
    if (op === OPERATIONS.PUT) {
      // put operation
      // @ts-ignore
      handleOperationPromise(id, level.put.apply(level, args))
    } else if (op === OPERATIONS.GET) {
      // get operation
      // @ts-ignore
      handleOperationPromise(id, level.get.apply(level, args))
    } else if (op === OPERATIONS.DEL) {
      // del operation
      // @ts-ignore
      handleOperationPromise(id, level.del.apply(level, args))
    } else if (op === OPERATIONS.BATCH) {
      // batch operation
      // @ts-ignore
      handleOperationPromise(id, level.batch.apply(level, args))
    } else if (op === OPERATIONS.RSTREAM) {
      // read stream operation
      handleOperationStream(id, level.createReadStream.apply(level, args))
    } else if (op === OPERATIONS.KSTREAM) {
      // key stream operation
      handleOperationStream(id, level.createKeyStream.apply(level, args))
    } else if (op === OPERATIONS.VSTREAM) {
      // value stream operation
      handleOperationStream(id, level.createValueStream.apply(level, args))
    } else {
      // unknown operation
      stream_write_utils_1.writeErrorChunk(
        resStream,
        id,
        new ReqError('operation must be: ' + opsStr),
      )
    }
    cb()
    // utils
    function validateId(id) {
      var isValid = typeof id === 'string'
      if (!isValid) {
        stream_write_utils_1.writeErrorChunk(
          resStream,
          id,
          new ReqError('id must be a string'),
        )
        cb()
        return false
      }
      return true
    }
    function handleOperationPromise(id, promise) {
      return promise
        .then(function(result) {
          stream_write_utils_1.writeResultChunk(resStream, id, result)
        })
        .catch(function(err) {
          stream_write_utils_1.writeErrorChunk(resStream, id, err)
        })
    }
    function handleOperationStream(id, stream) {
      var substream = mux.createWriteStream(id)
      stream.pipe(substream)
      stream.on('error', function(err) {
        return substream.error(err.message)
      })
    }
  })
  if (level.isOpen()) {
    inStream.pipe(levelInStream)
  } else {
    inStream.pause()
    level.once('open', function() {
      return inStream.pipe(levelInStream)
    })
  }
  return duplexify_1.default.obj(inStream, outStream)
}
exports.default = createLevelRPCStream
var ClosedError = /** @class */ (function(_super) {
  __extends(ClosedError, _super)
  function ClosedError() {
    return (_super !== null && _super.apply(this, arguments)) || this
  }
  return ClosedError
})(Error)
exports.ClosedError = ClosedError
var ReqError = /** @class */ (function(_super) {
  __extends(ReqError, _super)
  function ReqError() {
    return (_super !== null && _super.apply(this, arguments)) || this
  }
  return ReqError
})(Error)
exports.ReqError = ReqError
