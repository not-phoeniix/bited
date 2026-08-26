#!/bin/bash

mkdir -p build
ags bundle src/app.ts build/bited

mkdir -p $HOME/.local/bin
cp build/bited $HOME/.local/bin
