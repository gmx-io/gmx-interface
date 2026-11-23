FROM rust:1.90.0-bookworm@sha256:3914072ca0c3b8aad871db9169a651ccfce30cf58303e5d6f2db16d1d8a7e58f

RUN rustup target add wasm32-unknown-unknown --toolchain 1.90.0 \
    && rustup toolchain install 1.91.0 --profile minimal \
    && cargo +1.91.0 install wasm-pack --version 0.15.1 --locked

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENTRYPOINT ["node", "scripts/build-gmsol-sdk.mjs"]
