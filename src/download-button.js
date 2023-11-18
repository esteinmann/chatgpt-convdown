/*
 * Copyright (C) 2022 Erik Steinmann
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Add shim to make chrome supported when browser is used.
var isChrome = false;
if ((typeof browser === "undefined") || (typeof chromeDetected !== "undefined")) {
    isChrome = true;
    // Define this globally so a rerun of this script will see that Chrome was detected previously.
    chromeDetected = true;
    // Assign chrome to the global browser.
    browser = chrome;
}

// Defaults.
var iconType = "green";
var downloadMethod = "dom";
var setConfig = (items) => {
    if (items.iconType) {
        iconType = items.iconType;
    }
    if (items.downloadMethod) {
        downloadMethod = items.downloadMethod;
    }
};

// Get the configured iconType from storage.
if (isChrome) {
    // Chrome et al.
    browser.storage.local.get(null, setConfig);
} else {
    // Firefox.
    browser.storage.local.get().then(setConfig,
        (error) => {
            console.log(`Error: ${error}`);
        });
}

var conversationJson = "";
var messageListener = (data) => {
    if (data.type === "conversation_ready") {
        conversationJson = data.json;
    }
    return false;
};

if (!browser.runtime.onMessage.hasListener(messageListener)) {
    browser.runtime.onMessage.addListener(messageListener);
}

// Execute after a time-out (1 sec now) to prevent our changes to the DOM being reset.
setTimeout(() => {
    // Determine line break character based on platform. Default to LF on non-Windows platforms.
    var lineBreak = "\n";
    if(navigator.userAgent.indexOf("Windows") != -1) {
        // CRLF on Windows
        lineBreak = "\r\n";
    }

    const addButtonForCurrentChat = () => {
        const probeElement = document.querySelector("#chatgpt_convdown_button");
        if (probeElement) {
            return;
        }
        
        // Replicate the share button but with a download icon.
        const outerDiv = document.createElement("div");
        outerDiv.id = "chatgpt_convdown_button";
        outerDiv.classList.add("flex", "flex-shrink", "flex-row");
        const outerSpan = document.createElement("span");
        outerDiv.appendChild(outerSpan);
        const innerSpan = document.createElement("span");
        outerSpan.appendChild(innerSpan);
        const button = document.createElement("a");
        button.classList.add("flex", "cursor-pointer");
        button.setAttribute("aria-label", "Downloaduh!");
        innerSpan.appendChild(button);
        
        iconElement = document.createElement("img");
        iconElement.src = browser.runtime.getURL("media/download.png");
        iconElement.style.width = "1em";
        iconElement.style.height = "1em";
        button.appendChild(iconElement);
        button.addEventListener('click', (event) => { alert("Hoi!"); });

        // TODO: Construct copy button for top bar.
    
        const shareButton = document.querySelector("button[aria-label='Share chat']");
        if (shareButton) {
            const insertBeforeElement = shareButton.parentElement.parentElement.parentElement;
            if (insertBeforeElement) {
                insertBeforeElement.insertAdjacentElement("beforebegin", outerDiv);
            }
        }
    };
        
    const constructFileName = (conversationName) => {
        const isoDateString = (new Date()).toISOString();

        // Remove all characters that could cause trouble in a filename.
        const formattedDateString = isoDateString.replace(/[^a-zA-Z0-9]/g, "");

        if (conversationName) {
            const nameWithoutInvalidChar = conversationName.replace(/[^A-Za-z0-9_\-]/g, '');

            return `ChatGPT_${formattedDateString}_${nameWithoutInvalidChar}.md`;
        }
        else {
            return `ChatGPT_${formattedDateString}.md`;
        }
    }

    const startDownload = (title, content) => {
        // Create a temporary <a> element to initiate the download.
        const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
        const link = document.createElement('a');
        link.download = constructFileName(title);
        link.href = url;
        link.click();
    }

    // The following method is for a big part written by ChatGPT and so I'm uncertaing regarding the license ...
    const htmlToMarkdown = (chatElement, lb) => {
        const fence = '```';
        // Initialize an empty markdown string
        var markdown = "";

        chatElement.forEach(node => {
            // Skip nodes that contain a content warning.
            if (typeof node.querySelector !== 'undefined' && node.querySelector('a[href^="https://platform.openai.com/docs/usage-policies" i]')) {
                return;
            }
            // If the element is a paragraph, add it to the markdown string with the appropriate formatting
            if (node.nodeName === "P") {
                markdown += lb;
                for (const subNode of node.childNodes) {
                    switch (subNode.nodeName) {
                        case 'A':
                            // FIXME: No handling for special characters like ()[] in the link or link text.
                            markdown += `[${subNode.textContent}](${subNode?.getAttribute('href') ?? ''})`;
                            break;
                        case 'CODE':
                            // FIXME: No handling for backticks or other special characters.
                            markdown += `\`${subNode.textContent}\``;
                            break;
                        default: markdown += subNode?.textContent ?? '';
                    }
                }
                markdown += lb;
                return;
            }

            // If the element is a preformatted code block, add it to the markdown string with the appropriate formatting
            if (node.nodeName === "PRE") {
                const codeEl = node.querySelector('code');
                if (!codeEl) {
                    return;
                }
                const lang = (Array.from(codeEl.classList?.values() ?? [])).find(s => s.startsWith('language-'))?.substring(9) ?? '';

                markdown += `${lb}${fence}${lang}${lb}${codeEl.textContent}${lb}${fence}${lb}`;
                return;
            }

            // If the element is an unordered list, add its items to the markdown string with the appropriate formatting
            if (node.nodeName === "UL") {
                markdown += lb;
                node.querySelectorAll("li").forEach(li => {
                    markdown += `- ${li.textContent}${lb}`;
                });
                return;
            }

            // If the element is an ordered list, add its items to the markdown string with the appropriate formatting
            if (node.nodeName === "OL") {
                markdown += lb;
                node.querySelectorAll("li").forEach((li, index) => {
                    markdown += `${index + 1}. ${li.textContent}${lb}`;
                });
                return;
            }

            // If the element is a table, add its rows to the markdown string with the appropriate formatting
            // Make sure a header deliniator is added after the header row contents.
            if (node.nodeName === "TABLE") {
                markdown += lb;
                node.querySelectorAll("tr").forEach((tr, index) => {
                    // Add header deliniator after header row.
                    if (index === 1) {
                        markdown += "|";
                        tr.querySelectorAll("td").forEach(th => {
                            markdown += `---|`;
                        });
                        markdown += lb;
                    }
                    markdown += "|";
                    tr.querySelectorAll("td, th").forEach(td => {
                        markdown += ` ${td.textContent} |`;
                    });
                    markdown += lb;
                });
                return;
            }

            // Fall back on unprocessed textContent if other tag is encountered.
            markdown += `${lb}${node.textContent}${lb}`;
        });

        // Return the resulting markdown string
        return markdown;
    }

    const downloadByParsingDom = (event) => {
        // Extract the name that OpenAI has assigned to the selected conversation
        const conversationName = document?.querySelector('title')?.innerText ?? 'Unknown';

        var conversation = `# ${conversationName}${lineBreak}${lineBreak}`;
        var counter = 0;

        for (const matchEl of document.querySelectorAll('.group .text-base .items-start.whitespace-pre-wrap')) {
            const match = matchEl.firstChild?.children?.length > 0 ? matchEl?.firstChild?.childNodes : matchEl?.childNodes;

            if (!match) {
                continue;
            }
            const isUser = counter % 2 === 0;
            conversation += `### ${isUser ? "You" : "ChatGPT"}${
                isUser
                    ? `${lineBreak}${match.item(0)?.textContent ?? ''}${lineBreak}`
                    : htmlToMarkdown(match, lineBreak)
            }${lineBreak}`;
            counter++;
        }

        if (counter > 0) {
            console.log("Your conversation with ChatGPT:" + lineBreak + lineBreak + conversation);

            if (event.shiftKey) {
                navigator.clipboard.writeText(conversation);
                return;
            }            
            startDownload(conversationName, conversation);
        } else {
            alert(browser.i18n.getMessage("errorNoConversationDom"));
        }
    };

    const downloadByParsingJson = (event) => {                        
        const conversation = JSON.parse(conversationJson);
        
        // Get title.
        console.log(`Conversation title: ${conversation.title}`);
        var markdown = `# ${conversation.title}${lineBreak}${lineBreak}`;
        
        // Iterate over messages.
        var index = 0;
        for (const messageGuid in conversation.mapping) {            
            if (!conversation.mapping[messageGuid]["message"]) {
                continue;
            }
            const message = conversation.mapping[messageGuid].message;
            index++;
            var role = message.author.role;
            console.log(`Message ${index} (${message.id}) by ${role}`);
            if (role === "system") {
                continue;
            }
            if (role === "user") {
                markdown += `## You${lineBreak}`;
            }
            if (role === "assistant") {
                markdown += `## ChatGPT${lineBreak}`;
            }

            // Get content of the message.
            if (message.content) {
                if(message.content.content_type !== "text") {
                    markdown += `Content of type [${message.content.content_type}]${lineBreak}${lineBreak}`;
                    continue;
                }
                
                for (const part of message.content.parts) {
                    markdown += `${part}${lineBreak}${lineBreak}`;
                }
            }
        }

        if (event.shiftKey) {
            navigator.clipboard.writeText(markdown);
            return;
        }
        startDownload(conversation.title, markdown);
    };

    const download = (event) => {
        if (downloadMethod === "dom") {
            // 'old' behavior. Parse current DOM and convert to markdown for download.        
            downloadByParsingDom(event);
        } else {
            // 'new' behavior. Call background script to get conversation content.
            if (!conversationJson) {
                alert(browser.i18n.getMessage("errorNoConversationJson"));
                return;
            }
            downloadByParsingJson(event);
        }
    };
                
    const buttonExists = () => {
        // Check for probe class to exist on element within <nav> block.
        return !!document.querySelector('nav a.convdown-probe');
    };

    // Try to add button at the top.
    addButtonForCurrentChat();

    // Check if download button in nav was already added before altering document. Sometimes ChatGPT appears to 'hang' and clicking on individual chats keeps adding download buttons. The following check should prevent hat.
    if (buttonExists()) {        
        console.log("ChatGPT ConvDown: Download button already added to the document!");
        return;
    }

    // Create the icon element for the download button.
    var iconElement = null;
    if (iconType === "bootstrap") {
        // Bootstrap download icon as SVG. From: https://icons.getbootstrap.com/icons/download/
        const ns = "http://www.w3.org/2000/svg";
        iconElement = document.createElementNS(ns, "svg");
        iconElement.setAttribute("fill", "currentColor");
        iconElement.setAttribute("viewBox", "0 0 16 16");
        path1 = iconElement.appendChild(document.createElementNS(ns, "path"));
        path1.setAttribute("d", "M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z");
        path2 = iconElement.appendChild(document.createElementNS(ns, "path"));
        path2.setAttribute("d", "M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z");
    } else {
        // Green arrow PNG image.
        iconElement = document.createElement("img");
        iconElement.src = browser.runtime.getURL("media/download.png");
    }
    iconElement.classList.add("w-4", "h-4");
    iconElement.width = "1em";
    iconElement.height = "1em";

    // Create the <a> element.
    const aElement = document.createElement("a");
    aElement.classList.add("flex", "py-3", "px-3", "items-center", "gap-3", "rounded-md", "hover:bg-gray-800", "transition-colors", "duration-200", "text-white", "cursor-pointer", "text-sm", "convdown-probe");
    aElement.appendChild(iconElement);
    var textNode = document.createTextNode(browser.i18n.getMessage("download"));
    aElement.appendChild(textNode);
    aElement.addEventListener('click', download);

    // Get the <nav> element and append <a> to it.
    const nav = document.querySelector("nav");
    nav.appendChild(aElement);    
}, 1000);
