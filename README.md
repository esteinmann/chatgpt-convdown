ChatGPT Conversation Downloader is a Firefox extension to help you save your interesting conversation with ChatGPT as a Markdown (.md) file.

## Usage

Install the extension and it should add a download button to the nav menu on the left side (see screenshot). Click this and a file will be downloaded in the format "chatgpt_conversation_{datetime}.md".

![screenshot of the context menu](docs/media/button.png)

Sample of the conversation as Markdown:

```
### You
Can you tell me a joke?

### ChatGPT

Sure, here's one: Why was the math book sad? Because it had too many problems.

### You
Can you explain that joke?

### ChatGPT

The joke is based on a play on words. "Why was the math book sad?" is a question that is asking for a reason why the math book might be feeling sad. The answer is "Because it had too many problems," which is a reference to the fact that math books often include a large number of problems for students to solve. The word "problems" can refer to both the mathematical problems found in a math book, and to things that cause sadness or difficulties. So, the joke is saying that the math book is sad because it has a lot of things (i.e., mathematical problems) that are difficult or challenging.
```

## Installation

### Official
Install latest published version (uploaded to Mozilla): https://addons.mozilla.org/nl/firefox/addon/chatgpt-convdown/

### Temporarily or for local development
Either download a [release zipfile](https://github.com/esteinmann/chatgpt-convdown/releases) or `git clone` this repo. Then navigate to `about:debugging#/runtime/this-firefox` in Firefox. Use the load temporary add-on button to add the `manifest.json` from the zip or from the `src` folder. This should add the extension to Firefox temporarily (it will be gone after you close Firefox).
