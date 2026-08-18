#!/bin/bash

mkdir -p build
ags bundle src/app.ts build/bitshell

mkdir -p $HOME/.local/bin
cp build/bitshell $HOME/.local/bin
