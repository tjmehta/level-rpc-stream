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
            // decode buffer keys
            keys.forEach(function (key) {
                if (chunk[key] && chunk[key].__err__) {
                    chunk[key] = decodeError(chunk[key]);
                }
            });
        }
        cb(null, chunk);
    });
});
function decodeError(obj) {
    var err = new Error(obj.__err__.message);
    err.name = obj.__err__.name;
    delete err.stack;
    return err;
}
