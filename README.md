# wasm-webgl example

Draw a triangle with wasm & webgl;

## Run

![example](screenshots/example.jpg)

## Quick Start

### Step1

```bash
npm install
```

### Step2

edit `vite.config.ts`

```js
// ...
ViteRsw({
  crates: [
    // https://github.com/lencx/vite-plugin-rsw#plugin-options
    'wasm-webgl', // custom package name
  ]
}),
```

### Step3

```bash
npm run dev
```

## Build Prod

```bash
npm run rsw:build
```
