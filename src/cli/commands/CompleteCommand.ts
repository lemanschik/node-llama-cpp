import * as readline from "readline";
import process from "process";
import path from "path";
import {CommandModule} from "yargs";
import chalk from "chalk";
import fs from "fs-extra";
import {getLlama} from "../../bindings/getLlama.js";
import {
    BuildGpu, LlamaLogLevel, LlamaLogLevelGreaterThan, nodeLlamaCppGpuOptions, parseNodeLlamaCppGpuOption
} from "../../bindings/types.js";
import {LlamaCompletion} from "../../evaluator/LlamaCompletion.js";
import withOra from "../../utils/withOra.js";
import {TokenMeter} from "../../evaluator/TokenMeter.js";
import {printInfoLine} from "../utils/printInfoLine.js";
import {printCommonInfoLines} from "../utils/printCommonInfoLines.js";
import {resolveCommandGgufPath} from "../utils/resolveCommandGgufPath.js";
import {withProgressLog} from "../../utils/withProgressLog.js";
import {resolveHeaderFlag} from "../utils/resolveHeaderFlag.js";
import {withCliCommandDescriptionDocsUrl} from "../utils/withCliCommandDescriptionDocsUrl.js";
import {documentationPageUrls} from "../../config.js";

type CompleteCommand = {
    modelPath?: string,
    header?: string[],
    gpu?: BuildGpu | "auto",
    systemInfo: boolean,
    text?: string,
    textFile?: string,
    contextSize?: number,
    batchSize?: number,
    threads: number,
    temperature: number,
    minP: number,
    topK: number,
    topP: number,
    gpuLayers?: number,
    repeatPenalty: number,
    lastTokensRepeatPenalty: number,
    penalizeRepeatingNewLine: boolean,
    repeatFrequencyPenalty?: number,
    repeatPresencePenalty?: number,
    maxTokens: number,
    debug: boolean,
    meter: boolean,
    printTimings: boolean
};

