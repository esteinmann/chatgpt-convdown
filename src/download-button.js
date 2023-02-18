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
    const constructFileName = (conversationName) => {
        const isoDateString = (new Date()).toISOString();

        // Remove all characters that could cause trouble in a filename.
        const formattedDateString = isoDateString.replace(/[^a-zA-Z0-9]/g, "");

        if (conversationName) {
            const nameWithoutInvalidChar = conversationName.replace(/[^A-Za-z0-9_\.\-\/]/g, '');

            return `ChatGPT_${formattedDateString}_${nameWithoutInvalidChar}.md`;
        }
        else {
            return `ChatGPT_${formattedDateString}.md`;
        }
    }
    
    // The following method is for a big part written by ChatGPT and so I'm uncertaing regarding the license ...
    const htmlToMarkdown = (html, lb) => {
        // Create a new DOMParser to parse the HTML string
        const parser = new DOMParser();
        
        // Parse the HTML string and get the document object
        const doc = parser.parseFromString(html, "text/html");
        
        // Initialize an empty markdown string
        var markdown = "";
        
        // Scrub button nodes.
        const buttonNodes = doc.querySelectorAll("button");
        buttonNodes.forEach((node) => {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            };
        });
        
        // Iterate over all elements in the document
        doc.body.childNodes.forEach(node => {
            // If the element is a paragraph, add it to the markdown string with the appropriate formatting
            if (node.nodeName === "P") {
                markdown += `${lb}${node.textContent}${lb}`;
                return;
            }
            
            // If the element is a preformatted code block, add it to the markdown string with the appropriate formatting
            if (node.nodeName === "PRE") {
                var lang = null;

                // Find code language (method propsed by ChatGPT)
                const divElement = node.querySelector(".bg-black");
                if (divElement)
                {
                    const spanElement = divElement.querySelector(".flex > span");
                    if (spanElement) {
                        lang = spanElement.textContent;
                    }
                }
                
                if (lang) {
                    // Start code block with the language (if found)
                    markdown += `${lb}\`\`\`` + lang + lb;

                    // Content
                    if (node.textContent.startsWith(lang)) {
                        markdown += node.textContent.slice(lang.length);
                    }
                    else {
                        markdown += node.textContent;
                    }
                }
                else {
                    markdown += `${lb}\`\`\`` + lb;

                    // Content
                    markdown += node.textContent;
                }

                // End code block
                markdown += `${lb}\`\`\`${lb}`;
                
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
    
    const download = () => {
        // Determine line break character based on platform. Default to LF on non-Windows platforms.
        var lineBreak = "\n";
        if(navigator.userAgent.indexOf("Windows") != -1) {
            // CLRF on Windows
            lineBreak = "\r\n";
        }
        
        // Extract the name that OpenAI has assigned to the selected conversation
        var conversationName = null;

        // XPath is also written by ChatGPT :-)
        const conversationNameNode = document.evaluate(
            "//div[starts-with(@class,'flex-col flex-1 overflow-y-auto border-b border-white/20 -mr-2')]//a[starts-with(@class,'flex py-3 px-3 items-center gap-3 relative rounded-md cursor-pointer break-all pr-14 bg-gray-800 hover:bg-gray-800 group')]/div[@class='flex-1 text-ellipsis max-h-5 overflow-hidden break-all relative']/text()",
            document,
            null,
            XPathResult.ANY_TYPE,
            null
        );
        
        let matchConversationName = conversationNameNode.iterateNext();
        if (matchConversationName) {
            conversationName = matchConversationName.nodeValue;
        }        
        
        /* 
            XPath is (partially) based on suggestions by ChatGPT.
            1. Find divs under <main> of class text-base
            2. Within these text-base div find the actual content:
                - Text nodes
                - <p> elements
                - <pre> elements (code blocks)
        */
        const matches = document.evaluate("//main//div[contains(@class, 'text-base')]//div[not(*) or p or pre]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);                                
        var match = matches.iterateNext();
        
        var conversation = "";
        var counter = 0;

        if (conversationName)
            conversation += "# " + conversationName + lineBreak + lineBreak;

        while (match) {
            // Skip empty node in <main>.
            if ((match.textContent === "") ||
                (match.textContent === null)) {
                match = matches.iterateNext();
                continue;
            }
            // Assuming the first matched node is always the users question ...        
            var actor = "You";
            var content = match.textContent + lineBreak;
            if ((counter % 2) === 1) {
                // ChatGPT answers
                actor = "ChatGPT";
                content = htmlToMarkdown(match.innerHTML, lineBreak);            
            }
            
            conversation += `### ${actor}` + lineBreak + content + lineBreak;
            
            match = matches.iterateNext();
            counter++;
        }
        
        if (counter > 0) {
            console.log("Your conversation with ChatGPT:" + lineBreak + lineBreak + conversation);
            
            // Create a temporary <a> element to initiate the download.
            const url = URL.createObjectURL(new Blob([conversation], { type: "text/markdown" }));
            const link = document.createElement('a');
            link.download = constructFileName(conversationName);
            link.href = url;
            link.click();
        } else {
            alert("Sorry, but there doesn't seem to be any conversation on this tab.");
        }
    };
    
    const buttonExists = () => {        
        // Check for probe class to exist on element within <nav> block.
        const xpath = "//nav//*[contains(@class, 'convdown-probe')]";
        
        // Evaluate the XPath expression
        var result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        
        // Return true if an element was found, or false if not
        return result.singleNodeValue !== null;
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
    aElement.classList.add("flex", "py-3", "px-3", "items-center", "gap-3", "rounded-md", "hover:bg-gray-800", "transition-colors", "duration-200", "text-white", "cursor-pointer", "text-sm", "convdown-probe");
    aElement.appendChild(iconElement);
    var textNode = document.createTextNode("Download");
    aElement.appendChild(textNode);
    aElement.addEventListener('click', (event) => {
        download();
    });
    
    // Get the <nav> element and append <a> to it.
    const nav = document.querySelector("nav");
    nav.appendChild(aElement);
}, 1000);
