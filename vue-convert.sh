#!/bin/bash

node_modules/.bin/ts-node --project tsconfig.json src/cli.ts "$@"
