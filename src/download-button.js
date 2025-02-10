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

// Default to the green arrow icon.
var iconType = "green";

// Get the configured iconType from storage.
if (isChrome) {
    browser.storage.local.get("iconType", (item) => {
        iconType = item.iconType;
    });
} else {
    browser.storage.local.get("iconType").then(
        (item) => {
            iconType = item.iconType;
        },
        (error) => {
            console.log(`Error: ${error}`);
        });
}

// Execute after a time-out (1 sec now) to prevent our changes to the DOM being reset.
setTimeout(() => {
    // Determine line break character based on platform. Default to LF on non-Windows platforms.
    const lb = navigator.userAgent.indexOf("Windows") !== -1 ? "\r\n" : "\n";
    const indentSpaces = 4;
    const fence = '```';

    // Closure to contain markdown generator / node parser state.
    const Context = (() => {
        let markdown = "";
        let marker = "";
        let indent = 0;
        let lineBreaks = true;

        // Markdown writing helpers

        const writeText = (text) => {                
            markdown += markdown.endsWith(" ") || markdown.endsWith(lb)
                ? text // Just add the text.
                : ` ${text}`; // Need to add a space before.
        };

        const newLine = (ignoreDouble) => {
            if (markdown.endsWith(`${lb}${lb}`) && !ignoreDouble) {
                return;
            }
            markdown += lb;
        };
                    
        const writeLine = (line) => {
            let indentText = ' '.repeat(indent * indentSpaces);
            let markerText = marker !== "" ? `${marker} ` : "";
            if (lineBreaks) {
                if (markdown && !markdown.endsWith(lb)) {
                    newLine();
                }
                markdown += `${indentText}${markerText}${line}${lb}`;
            } else {
                if (markdown === "" || markdown.endsWith(lb)) {
                    markdown += `${indentText}${markerText}${line}`;
                } else {
                    writeText(line);
                }
            }
        };

        const writeLines = (text) => {
            text.split(/\r?\n/).forEach(line => {
                writeLine(line);
            });
        };        

        // Node processing
        
        const processAsText = (node) => {
            writeLine(`${node.textContent?.trim() ?? ""}`);
        };
                    
        const processPre = (node) => {
            lineBreaks = true;
            const codeNode = node.querySelector('code');
            if (!codeNode) {
                processAsText(node);
                return;
            }
            
            const lang = (Array.from(codeNode.classList?.values() ?? [])).find(s => s.startsWith('language-'))?.substring(9) ?? '';
            writeLine(`${fence}${lang}`);
            writeLines(codeNode.textContent);
            writeLine(fence);
        };

        const processHeader = (node) => {
            lineBreaks = true;
            newLine();
            writeLine(`### ${node.textContent}`);
        };

        const processTable = (node) => {                
            var line = "";
            // Make sure a header deliniator is added after the header row contents.
            lineBreaks = true;
            node.querySelectorAll("tr").forEach((tr, index) => {
                // Add header deliniator after header row.
                if (index === 1) {
                    line += "|";
                    tr.querySelectorAll("td").forEach(th => {
                        line += `---|`;
                    });
                    writeLine(line);
                }
                line = "|";
                tr.querySelectorAll("td, th").forEach(td => {
                    line += ` ${td.textContent} |`;
                });
                writeLine(line);
            });
        };

        const processCode = (node) => {
            writeLine(`\`${node.textContent.trim()}\``);
        };

        const processLink = (node) => {
            writeLine(`[${node.textContent.trim()}](${node.getAttribute('href') ?? ''})`);
        };

        const processStrong = (node) => {
            writeLine(`**${node.textContent.trim()}**`);
        };

        // Recursive function to process the list structure
        const processListItems = function(node, indentLevel) {
            node.children.filter(item => item.nodeName === "LI").forEach((item, index) => {
                // Determine marker based on list type
                marker = node.nodeName === "OL" ? `${index + 1}.` : "-";
                
                var first = true;
                item.childNodes.forEach(cn => {
                    if (cn.nodeName === "UL" || cn.nodeName === "OL") {
                        // List contains another list as list item.
                        processListItems(cn, indentLevel + 1);
                    } else {                            
                        lineBreaks = false;
                        marker = first ? marker : "";
                        indent = first ? indentLevel : indentLevel + 1;
                        processNode(cn);
                    }
                    first = false;
                })
            })
        };

        const processListNode = function(node) {
            processListItems(node, indent);
            // Reset marker and indent after processing list.
            marker = "";
            indent = 0;
            newLine();
        };

        const processSpan = (node) => {
            lineBreaks = false;

            // Span can be used to contain styled link blocks (in this case the paragraph does not contain <a> directly).
            const linkNode = node.querySelector("a");
            if (linkNode) {
                processLink(linkNode);
                return;
            }
            
            processAsText(node);
        };

        const processParagrah = (node) => {
            node.childNodes.forEach(cn => {
                lineBreaks = false;
                processNode(cn);
            });
            newLine();
        };

        const processNode = (node) => {
            switch (node.nodeName) {
                case "P":
                    processParagrah(node);
                    break;
                case "SPAN":
                    processSpan(node);
                    break;
                case "PRE":
                    processPre(node);
                    break;
                case "UL":
                case "OL":
                    processListNode(node);
                    break;
                case "TABLE":
                    processTable(node);
                    break;
                case "CODE":
                    processCode(node);
                    break;
                case "A":
                    processLink(node);
                    break;
                case "STRONG":
                    processStrong(node);
                    break;
                case "H1":
                case "H2":
                case "H3":
                    processHeader(node);
                    break;
                default:
                    processAsText(node);
                    break;
            }
        };

        return class {
            init = () => {
                markdown = "";
            };

            newLine = (ignoreDouble) => newLine(ignoreDouble);
                        
            setNode = (nd, options) => {
                lineBreaks = options.lineBreaks;
                if (options.indent !== null && options.indent !== undefined) {
                    indent = options.indent;
                }
                if (options.marker !== null && options.marker !== undefined) {
                    marker = options.marker;
                }
                processNode(nd);
            };

            getMarkdown = () => markdown;
        };
    })();
    
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

    const processConversationTurn = (chatElement) => {        
        const ctx = new Context();
        ctx.init();

        chatElement.forEach(node => {
            // Skip nodes that contain a content warning.
            if (typeof node.querySelector !== 'undefined' && node.querySelector('a[href^="https://platform.openai.com/docs/usage-policies" i]')) {
                return;
            }
            
            ctx.setNode(node, {
                lineBreaks: true,
                indent: 0,
                marker: ""
            });
        });

        ctx.newLine();

        let markdown = ctx.getMarkdown();
        if (markdown === `${lb}` || markdown === `${lb}${lb}`) {
            markdown += "[ChatGPT ConvDown Meta] Failed to parse this conversation turn.";
        }
                
        return markdown;
    }

    const download = (copyToClipboard) => {
        // Extract the name that OpenAI has assigned to the selected conversation
        const conversationName = document?.querySelector('title')?.innerText ?? 'Unknown';

        let conversation = `# ${conversationName}${lb}${lb}`;
        let foundConversation = false;

        for (const matchEl of document.querySelectorAll('[data-message-author-role]')) {
            // Get the name of the author
            const authorRole = matchEl.getAttribute("data-message-author-role");
            
            // Find element with class markdown inside the matching element.
            var contentElement = matchEl.querySelector('.markdown');
            var match;
            if (contentElement){                
                // Use content of the div with .markdown class.
                match = contentElement.childNodes;
            } else {
                // Use content of element with data-message-author-role attribute.
                match = matchEl.firstChild?.children?.length > 0 ? matchEl?.firstChild?.childNodes : matchEl?.childNodes;
            }

            if (!match) {
                continue;
            }
            foundConversation = true;
            
            let authorLabel = authorRole;            
            switch (authorRole) {
                case "user":
                    authorLabel = "You";                    
                    break;
                case "assistant":
                    authorLabel = "ChatGPT";
                    break;
            }

            // Value of the author role attribute should be "user" (You) or "assistant" (ChatGPT)
            conversation += `## ${authorLabel}${lb}`;
            conversation += processConversationTurn(match);
        }

        if (!foundConversation) {
            alert("Sorry, but there doesn't seem to be any conversation on this tab.");
            return;
        }
        
        console.log("Your conversation with ChatGPT:" + lb + lb + conversation);

        if (copyToClipboard) {
            navigator.clipboard.writeText(conversation);
            return;
        }

        // Create a temporary <a> element to initiate the download.
        const url = URL.createObjectURL(new Blob([conversation], { type: "text/markdown" }));
        const link = document.createElement('a');
        link.download = constructFileName(conversationName);
        link.href = url;
        link.click();
    };

    const buttonExists = () => {
        // Check for probe class to exist on element within <nav> block.
        return !!document.querySelector('nav a.convdown-probe');
    };

    // Check if download button was already added before altering document. Sometimes ChatGPT appears to 'hang' and clicking on individual chats keeps adding download buttons. The following check should prevent hat.
    if (buttonExists()) {
        // Already added the button. return.
        console.error("ChatGPT ConvDown: Download button already added to the document!");
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
    aElement.classList.add("flex", "py-3", "px-3", "items-center", "gap-3", "rounded-md", "hover:bg-gray-800", "transition-colors", "duration-200", "text-token-text-primary", "cursor-pointer", "text-sm", "convdown-probe");
    aElement.appendChild(iconElement);
    var textNode = document.createTextNode("Download");
    aElement.appendChild(textNode);
    aElement.addEventListener('click', (event) => download(event.shiftKey));

    // Get the <nav> element and append <a> to it.
    const nav = document.querySelector("nav");
    nav.appendChild(aElement);

    // Listen to messages from the background script.
    browser.runtime.onMessage.addListener((request) => {
        switch(request.type) {
            case "download":
                download(false);
                break;
            case "copy":
                download(true);
                break;
        }
    });
}, 1000);
