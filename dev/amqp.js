/* eslint-disable no-console */

"use strict";

let q = "tasks";

let open = require("amqplib").connect("amqp://192.168.0.207");

// Publisher
open.then(function (conn) {
	return conn.createChannel();
}).then(function (ch) {
	return ch.assertQueue(q).then(function () {
		return ch.sendToQueue(q, Buffer.from("something to do"));
	});
}).catch(console.warn);

// Consumer
open.then(function (conn) {
	return conn.createChannel();
}).then(function (ch) {
	return ch.assertQueue(q).then(function (ok) {
		return ch.consume(q, function (msg) {
			if (msg !== null) {
				console.log(msg.content.toString());
				ch.ack(msg);
			}
		});
	});
}).catch(console.warn);
