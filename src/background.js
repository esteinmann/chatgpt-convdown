function getFileName() {
    const date = new Date();
    const isoDateString = date.toISOString();
    const formattedDateString = isoDateString.replace(/[^a-zA-Z0-9]/g, '');
    return "chatgpt_conversation_" + formattedDateString + ".txt";
}

function notify(message) {
    const url = URL.createObjectURL(new Blob([message.content], { type: "text/plain" }));
    console.log("URL: " + url);
    browser.downloads.download({
        url: url,
        conflictAction: "uniquify",
        filename: getFileName()
    }).then(
        (id) => {
            const listener = (delta) => {
                if (id === delta.id && delta.state && delta.state.current === "complete") {
                    URL.revokeObjectURL(url);
                    browser.downloads.onChanged.removeListener(listener);
                }
            };
            browser.downloads.onChanged.addListener(listener);
        },
        (err) => {
            console.error(err);
            URL.revokeObjectURL(url);
        }
    );
}

function startup() {
    // Set linebreak based on OS (default is \n).
    // if(navigator.userAgent.indexOf("Windows") != -1) {
    //      lineBreak = "\r\n";
    // }
}

browser.runtime.onMessage.addListener(notify);
browser.runtime.onStartup.addListener(startup);

browser.contextMenus.create({
    id: "download-conversation",
    title: "Download the conversation",
    contexts: ["all"]
});
browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "download-conversation") {
        return;
    }
         
    try {
        await browser.scripting.executeScript({
            target: {
                tabId: tab.id,
            },
            func: () => {                
                // XPath is based on suggestions by ChatGPT ...
                const matches = document.evaluate("//main//div[not(*) or p]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);                
                var match = matches.iterateNext();
                var conversation = "";
                var counter = 0;
                while (match) {
                    // Assuming the first matched node is always the users question ...
                    const actor = (counter % 2) === 0 ? "You" : "ChatGPT";
                    conversation += "[" + actor + "]: " + match.textContent + "\n\n";
                    match = matches.iterateNext();
                    counter++;
                }
                                
                if (counter > 0) {                    
                    console.log("Your conversation with ChatGPT:\n" + conversation);
                    // Notify.                
                    browser.runtime.sendMessage({"content": conversation});
                } else {
                    console.log("No conversation with ChatGPT found to download.");
                }
            },
        });
    } catch (err) {
        console.error(`failed to execute script: ${err}`);
    }
});
