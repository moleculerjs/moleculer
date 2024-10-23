/* eslint-disable no-bitwise */

const lut: string[] = [];
for (let i = 0; i < 256; ++i) {
	lut[i] = (i < 16 ? "0" : "") + i.toString(16);
}

/**
 * Generate a UUID v4
 *
 * Based on https://jsperf.com/uuid-generator-opt/18
 * @returns {string}
 */
export function generateUUID(): string {
	const d0 = (Math.random() * 0xffffffff) | 0;
	const d1 = (Math.random() * 0xffffffff) | 0;
	const d2 = (Math.random() * 0xffffffff) | 0;
	const d3 = (Math.random() * 0xffffffff) | 0;
	return `${
		lut[d0 & 0xff] + lut[(d0 >> 8) & 0xff] + lut[(d0 >> 16) & 0xff] + lut[(d0 >> 24) & 0xff]
	}-${lut[d1 & 0xff]}${lut[(d1 >> 8) & 0xff]}-${lut[((d1 >> 16) & 0x0f) | 0x40]}${
		lut[(d1 >> 24) & 0xff]
	}-${lut[(d2 & 0x3f) | 0x80]}${lut[(d2 >> 8) & 0xff]}-${lut[(d2 >> 16) & 0xff]}${
		lut[(d2 >> 24) & 0xff]
	}${lut[d3 & 0xff]}${lut[(d3 >> 8) & 0xff]}${lut[(d3 >> 16) & 0xff]}${lut[(d3 >> 24) & 0xff]}`;
}

export function isFunction(fn: unknown): boolean {
	return typeof fn === "function";
}

export function isString(s: unknown): s is string {
	return typeof s === "string" || s instanceof String;
}

export function isObject(o: unknown): o is object {
	return o !== null && typeof o === "object" && !(o instanceof String);
}

export function isPlainObject(o: unknown): o is object {
	return o != null
		? Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null
		: false;
}

export function isDate(d: unknown): d is Date {
	return d instanceof Date && !Number.isNaN(d.getTime());
}

export function flatten<TArr>(arr: TArr[]): TArr[] {
	return arr.reduce((a, b) => a.concat(b), [] as TArr[]);
}
