"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.write = function (stream, chunk) {
    return stream.write(chunk);
};
exports.writeResultChunk = function (stream, id, result) {
    if (Buffer.isBuffer(result)) {
        var buff = result;
        result = {
            __buff__: buff.toString('base64'),
        };
    }
    exports.write(stream, {
        id: id,
        result: result,
    });
};
exports.writeErrorChunk = function (stream, id, err) {
    return exports.write(stream, {
        id: id,
        error: {
            message: err.message,
            name: err.name,
        },
    });
};
