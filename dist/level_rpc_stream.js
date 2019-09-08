"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var mux_demux_1 = __importDefault(require("mux-demux"));
var stream_write_utils_1 = require("./stream_write_utils");
var decode_buffers_stream_1 = __importStar(require("./decode_buffers_stream"));
var pumpify_1 = __importDefault(require("pumpify"));
var decode_errors_stream_1 = __importDefault(require("./decode_errors_stream"));
var duplexify_1 = __importDefault(require("duplexify"));
var encode_buffers_stream_1 = __importDefault(require("./encode_buffers_stream"));
var encode_errors_stream_1 = __importDefault(require("./encode_errors_stream"));
var through2_1 = __importDefault(require("through2"));
var pumpify = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return new (pumpify_1.default.bind.apply(pumpify_1.default, [void 0].concat(args)))();
};
pumpify.obj = function () {
    var _a;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return new ((_a = pumpify_1.default.obj).bind.apply(_a, [void 0].concat(args)))();
};
var OPERATIONS;
(function (OPERATIONS) {
    OPERATIONS["PUT"] = "PUT";
    OPERATIONS["GET"] = "GET";
    OPERATIONS["DEL"] = "DEL";
    OPERATIONS["BATCH"] = "BATCH";
    OPERATIONS["RSTREAM"] = "RSTREAM";
    OPERATIONS["KSTREAM"] = "KSTREAM";
    OPERATIONS["VSTREAM"] = "VSTREAM";
    OPERATIONS["DSTREAM"] = "DSTREAM";
})(OPERATIONS = exports.OPERATIONS || (exports.OPERATIONS = {}));
var opsStr = (function () {
    var ops = Object.keys(OPERATIONS);
    var lastOp = ops.pop();
    return ops.join(', ') + (", or " + lastOp);
})();
exports.RESPONSE_SUBSTREAM_ID = '__res__';
function createLevelRPCStream(level) {
    // state
    var streams = new Map();
    var queries = new Map();
    // create outStream
    var mux = mux_demux_1.default({ objectMode: true });
    var outStream = mux;
    var resStream = pumpify.obj(encode_buffers_stream_1.default('result'), encode_errors_stream_1.default('error'), mux.createWriteStream(exports.RESPONSE_SUBSTREAM_ID));
    // create inStream
    var inStream = through2_1.default.obj(function (chunk, enc, cb) {
        var id = chunk.id, op = chunk.op, _args = chunk.args;
        //validate leveldb state
        if (!level.isOpen()) {
            stream_write_utils_1.writeErrorChunk(resStream, id, new ClosedError('leveldb is closed'));
            cb();
            return;
        }
        //validate id
        if (!validateId(id))
            return;
        // cast any encoded buffer args
        var args = _args.map(function (arg) {
            if (decode_buffers_stream_1.isEncodedBuffer(arg))
                return decode_buffers_stream_1.decodeBuffer(arg);
            return arg;
        });
        // has operation
        if (op === OPERATIONS.PUT) {
            // put operation
            // @ts-ignore
            handleOperationPromise(id, level.put.apply(level, args));
        }
        else if (op === OPERATIONS.GET) {
            // get operation
            // @ts-ignore
            handleOperationPromise(id, level.get.apply(level, args));
        }
        else if (op === OPERATIONS.DEL) {
            // del operation
            // @ts-ignore
            handleOperationPromise(id, level.del.apply(level, args));
        }
        else if (op === OPERATIONS.BATCH) {
            // batch operation
            // @ts-ignore
            handleOperationPromise(id, level.batch.apply(level, args));
        }
        else if (op === OPERATIONS.RSTREAM) {
            // read stream operation
            handleOperationStream(id, function () { return level.createReadStream.apply(level, args); });
        }
        else if (op === OPERATIONS.KSTREAM) {
            // key stream operation
            handleOperationStream(id, function () { return level.createKeyStream.apply(level, args); });
        }
        else if (op === OPERATIONS.VSTREAM) {
            // value stream operation
            handleOperationStream(id, function () { return level.createValueStream.apply(level, args); });
        }
        else if (op === OPERATIONS.DSTREAM) {
            var streamId = args[0];
            if (!streams.has(streamId)) {
                stream_write_utils_1.writeErrorChunk(resStream, id, new ReqError("stream with id does not exist: " + streamId));
            }
            else {
                // @ts-ignore
                var result = streams.get(streamId).destroy();
                stream_write_utils_1.writeResultChunk(resStream, id, result);
            }
        }
        else {
            // unknown operation
            stream_write_utils_1.writeErrorChunk(resStream, id, new ReqError("operation must be: " + opsStr));
        }
        cb();
        // utils
        function validateId(id) {
            var isValid = typeof id === 'string';
            if (!isValid) {
                stream_write_utils_1.writeErrorChunk(resStream, id, new ReqError('id must be a string'));
                cb();
                return false;
            }
            return true;
        }
        function handleOperationPromise(id, promise) {
            var p = promise
                .then(function (result) {
                stream_write_utils_1.writeResultChunk(resStream, id, result);
            })
                .catch(function (err) {
                stream_write_utils_1.writeErrorChunk(resStream, id, err);
            })
                .finally(function () {
                queries.delete(id);
            });
            queries.set(id, p);
            return p;
        }
        function handleOperationStream(id, createStream) {
            if (streams.has(id)) {
                stream_write_utils_1.writeErrorChunk(resStream, id, new ReqError("stream with id already exists: " + id));
                return;
            }
            // create dest substream
            var substream = mux.createWriteStream(id);
            // create source stream
            var stream = pumpify.obj(createStream(), encode_buffers_stream_1.default('key', 'value'));
            streams.set(id, stream);
            stream.pipe(substream);
            // handle stream events
            stream.once('end', handleEnd);
            stream.once('error', handleError);
            function handleEnd() {
                stream.removeListener('error', handleError);
                streams.delete(id);
            }
            function handleError(err) {
                stream.removeListener('end', handleEnd);
                substream.error(err.message);
                streams.delete(id);
            }
        }
    });
    // create duplex
    var duplex = duplexify_1.default.obj();
    if (!level.isOpen()) {
        inStream.pause();
        level.once('open', function () {
            duplex.setReadable(outStream);
            duplex.setWritable(inStream);
            inStream.resume();
        });
    }
    else {
        duplex.setReadable(outStream);
        duplex.setWritable(inStream);
        inStream.resume();
    }
    duplex.on('error', attemptCleanUp);
    inStream.on('end', attemptCleanUp);
    function attemptCleanUp(err) {
        if (queries.size === 0)
            return cleanUp(err);
        return Promise.all(queries.values())
            .catch(function (err) { return console.error('query error while ending', err); })
            .finally(function () { return cleanUp(err); });
    }
    function cleanUp(err) {
        inStream.destroy();
        streams.forEach(function (stream, id) {
            // @ts-ignore
            stream.destroy();
            streams.delete(id);
        });
        resStream.destroy();
        if (err) {
            outStream.emit('error', err);
        }
        else {
            outStream.end();
        }
    }
    return duplex;
}
exports.default = createLevelRPCStream;
exports.demux = function (opts, onStream) {
    if (typeof opts === 'function') {
        onStream = opts;
        opts = {};
    }
    if (onStream) {
        var _onStream_1 = onStream;
        return mux_demux_1.default(__assign({}, opts, { objectMode: true }), function (substream) {
            var stream = pumpify.obj(substream, decode_buffers_stream_1.default('key', 'value', 'result'), decode_errors_stream_1.default('error'));
            stream.id = substream.meta;
            _onStream_1(stream);
        });
    }
    return mux_demux_1.default(__assign({}, opts, { objectMode: true }));
};
var ClosedError = /** @class */ (function (_super) {
    __extends(ClosedError, _super);
    function ClosedError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ClosedError;
}(Error));
exports.ClosedError = ClosedError;
var ReqError = /** @class */ (function (_super) {
    __extends(ReqError, _super);
    function ReqError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ReqError;
}(Error));
exports.ReqError = ReqError;
