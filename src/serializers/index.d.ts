import Serializer = require("./base");
import JSONSerializer = require("./json");
import JSONExtSerializer = require("./json-extended");
import MsgPackSerializer = require("./msgpack");
import NotepackSerializer = require("./notepack");
import CborSerializer = require("./cbor");

export {
	Serializer as Base,
	JSONSerializer as JSON,
	JSONExtSerializer as JSONExt,
	MsgPackSerializer as MsgPack,
	NotepackSerializer as Notepack,
	CborSerializer as CBOR
};

export declare function resolve(opt: Record<string, any> | string | boolean): Serializer;
export declare function register(name: string, value: Serializer): void;
