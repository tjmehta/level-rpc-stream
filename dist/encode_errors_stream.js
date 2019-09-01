"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var through2_1 = __importDefault(require("through2"));
exports.default = (function () {
    var keys = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        keys[_i] = arguments[_i];
    }
    return through2_1.default.obj(function (chunk, enc, cb) {
        if (typeof chunk === 'object') {
            // encode error keys
            keys.forEach(function (key) {
                if (chunk[key] instanceof Error) {
                    chunk[key] = encodeError(chunk[key]);
                }
            });
        }
        cb(null, chunk);
    });
});
function encodeError(err) {
    return {
        __err__: {
            name: err.name,
            message: err.message,
        },
    };
}
