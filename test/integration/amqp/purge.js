/* eslint-disable no-console */

"use strict";

const amqp = require("amqplib");
const Promise = require("bluebird");

const connectionPromise = amqp.connect(process.env.AMQP_URI || "amqp://guest:guest@localhost:5672");

// Trying to delete a non-existant queue or exchange would cause a channel error.
// Using a new channel for each operation allows us to reliably clear out AMQP queues and exchanges.

const useNewChannel = (cb) => {
	let channelRef = { close: () => {} };

	return connectionPromise
		.then(connection => connection.createChannel())
		.then((channel) => {
			channelRef = channel;
			channel.on("error", () => {});
			return cb(channel);
		})
		.catch(() => {})
		.then(() => channelRef.close())
		.catch(() => {});
};

const clearQueue = (q) => useNewChannel(channel => channel.purgeQueue(q));
const deleteQueue = (q) => useNewChannel(channel => channel.deleteQueue(q));
const deleteExchange = (e) => useNewChannel(channel => channel.deleteExchange(e));

module.exports = function({ queues, exchanges }, destroy = false) {
	const donePromise = destroy
		? Promise.all(queues.map(deleteQueue).concat(exchanges.map(deleteExchange)))
		: Promise.all(queues.map(clearQueue));

	return donePromise.delay(2000);
};
