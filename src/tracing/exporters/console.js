"use strict";

const _ 			= require("lodash");
const r 			= _.repeat;
const chalk 		= require("chalk");
const humanize 		= require("tiny-human-time").short;
const slice 		= require("slice-ansi");

const BaseTraceExporter = require("./base");

/**
 * Console Trace Exporter only for debugging
 *
 * @class ConsoleTraceExporter
 */
class ConsoleTraceExporter extends BaseTraceExporter {

	/**
	 * Creates an instance of ConsoleTraceExporter.
	 * @param {Object?} opts
	 * @memberof ConsoleTraceExporter
	 */
	constructor(opts) {
		super(opts);

		this.opts = _.defaultsDeep(this.opts, {
			logger: null,
			colors: true,
			width: 100,
			gaugeWidth: 40
		});
		chalk.enabled = this.opts.colors;

		this.spans = {};
	}

	/**
	 * Initialize Trace Exporter.
	 *
	 * @param {Tracer} tracer
	 * @memberof ConsoleTraceExporter
	 */
	init(tracer) {
		this.tracer = tracer;
		this.logger = this.opts.logger || this.tracer.logger;
	}

	/**
	 * Span is started.
	 *
	 * @param {Span} span
	 * @memberof ConsoleTraceExporter
	 */
	startSpan(span) {
		this.spans[span.id] = {
			span,
			children: []
		};

		if (span.parentID) {
			const parentItem = this.spans[span.parentID];
			if (parentItem)
				parentItem.children.push(span.id);
		}
	}

	/**
	 * Span is finished.
	 *
	 * @param {Span} span
	 * @memberof ConsoleTraceExporter
	 */
	finishSpan(span) {
		if (!this.spans[span.parentID]) {
			this.printRequest(span.id);

			// TODO: remove old printed requests
		}
	}

	drawTableTop() {
		return chalk.grey("┌" + r("─", this.opts.width - 2) + "┐");
	}

	drawHorizonalLine() {
		return chalk.grey("├" + r("─", this.opts.width - 2) + "┤");
	}

	drawLine(text) {
		return chalk.grey("│ ") + text + chalk.grey(" │");
	}

	drawTableBottom() {
		return chalk.grey("└" + r("─", this.opts.width - 2) + "┘");
	}

	drawAlignedTexts(leftStr, rightStr, width) {
		const ll = leftStr.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").length; // eslint-disable-line
		const rl = rightStr.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "").length; // eslint-disable-line

		const space = width - rl;

		let left;
		if (ll <= space)
			left = leftStr + r(" ", space - ll);
		else {
			left = slice(leftStr, 0, Math.max(space - 3, 0));
			left += r(".", Math.min(3, space));
		}

		return left + rightStr;
	}

	drawGauge(gstart, gstop) {
		const gw = this.opts.gaugeWidth;
		const p1 = Math.floor(gw * gstart / 100);
		const p2 = Math.max(Math.floor(gw * gstop / 100) - p1, 1);
		const p3 = Math.max(gw - (p1 + p2), 0);

		return [
			chalk.grey("["),
			chalk.grey(r(".", p1)),
			r("■", p2),
			chalk.grey(r(".", p3)),
			chalk.grey("]")
		].join("");
	}

	getCaption(span) {
		let caption = span.name;

		if (span.tags.fromCache)
			caption += " *";
		if (span.tags.remoteCall)
			caption += " »";
		if (span.tags.error)
			caption += " ×";

		return caption;
	}

	getColor(span) {
		let c = chalk.bold;
		if (span.tags.fromCache)
			c = chalk.yellow;
		if (span.tags.remoteCall)
			c = chalk.cyan;
		if (span.tags.duration == null)
			c = chalk.grey;
		if (span.tags.error)
			c = chalk.red.bold;

		return c;
	}

	getTraceInfo(main) {
		let depth = 0;
		let total = 0;
		let check = (item, level) => {
			total++;
			if (level > depth)
				depth = level;

			if (item.children.length > 0)
				item.children.forEach(spanID => check(this.spans[spanID], level + 1));
		};

		check(main, 1);

		return { depth, total };
	}

	/**
	 * Print a span row
	 *
	 * @param {Object} span
	 * @param {Object} main
	 */
	printSpanTime(spanItem, mainItem, level) {
		const span = spanItem.span;
		const mainSpan = mainItem.span;
		const margin = 2 * 2;
		const w = (this.opts.width || 80) - margin;
		const gw = this.opts.gaugeWidth || 40;

		const time = span.duration == null ? "?" : humanize(span.duration);
		const caption = r("  ", level - 1) + this.getCaption(span);
		const info = this.drawAlignedTexts(caption, " " + time, w - gw - 3);

		const startTime = span.startTime || mainSpan.startTime;
		const finishTime = span.finishTime || mainSpan.finishTime;

		let gstart = (startTime - mainSpan.startTime) / (mainSpan.finishTime - mainSpan.startTime) * 100;
		let gstop = (finishTime - mainSpan.startTime) / (mainSpan.finishTime - mainSpan.startTime) * 100;

		if (_.isNaN(gstart) && _.isNaN(gstop)) {
			gstart = 0;
			gstop = 100;
		}
		if (gstop > 100)
			gstop = 100;

		const c = this.getColor(span);
		this.logger.info(this.drawLine(c(info + " " + this.drawGauge(gstart, gstop))));

		if (spanItem.children.length > 0)
			spanItem.children.forEach(spanID => this.printSpanTime(this.spans[spanID], mainItem, level + 1));
	}

	/**
	 * Print request traces
	 *
	 * @param {String} id
	 */
	printRequest(id) {
		const main = this.spans[id];
		const margin = 2 * 2;
		const w = (this.opts.width || 80) - margin;

		this.logger.info(this.drawTableTop());

		const { total, depth } = this.getTraceInfo(main);

		const headerLeft = chalk.grey("ID: ") + chalk.bold(id);
		const headerRight = chalk.grey("Depth: ") + chalk.bold(depth) + " " + chalk.grey("Total: ") + chalk.bold(total);
		const line = this.drawAlignedTexts(headerLeft, " " + headerRight, w);
		this.logger.info(this.drawLine(line));

		this.logger.info(this.drawHorizonalLine());

		this.printSpanTime(main, main, 1);

		this.logger.info(this.drawTableBottom());
	}
}

module.exports = ConsoleTraceExporter;
