#!/bin/bash

echo "Start hot-reload-cjs scenario...";
echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
echo "Discoverer: $DISCOVERER";

export NAMESPACE=hot-reload-cjs;
node ../../../../bin/moleculer-runner.js --hot --config moleculer.config.js services & \
node scenario.js