export const CompleteCommand: CommandModule<object, CompleteCommand> = {
    command: "complete [modelPath]",
    describe: withCliCommandDescriptionDocsUrl(
        "Generate a completion for a given text",
        documentationPageUrls.CLI.Complete
    ),
    builder(yargs) {
        return yargs
            .option("modelPath", {
                alias: ["m", "model", "path", "url"],
                type: "string",
                description: "Llama model file to use for the completion. Can be a path to a local file or a URL of a model file to download"
            })
            .option("header", {
                alias: ["H"],
                type: "string",
                array: true,
                description: "Headers to use when downloading a model from a URL, in the format `key: value`. You can pass this option multiple times to add multiple headers."
            })
            .option("gpu", {
                type: "string",

                // yargs types don't support passing `false` as a choice, although it is supported by yargs
                choices: nodeLlamaCppGpuOptions as any as Exclude<typeof nodeLlamaCppGpuOptions[number], false>[],
                coerce: (value) => {
                    if (value == null || value == "")
                        return undefined;

                    return parseNodeLlamaCppGpuOption(value);
                },
                defaultDescription: "Uses the latest local build, and fallbacks to \"auto\"",
                description: "Compute layer implementation type to use for llama.cpp. If omitted, uses the latest local build, and fallbacks to \"auto\""
            })
            .option("systemInfo", {
                alias: "i",
                type: "boolean",
                default: false,
                description: "Print llama.cpp system info"
            })
            .option("text", {
                type: "string",
                description: "First text to automatically start generating completion for"
            })
            .option("textFile", {
                type: "string",
                description: "Path to a file to load text from and use as the first text to automatically start generating completion for"
            })
            .option("contextSize", {
                alias: "c",
                type: "number",
                description: "Context size to use for the model context",
                default: -1,
                defaultDescription: "Automatically determined based on the available VRAM"
            })
            .option("batchSize", {
                alias: "b",
                type: "number",
                description: "Batch size to use for the model context. The default value is the context size"
            })
            .option("threads", {
                type: "number",
                default: 6,
                description: "Number of threads to use for the evaluation of tokens"
            })
            .option("temperature", {
                alias: "t",
                type: "number",
                default: 0,
                description: "Temperature is a hyperparameter that controls the randomness of the generated text. It affects the probability distribution of the model's output tokens. A higher temperature (e.g., 1.5) makes the output more random and creative, while a lower temperature (e.g., 0.5) makes the output more focused, deterministic, and conservative. The suggested temperature is 0.8, which provides a balance between randomness and determinism. At the extreme, a temperature of 0 will always pick the most likely next token, leading to identical outputs in each run. Set to `0` to disable."
            })
            .option("minP", {
                alias: "mp",
                type: "number",
                default: 0,
                description: "From the next token candidates, discard the percentage of tokens with the lowest probability. For example, if set to `0.05`, 5% of the lowest probability tokens will be discarded. This is useful for generating more high-quality results when using a high temperature. Set to a value between `0` and `1` to enable. Only relevant when `temperature` is set to a value greater than `0`."
            })
            .option("topK", {
                alias: "k",
                type: "number",
                default: 40,
                description: "Limits the model to consider only the K most likely next tokens for sampling at each step of sequence generation. An integer number between `1` and the size of the vocabulary. Set to `0` to disable (which uses the full vocabulary). Only relevant when `temperature` is set to a value greater than 0."
            })
            .option("topP", {
                alias: "p",
                type: "number",
                default: 0.95,
                description: "Dynamically selects the smallest set of tokens whose cumulative probability exceeds the threshold P, and samples the next token only from this set. A float number between `0` and `1`. Set to `1` to disable. Only relevant when `temperature` is set to a value greater than `0`."
            })
            .option("gpuLayers", {
                alias: "gl",
                type: "number",
                description: "number of layers to store in VRAM",
                default: -1,
                defaultDescription: "Automatically determined based on the available VRAM"
            })
            .option("repeatPenalty", {
                alias: "rp",
                type: "number",
                default: 1.1,
                description: "Prevent the model from repeating the same token too much. Set to `1` to disable."
            })
            .option("lastTokensRepeatPenalty", {
                alias: "rpn",
                type: "number",
                default: 64,
                description: "Number of recent tokens generated by the model to apply penalties to repetition of"
            })
            .option("penalizeRepeatingNewLine", {
                alias: "rpnl",
                type: "boolean",
                default: true,
                description: "Penalize new line tokens. set `--no-penalizeRepeatingNewLine` or `--no-rpnl` to disable"
            })
            .option("repeatFrequencyPenalty", {
                alias: "rfp",
                type: "number",
                description: "For n time a token is in the `punishTokens` array, lower its probability by `n * repeatFrequencyPenalty`. Set to a value between `0` and `1` to enable."
            })
            .option("repeatPresencePenalty", {
                alias: "rpp",
                type: "number",
                description: "Lower the probability of all the tokens in the `punishTokens` array by `repeatPresencePenalty`. Set to a value between `0` and `1` to enable."
            })
            .option("maxTokens", {
                alias: "mt",
                type: "number",
                default: 0,
                description: "Maximum number of tokens to generate in responses. Set to `0` to disable. Set to `-1` to set to the context size"
            })
            .option("debug", {
                alias: "d",
                type: "boolean",
                default: false,
                description: "Print llama.cpp info and debug logs"
            })
            .option("meter", {
                type: "boolean",
                default: false,
                description: "Log how many tokens were used as input and output for each response"
            })
            .option("printTimings", {
                alias: "pt",
                type: "boolean",
                default: false,
                description: "Print llama.cpp timings after each response"
            });
    },
    async handler({
        modelPath, header, gpu, systemInfo, text, textFile, contextSize, batchSize,
        threads, temperature, minP, topK,
        topP, gpuLayers, repeatPenalty, lastTokensRepeatPenalty, penalizeRepeatingNewLine,
        repeatFrequencyPenalty, repeatPresencePenalty, maxTokens,
        debug, meter, printTimings
    }) {
        try {
            await RunCompletion({
                modelPath, header, gpu, systemInfo, text, textFile, contextSize, batchSize,
                threads, temperature, minP, topK, topP, gpuLayers, lastTokensRepeatPenalty,
                repeatPenalty, penalizeRepeatingNewLine, repeatFrequencyPenalty, repeatPresencePenalty, maxTokens,
                debug, meter, printTimings
            });
        } catch (err) {
            await new Promise((accept) => setTimeout(accept, 0)); // wait for logs to finish printing
            console.error(err);
            process.exit(1);
        }
    }
};


