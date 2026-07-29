#!/bin/bash

cd "$(dirname "$0")"

(
  npm run develop
) & (
  npm run start:example
)

# Wait for all background processes to complete.
wait
