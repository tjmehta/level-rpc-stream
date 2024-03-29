"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.write = function (stream, chunk) {
    return stream.write(chunk);
};
exports.writeResultChunk = function (stream, id, result) {
    return exports.write(stream, {
        id: id,
        result: result,
    });
};
exports.writeErrorChunk = function (stream, id, err) {
    return exports.write(stream, {
        id: id,
        error: err,
    });
};
