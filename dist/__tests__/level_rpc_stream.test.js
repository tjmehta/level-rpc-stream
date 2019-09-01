"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var level_rpc_stream_1 = require("../level_rpc_stream");
var level_rpc_stream_2 = __importStar(require("../level_rpc_stream"));
var stream_1 = require("stream");
var level_1 = __importDefault(require("level"));
var p_defer_1 = __importDefault(require("p-defer"));
var through2_1 = __importDefault(require("through2"));
jest.setTimeout(100);
jest.mock('level', function () { return function () {
    // imports
    var EventEmitter = require('events').EventEmitter;
    // variables
    var level = new EventEmitter();
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
    });
}; });
describe('createLevelRPCStream', function () {
    var ctx;
    beforeEach(function () {
        ctx = {};
        ctx.mockLevel = level_1.default('fake');
    });
    describe('leveldb is closed', function () {
        beforeEach(function () {
            ctx.mockLevel.isOpen.mockReturnValue(false);
            ctx.mockLevel.isClosed.mockReturnValue(true);
        });
        it('should create a stream', function () {
            var stream = level_rpc_stream_2.default(ctx.mockLevel);
            expect(stream).toBeInstanceOf(stream_1.Stream);
        });
    });
    describe('leveldb is open', function () {
        beforeEach(function () {
            ctx.mockLevel.isOpen.mockReturnValue(true);
            ctx.mockLevel.isClosed.mockReturnValue(false);
        });
        it('should create a stream', function () {
            var stream = level_rpc_stream_2.default(ctx.mockLevel);
            expect(stream).toBeInstanceOf(stream_1.Stream);
        });
        describe('mocked level put', function () {
            beforeEach(function () {
                ctx.deferred = p_defer_1.default();
                ctx.mockLevel.put.mockImplementation(function () { return ctx.deferred.promise; });
            });
            describe('level put error', function () {
                beforeEach(function () {
                    ctx.deferred.reject(new Error('boom'));
                });
                it('should reject w/ error', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.PUT,
                                        args: ['key', 'val'],
                                    })];
                            case 1:
                                result = _a.sent();
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"error\": [Error: boom],\n              \"id\": \"id\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe('level put resolves', function () {
                beforeEach(function () {
                    ctx.deferred.resolve('value');
                });
                it('should resolve w/ result', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, args, result;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                args = ['key', 'val'];
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.PUT,
                                        args: args,
                                    })];
                            case 1:
                                result = _b.sent();
                                (_a = expect(ctx.mockLevel.put)).toHaveBeenCalledWith.apply(_a, args);
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"id\": \"id\",\n              \"result\": \"value\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe('mocked level get', function () {
            beforeEach(function () {
                ctx.deferred = p_defer_1.default();
                ctx.mockLevel.get.mockImplementation(function () { return ctx.deferred.promise; });
            });
            describe('end tests', function () {
                it('should end duplex on end after queries complete', function (done) {
                    var count = 0;
                    var stream = level_rpc_stream_2.default(ctx.mockLevel);
                    var out = through2_1.default.obj();
                    stream.pipe(out.resume());
                    out.on('end', checkDone);
                    writePromise(stream, {
                        id: 'id',
                        op: level_rpc_stream_1.OPERATIONS.GET,
                        args: ['key'],
                    }).then(checkDone);
                    setTimeout(function () {
                        stream.end();
                    }, 0);
                    setTimeout(function () {
                        ctx.deferred.resolve('value');
                    }, 10);
                    function checkDone() {
                        count++;
                        if (count === 2)
                            done();
                    }
                });
            });
            describe('level get error', function () {
                beforeEach(function () {
                    ctx.deferred.reject(new Error('boom'));
                });
                it('should reject w/ error', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.GET,
                                        args: ['key'],
                                    })];
                            case 1:
                                result = _a.sent();
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"error\": [Error: boom],\n              \"id\": \"id\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe('level get resolves', function () {
                beforeEach(function () {
                    ctx.deferred.resolve('value');
                });
                it('should resolve w/ result', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, args, result;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                args = ['key'];
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.GET,
                                        args: args,
                                    })];
                            case 1:
                                result = _b.sent();
                                (_a = expect(ctx.mockLevel.get)).toHaveBeenCalledWith.apply(_a, args);
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"id\": \"id\",\n              \"result\": \"value\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe('level get resolves (buffer)', function () {
                beforeEach(function () {
                    ctx.deferred.resolve(Buffer.from('valu2'));
                });
                it('should resolve w/ result', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, args, res;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                args = ['key'];
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.GET,
                                        args: args,
                                    })];
                            case 1:
                                res = _b.sent();
                                (_a = expect(ctx.mockLevel.get)).toHaveBeenCalledWith.apply(_a, args);
                                // @ts-ignore
                                expect(res.result).toBeInstanceOf(Buffer);
                                expect(res).toMatchInlineSnapshot("\n            Object {\n              \"id\": \"id\",\n              \"result\": Object {\n                \"data\": Array [\n                  118,\n                  97,\n                  108,\n                  117,\n                  50,\n                ],\n                \"type\": \"Buffer\",\n              },\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe('mocked level del', function () {
            beforeEach(function () {
                ctx.deferred = p_defer_1.default();
                ctx.mockLevel.del.mockImplementation(function () { return ctx.deferred.promise; });
            });
            describe('level del error', function () {
                beforeEach(function () {
                    ctx.deferred.reject(new Error('boom'));
                });
                it('should reject w/ error', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.DEL,
                                        args: ['key'],
                                    })];
                            case 1:
                                result = _a.sent();
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"error\": [Error: boom],\n              \"id\": \"id\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe('level del resolves', function () {
                beforeEach(function () {
                    ctx.deferred.resolve();
                });
                it('should resolve w/ result', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, args, result;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                args = ['key'];
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.DEL,
                                        args: args,
                                    })];
                            case 1:
                                result = _b.sent();
                                (_a = expect(ctx.mockLevel.del)).toHaveBeenCalledWith.apply(_a, args);
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"id\": \"id\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe('mocked level batch', function () {
            beforeEach(function () {
                ctx.deferred = p_defer_1.default();
                ctx.mockLevel.batch.mockImplementation(function () { return ctx.deferred.promise; });
                ctx.args = [
                    [
                        { type: 'del', key: 'father' },
                        { type: 'put', key: 'name', value: 'Yuri Irsenovich Kim' },
                        { type: 'put', key: 'dob', value: '16 February 1941' },
                        { type: 'put', key: 'spouse', value: 'Kim Young-sook' },
                        { type: 'put', key: 'occupation', value: 'Clown' },
                    ],
                ];
            });
            describe('level batch error', function () {
                beforeEach(function () {
                    ctx.deferred.reject(new Error('boom'));
                });
                it('should reject w/ error', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, result;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.BATCH,
                                        args: ctx.args,
                                    })];
                            case 1:
                                result = _a.sent();
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"error\": [Error: boom],\n              \"id\": \"id\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
            describe('level batch resolves', function () {
                beforeEach(function () {
                    ctx.deferred.resolve();
                });
                it('should resolve w/ result', function () { return __awaiter(_this, void 0, void 0, function () {
                    var stream, result;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                stream = level_rpc_stream_2.default(ctx.mockLevel);
                                return [4 /*yield*/, writePromise(stream, {
                                        id: 'id',
                                        op: level_rpc_stream_1.OPERATIONS.BATCH,
                                        args: ctx.args,
                                    })];
                            case 1:
                                result = _b.sent();
                                (_a = expect(ctx.mockLevel.batch)).toHaveBeenCalledWith.apply(_a, ctx.args);
                                expect(result).toMatchInlineSnapshot("\n            Object {\n              \"id\": \"id\",\n            }\n          ");
                                return [2 /*return*/];
                        }
                    });
                }); });
            });
        });
        describe('mocked level createReadStream', function () {
            beforeEach(function () {
                ctx.mockReadStream = through2_1.default.obj();
                ctx.mockLevel.createReadStream.mockReturnValue(ctx.mockReadStream);
                ctx.args = [{ gte: 'foo' }];
            });
            it('should forward data events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, expectedResult, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'data');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.RSTREAM,
                                args: ctx.args,
                            });
                            expectedResult = {
                                key: 'key',
                                val: 'val',
                            };
                            ctx.mockReadStream.write(expectedResult);
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            result = _b.sent();
                            (_a = expect(ctx.mockLevel.createReadStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(result).toEqual(expectedResult);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should forward error events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, err;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'error');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.RSTREAM,
                                args: ctx.args,
                            });
                            // mock event
                            ctx.mockReadStream.emit('error', new Error('boom'));
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            err = _b.sent();
                            (_a = expect(ctx.mockLevel.createReadStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(err).toBeInstanceOf(Error);
                            expect(err.message).toMatch(/boom/);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should forward end events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'end');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.RSTREAM,
                                args: ctx.args,
                            });
                            // mock event
                            ctx.mockReadStream.write('hello');
                            ctx.mockReadStream.end();
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            result = _b.sent();
                            (_a = expect(ctx.mockLevel.createReadStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(result).toBeUndefined();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe('mocked level createKeyStream', function () {
            beforeEach(function () {
                ctx.mockReadStream = through2_1.default.obj();
                ctx.mockLevel.createKeyStream.mockReturnValue(ctx.mockReadStream);
                ctx.args = [{ gte: 'foo' }];
            });
            it('should forward data events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, expectedResult, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'data');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.KSTREAM,
                                args: ctx.args,
                            });
                            expectedResult = 'key';
                            ctx.mockReadStream.write(expectedResult);
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            result = _b.sent();
                            (_a = expect(ctx.mockLevel.createKeyStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(result).toEqual(expectedResult);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should forward error events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, err;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'error');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.KSTREAM,
                                args: ctx.args,
                            });
                            // mock event
                            ctx.mockReadStream.emit('error', new Error('boom'));
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            err = _b.sent();
                            (_a = expect(ctx.mockLevel.createKeyStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(err).toBeInstanceOf(Error);
                            expect(err.message).toMatch(/boom/);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should forward end events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'end');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.KSTREAM,
                                args: ctx.args,
                            });
                            // mock event
                            ctx.mockReadStream.write('hello');
                            ctx.mockReadStream.end();
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            result = _b.sent();
                            (_a = expect(ctx.mockLevel.createKeyStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(result).toBeUndefined();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe('mocked level createValueStream', function () {
            beforeEach(function () {
                ctx.mockReadStream = through2_1.default.obj();
                ctx.mockLevel.createValueStream.mockReturnValue(ctx.mockReadStream);
                ctx.args = [{ gte: 'foo' }];
            });
            it('should forward data events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, expectedResult, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'data');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.VSTREAM,
                                args: ctx.args,
                            });
                            expectedResult = 'val';
                            ctx.mockReadStream.write(expectedResult);
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            result = _b.sent();
                            (_a = expect(ctx.mockLevel.createValueStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(result).toEqual(expectedResult);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should forward error events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, err;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'error');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.VSTREAM,
                                args: ctx.args,
                            });
                            // mock event
                            ctx.mockReadStream.emit('error', new Error('boom'));
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            err = _b.sent();
                            (_a = expect(ctx.mockLevel.createValueStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(err).toBeInstanceOf(Error);
                            expect(err.message).toMatch(/boom/);
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should forward end events', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, eventPromise, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            eventPromise = onSubstreamEvent(stream, reqId, 'end');
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.VSTREAM,
                                args: ctx.args,
                            });
                            // mock event
                            ctx.mockReadStream.write('hello');
                            ctx.mockReadStream.end();
                            return [4 /*yield*/, eventPromise];
                        case 1:
                            result = _b.sent();
                            (_a = expect(ctx.mockLevel.createValueStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(result).toBeUndefined();
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should destroy a stream', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            stream.write({
                                id: reqId,
                                op: level_rpc_stream_1.OPERATIONS.VSTREAM,
                                args: ctx.args,
                            });
                            return [4 /*yield*/, writePromise(stream, {
                                    id: reqId + 2,
                                    op: level_rpc_stream_1.OPERATIONS.DSTREAM,
                                    args: [reqId],
                                }, true)];
                        case 1:
                            result = _b.sent();
                            (_a = expect(ctx.mockLevel.createValueStream)).toHaveBeenCalledWith.apply(_a, ctx.args);
                            expect(result).toMatchInlineSnapshot("\n          Object {\n            \"id\": \"id2\",\n          }\n        ");
                            return [2 /*return*/];
                    }
                });
            }); });
            it('should not destroy a non-existant stream', function () { return __awaiter(_this, void 0, void 0, function () {
                var stream, reqId, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            stream = level_rpc_stream_2.default(ctx.mockLevel);
                            reqId = 'id';
                            return [4 /*yield*/, writePromise(stream, {
                                    id: reqId,
                                    op: level_rpc_stream_1.OPERATIONS.DSTREAM,
                                    args: ['nonExistantStreamId'],
                                })];
                        case 1:
                            result = _a.sent();
                            expect(result).toMatchInlineSnapshot("\n          Object {\n            \"error\": [Error: stream with id does not exist: nonExistantStreamId],\n            \"id\": \"id\",\n          }\n        ");
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        describe('end tests', function () {
            it('should end duplex on end', function (done) {
                var stream = level_rpc_stream_2.default(ctx.mockLevel);
                var out = through2_1.default.obj();
                stream.pipe(out.resume());
                out.on('end', done);
                setTimeout(function () {
                    stream.write({});
                    stream.end();
                }, 0);
            });
        });
    });
});
function onSubstreamEvent(stream, substreamId, event) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    stream.pipe(level_rpc_stream_2.demux(function (substream) {
                        var name = substream.meta;
                        if (name === level_rpc_stream_1.RESPONSE_SUBSTREAM_ID)
                            return;
                        if (name !== substreamId) {
                            console.warn('onSubstreamEvent: unknown substream', name);
                            return;
                        }
                        substream.on(event, resolve);
                        substream.resume();
                    }));
                })];
        });
    });
}
function writePromise(stream, data, hasStreams) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    stream.pipe(level_rpc_stream_2.demux(function (substream) {
                        var name = substream.meta;
                        if (!hasStreams && name !== level_rpc_stream_1.RESPONSE_SUBSTREAM_ID) {
                            console.warn('writePromise: unknown substream', name);
                            return;
                        }
                        substream.on('data', resolve);
                        substream.on('error', reject);
                    }));
                    stream.write(data);
                })];
        });
    });
}
