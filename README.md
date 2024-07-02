<div align="center">
    <img alt="node-llama-cpp Logo" src="https://raw.githubusercontent.com/withcatai/node-llama-cpp/master/assets/logo.roundEdges.png" width="360px" />
    <h1>node-llama-cpp</h1>
    <p>Run AI models locally on your machine</p>
    <sub>Pre-built bindings are provided with a fallback to building from source with cmake</sub>
    <p></p>
</div>

<div align="center" class="main-badges">

[![Build](https://github.com/withcatai/node-llama-cpp/actions/workflows/build.yml/badge.svg)](https://github.com/withcatai/node-llama-cpp/actions/workflows/build.yml)
[![License](https://badgen.net/badge/color/MIT/green?label=license)](https://www.npmjs.com/package/node-llama-cpp)
[![Types](https://badgen.net/badge/color/TypeScript/blue?label=types)](https://www.npmjs.com/package/node-llama-cpp)
[![Version](https://badgen.net/npm/v/node-llama-cpp)](https://www.npmjs.com/package/node-llama-cpp)

</div>

✨ New! [Try the beta of version `3.0.0`](https://github.com/withcatai/node-llama-cpp/pull/105) ✨ (included: function calling, automatic chat wrapper detection, embedding support, and more)

## Features
* Run a text generation model locally on your machine
* Metal, CUDA and Vulkan support
* Pre-built binaries are provided, with a fallback to building from source _**without**_ `node-gyp` or Python
* Chat with a model using a chat wrapper
* Use the CLI to chat with a model without writing any code
* Up-to-date with the latest version of `llama.cpp`. Download and compile the latest release with a single CLI command.
* Force a model to generate output in a parseable format, like JSON, or even force it to follow a specific JSON schema

## [Documentation](https://withcatai.github.io/node-llama-cpp/)
* [Getting started guide](https://withcatai.github.io/node-llama-cpp/guide/)
* [API reference](https://withcatai.github.io/node-llama-cpp/api/classes/LlamaModel)
* [CLI help](https://withcatai.github.io/node-llama-cpp/guide/cli/)
* [Changelog](https://github.com/withcatai/node-llama-cpp/releases)
* [Roadmap](https://github.com/orgs/withcatai/projects/1)

## Installation
```bash
npm install --save node-llama-cpp@beta.34
```

This package comes with pre-built binaries for macOS, Linux and Windows.

If binaries are not available for your platform, it'll fallback to download the latest version of `llama.cpp` and build it from source with `cmake`.
To disable this behavior set the environment variable `NODE_LLAMA_CPP_SKIP_DOWNLOAD` to `true`.

***Note*** the prev --cuda flag got replaced by --gpu cuda --gpu amd
```bash
npx --no node-llama-cpp download --gpu cuda
```

```
const model = new LlamaModel({
    modelPath,
    gpuLayers: 64 // or any other number of layers you want
});
```
You'll see logs like these in the console when the model loads:
```
llm_load_tensors: ggml ctx size =    0.09 MB
llm_load_tensors: using CUDA for GPU acceleration
llm_load_tensors: mem required  =   41.11 MB (+ 2048.00 MB per state)
llm_load_tensors: offloading 32 repeating layers to GPU
llm_load_tensors: offloading non-repeating layers to GPU
llm_load_tensors: offloading v cache to GPU
llm_load_tensors: offloading k cache to GPU
llm_load_tensors: offloaded 35/35 layers to GPU
llm_load_tensors: VRAM used: 4741 MB
```
On Linux, you can monitor GPU usage with this command:

````bash
watch -d nvidia-smi
```


## Usage
```typescript
import {fileURLToPath} from "url";
import path from "path";
import {getLlama, LlamaChatSession} from "node-llama-cpp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const llama = await getLlama();
const model = await llama.loadModel({
    modelPath: path.join(__dirname, "models", "dolphin-2.1-mistral-7b.Q4_K_M.gguf")
});
const context = await model.createContext();
const session = new LlamaChatSession({
    contextSequence: context.getSequence()
});


const q1 = "Hi there, how are you?";
console.log("User: " + q1);

const a1 = await session.prompt(q1);
console.log("AI: " + a1);


const q2 = "Summarize what you said";
console.log("User: " + q2);

const a2 = await session.prompt(q2);
console.log("AI: " + a2);
```

> For more examples, see the [getting started guide](https://withcatai.github.io/node-llama-cpp/guide/)

## Contributing
To contribute to `node-llama-cpp` read the [contribution guide](https://withcatai.github.io/node-llama-cpp/guide/contributing).

## Acknowledgements
* llama.cpp: [ggerganov/llama.cpp](https://github.com/ggerganov/llama.cpp)


<br />

<div align="center" width="360">
    <img alt="Star please" src="https://raw.githubusercontent.com/withcatai/node-llama-cpp/master/assets/star.please.roundEdges.png" width="360" margin="auto" />
    <br/>
    <p align="right">
        <i>If you like this repo, star it ✨</i>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
    </p>
</div>
