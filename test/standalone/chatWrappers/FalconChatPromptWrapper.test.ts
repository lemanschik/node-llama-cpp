import {describe, expect, test} from "vitest";
import {ChatHistoryItem, FalconChatWrapper} from "../../../src/index.js";
import {defaultChatSystemPrompt} from "../../../src/config.js";


describe("FalconChatWrapper", () => {
    const conversationHistory: ChatHistoryItem[] = [{
        type: "system",
        text: defaultChatSystemPrompt
    }, {
        type: "user",
        text: "Hi there!"
    }, {
        type: "model",
        response: ["Hello!"]
    }];
    const conversationHistory2: ChatHistoryItem[] = [{
        type: "system",
        text: defaultChatSystemPrompt
    }, {
        type: "user",
        text: "Hi there!"
    }, {
        type: "model",
        response: ["Hello!"]
    }, {
        type: "user",
        text: "How are you?"
    }, {
        type: "model",
        response: ["I'm good, how are you?"]
    }];

    test("should generate valid context text", () => {
        const chatWrapper = new FalconChatWrapper();
        const {contextText} = chatWrapper.generateContextText(conversationHistory);

        expect(contextText.values).toMatchInlineSnapshot(`
          [
            {
              "builtin": true,
              "type": "specialToken",
              "value": "BOS",
            },
            "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible.
          If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.",
            "

          ",
            "User: ",
            "Hi there!",
            "

          ",
            "Assistant: ",
            "Hello!",
          ]
        `);

        const chatWrapper2 = new FalconChatWrapper();
        const {contextText: contextText2} = chatWrapper2.generateContextText(conversationHistory2);

        expect(contextText2.values).toMatchInlineSnapshot(`
          [
            {
              "builtin": true,
              "type": "specialToken",
              "value": "BOS",
            },
            "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible.
          If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.",
            "

          ",
            "User: ",
            "Hi there!",
            "

          ",
            "Assistant: ",
            "Hello!",
            "

          ",
            "User: ",
            "How are you?",
            "

          ",
            "Assistant: ",
            "I'm good, how are you?",
          ]
        `);

        const chatWrapper3 = new FalconChatWrapper();
        const {contextText: contextText3} = chatWrapper3.generateContextText(conversationHistory);
        const {contextText: contextText3WithOpenModelResponse} = chatWrapper3.generateContextText([
            ...conversationHistory,
            {
                type: "model",
                response: []
            }
        ]);

        expect(contextText3.values).toMatchInlineSnapshot(`
          [
            {
              "builtin": true,
              "type": "specialToken",
              "value": "BOS",
            },
            "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible.
          If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.",
            "

          ",
            "User: ",
            "Hi there!",
            "

          ",
            "Assistant: ",
            "Hello!",
          ]
        `);

        expect(contextText3WithOpenModelResponse.values).toMatchInlineSnapshot(`
          [
            {
              "builtin": true,
              "type": "specialToken",
              "value": "BOS",
            },
            "You are a helpful, respectful and honest assistant. Always answer as helpfully as possible.
          If a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. If you don't know the answer to a question, please don't share false information.",
            "

          ",
            "User: ",
            "Hi there!",
            "

          ",
            "Assistant: ",
            "Hello!",
            "

          ",
            "Assistant: ",
          ]
        `);
    });
});