async function RunCompletion({
    modelPath: modelArg, header: headerArg, gpu, systemInfo, text, textFile, contextSize, batchSize,
    threads, temperature, minP, topK, topP, gpuLayers,
    lastTokensRepeatPenalty, repeatPenalty, penalizeRepeatingNewLine, repeatFrequencyPenalty, repeatPresencePenalty,
    maxTokens, debug, meter, printTimings
}: CompleteCommand) {
    if (contextSize === -1) contextSize = undefined;
    if (gpuLayers === -1) gpuLayers = undefined;

    const headers = resolveHeaderFlag(headerArg);

    if (debug)
        console.info(`${chalk.yellow("Log level:")} debug`);

    const llamaLogLevel = debug
        ? LlamaLogLevel.debug
        : LlamaLogLevel.warn;
    const llama = gpu == null
        ? await getLlama("lastBuild", {
            logLevel: llamaLogLevel
        })
        : await getLlama({
            gpu,
            logLevel: llamaLogLevel
        });
    const logBatchSize = batchSize != null;

    const resolvedModelPath = await resolveCommandGgufPath(modelArg, llama, headers);

    if (systemInfo)
        console.log(llama.systemInfo);

    if (textFile != null && textFile !== "") {
        if (text != null && text !== "")
            console.warn(chalk.yellow("Both `text` and `textFile` were specified. `textFile` will be used."));

        text = await fs.readFile(path.resolve(process.cwd(), textFile), "utf8");
    }

    if (batchSize != null && contextSize != null && batchSize > contextSize) {
        console.warn(chalk.yellow("Batch size is greater than the context size. Batch size will be set to the context size."));
        batchSize = contextSize;
    }

    let initialText = text ?? null;
    const model = await withProgressLog({
        loadingText: chalk.blue.bold("Loading model"),
        successText: chalk.blue("Model loaded"),
        failText: chalk.blue("Failed to load model"),
        liveUpdates: !debug,
        noProgress: debug,
        liveCtrlCSendsAbortSignal: true
    }, async (progressUpdater) => {
        try {
            return await llama.loadModel({
                modelPath: resolvedModelPath,
                gpuLayers: gpuLayers != null
                    ? gpuLayers
                    : contextSize != null
                        ? {fitContext: {contextSize}}
                        : undefined,
                ignoreMemorySafetyChecks: gpuLayers != null,
                onLoadProgress(loadProgress: number) {
                    progressUpdater.setProgress(loadProgress);
                },
                loadSignal: progressUpdater.abortSignal
            });
        } catch (err) {
            if (err === progressUpdater.abortSignal?.reason)
                process.exit(0);

            throw err;
        } finally {
            if (llama.logLevel === LlamaLogLevel.debug) {
                await new Promise((accept) => setTimeout(accept, 0)); // wait for logs to finish printing
                console.info();
            }
        }
    });
    const context = await withOra({
        loading: chalk.blue("Creating context"),
        success: chalk.blue("Context created"),
        fail: chalk.blue("Failed to create context"),
        useStatusLogs: debug
    }, async () => {
        try {
            return await model.createContext({
                contextSize: contextSize != null ? contextSize : undefined,
                batchSize: batchSize != null ? batchSize : undefined,
                threads,
                ignoreMemorySafetyChecks: gpuLayers != null || contextSize != null
            });
        } finally {
            if (llama.logLevel === LlamaLogLevel.debug) {
                await new Promise((accept) => setTimeout(accept, 0)); // wait for logs to finish printing
                console.info();
            }
        }
    });

    const contextSequence = context.getSequence();
    const completion = new LlamaCompletion({
        contextSequence
    });
    let lastTokenMeterState = contextSequence.tokenMeter.getState();

    await new Promise((accept) => setTimeout(accept, 0)); // wait for logs to finish printing

    const padTitle = "Complete".length + 1;
    await printCommonInfoLines({
        context,
        minTitleLength: padTitle,
        logBatchSize,
        tokenMeterEnabled: meter
    });
    printInfoLine({
        title: "Complete",
        padTitle: padTitle,
        info: [{
            title: "Repeat penalty",
            value: `${repeatPenalty} (apply to last ${lastTokensRepeatPenalty} tokens)`
        }, {
            show: repeatFrequencyPenalty != null,
            title: "Repeat frequency penalty",
            value: String(repeatFrequencyPenalty)
        }, {
            show: repeatPresencePenalty != null,
            title: "Repeat presence penalty",
            value: String(repeatPresencePenalty)
        }, {
            show: !penalizeRepeatingNewLine,
            title: "Penalize repeating new line",
            value: "disabled"
        }]
    });

    // this is for ora to not interfere with readline
    await new Promise(resolve => setTimeout(resolve, 1));

    const replHistory: string[] = [];

    async function getPrompt() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            history: replHistory.slice()
        });

        const res: string = await new Promise((accept) => rl.question(chalk.yellow("> "), accept));
        rl.close();

        return res;
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const input = initialText != null
            ? initialText
            : await getPrompt();

        if (initialText != null) {
            console.log(chalk.green("> ") + initialText);
            initialText = null;
        } else
            await replHistory.push(input);

        if (input === ".exit")
            break;

        process.stdout.write(chalk.yellow("Completion: "));

        const [startColor, endColor] = chalk.blue("MIDDLE").split("MIDDLE");

        process.stdout.write(startColor);
        await completion.generateCompletion(input, {
            temperature,
            minP,
            topK,
            topP,
            repeatPenalty: {
                penalty: repeatPenalty,
                frequencyPenalty: repeatFrequencyPenalty != null ? repeatFrequencyPenalty : undefined,
                presencePenalty: repeatPresencePenalty != null ? repeatPresencePenalty : undefined,
                penalizeNewLine: penalizeRepeatingNewLine,
                lastTokens: lastTokensRepeatPenalty
            },
            maxTokens: maxTokens === -1
                ? context.contextSize
                : maxTokens <= 0
                    ? undefined
                    : maxTokens,
            onToken(chunk) {
                process.stdout.write(model.detokenize(chunk));
            }
        });
        process.stdout.write(endColor);
        console.log();

        if (printTimings) {
            if (LlamaLogLevelGreaterThan(llama.logLevel, LlamaLogLevel.info))
                llama.logLevel = LlamaLogLevel.info;

            await context.printTimings();
            await new Promise((accept) => setTimeout(accept, 0)); // wait for logs to finish printing

            llama.logLevel = llamaLogLevel;
        }

        if (meter) {
            const newTokenMeterState = contextSequence.tokenMeter.getState();
            const tokenMeterDiff = TokenMeter.diff(newTokenMeterState, lastTokenMeterState);
            lastTokenMeterState = newTokenMeterState;

            console.info(`${chalk.dim("Input tokens:")} ${String(tokenMeterDiff.usedInputTokens).padEnd(5, " ")}  ${chalk.dim("Output tokens:")} ${tokenMeterDiff.usedOutputTokens}`);
        }
    }
}
