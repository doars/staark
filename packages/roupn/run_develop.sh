#!/bin/bash

cd "$(dirname "$0")"

(
  bun run develop
) & (
  bun run start:example
)

# Wait for all background processes to complete.
wait
