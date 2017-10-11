/* eslint-disable no-console */

"use strict";

const amqp = require("amqplib");
const Promise = require("bluebird");

const URI = process.env.AMQP_URI || "amqp://guest:guest@localhost:5672";

// Trying to delete a non-existant queue or exchange would cause a channel error.
// Using a new channel for each operation allows us to reliably clear out AMQP queues and exchanges.
const useNewChannel = (connection, cb) => {
	let channelRef = { close: () => {} };

	return connection.createChannel()
		.then((channel) => {
			channelRef = channel;
			channel.on("error", () => {});
			return cb(channel);
		})
		.catch(() => {})
		.then(() => channelRef.close())
		.catch(() => {});
};

const clearQueue = connection => q =>
	useNewChannel(connection, channel => channel.purgeQueue(q));
const deleteQueue = connection => q =>
	useNewChannel(connection, channel => channel.deleteQueue(q));
const deleteExchange = connection => e =>
	useNewChannel(connection, channel => channel.deleteExchange(e));

module.exports = function({ queues, exchanges }, destroy = false) {
	return amqp.connect(URI)
		.then((connection) => {
			const donePromise = destroy
				? Promise.all(
					queues.map(deleteQueue(connection)).concat(exchanges.map(deleteExchange(connection)))
				)
				: Promise.all(queues.map(clearQueue(connection)));

			return donePromise
				.then(() => connection.close())
				.catch(() => {});
		});
};
