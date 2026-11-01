#!/usr/bin/env bash

# make sure $HOME/.local/bin is in your $PATH !!

mkdir -p out 
ags bundle src/app.ts out/bited

mkdir -p $HOME/.local/bin
cp out/bited $HOME/.local/bin
cp bitedctl $HOME/.local/bin
