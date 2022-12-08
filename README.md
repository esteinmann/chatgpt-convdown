ChatGPT Conversation Downloader is a Firefox extension to help you save your interesting conversation with ChagGPT as a plain text file.

## Usage

Install the extension and it should add a download button to the nav menu on the left side (see screenshot). Click this and a file will be downloaded in the format "chatgpt_conversation_{datetime}.txt".

![screenshot of the context menu](docs/media/button.png)

Sample of the conversation as textfile:

```
[You]: Can you tell me a joke?

[ChatGPT]: Sure! Here's one: Why was the math book sad? Because it had too many problems.

[You]: Can you explain that joke?

[ChatGPT]: The joke is a play on words. "Why was the math book sad?" is a question that implies the math book is capable of feeling emotions. The answer, "Because it had too many problems," plays on the double meaning of the word "problems" - it can refer to difficult math equations, but it can also refer to things that cause sadness or distress. In this case, the joke is suggesting that the math book is sad because it contains a lot of difficult equations, or "problems" in the math sense of the word.
```

## Installation

To install the published version: https://addons.mozilla.org/nl/firefox/addon/chatgpt-convdown/

You can either download a release zipfile or checkout this repo. Then navigate to `about:debugging#/runtime/this-firefox` use the load temporary add-on button to add the `manifest.json` from the downloaded zipfile or from the `src` folder if you cloned the repo to add this extension to firefox temporarily (it will be gone after a restart).
