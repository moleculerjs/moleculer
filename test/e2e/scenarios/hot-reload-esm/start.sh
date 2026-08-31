#!/bin/bash

echo "Start hot-reload-esm scenario...";
echo "Transporter: $TRANSPORTER";
echo "Serializer: $SERIALIZER";
echo "Discoverer: $DISCOVERER";

export NAMESPACE=hot-reload-esm;
node ../../../../bin/moleculer-runner.mjs --hot \
    --config moleculer.config.mjs \
    --mask "**/*.service.mjs" \
    services & \
node scenario.js
