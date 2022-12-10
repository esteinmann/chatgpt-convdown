/*
 * Copyright (C) 2022 Erik Steinmann
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The following method is (almost) entirely written by ChatGPT and so I'm uncertaing regarding the license ...
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
            var lang = "";
            // Find the code tag
            const elements = node.getElementsByTagName("code");
            if (elements) {
                // Assume just one <code> tag inside this <pre> so take the class from the first one.
                const codeClass = elements[0].className;
                // Find the language.
                const regex = /language-(\w+)/;
                const result = regex.exec(codeClass);
                if (result && result.length >= 2) {
                    // The matching group should be the second element of the results array.
                    lang = result[1];
                }
            }
            
            // Start code block with the language (if found)
            markdown += `${lb}\`\`\`` + lang + lb;
            // Content
            markdown += node.textContent;
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
    
    // XPath is based on suggestions by ChatGPT ... Should find divs under <main> that contain <p> or no other elements (only text).
    const matches = document.evaluate("//main//div[not(*) or p]", document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);                                
    var match = matches.iterateNext();
    var conversation = "";
    var counter = 0;
    while (match) {
        // Skip empty or final node in <main>.
        if ((match.textContent === "") ||
            (match.textContent === null) || 
            (match.textContent.indexOf("Free Research Preview:") >= 0)) {
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
        // Notify background script of new conversation content to create a download for.                
        browser.runtime.sendMessage({"content": conversation});
    } else {
        alert("Sorry, but there doesn't seem to be any conversation on this tab.");
    }
};

// Create the <img> element.
const imgElement = document.createElement("img");
imgElement.src = browser.runtime.getURL("media/download.png");
imgElement.width = "1em";
imgElement.height = "1em";
imgElement.classList.add("w-4", "h-4");

// Create the <a> element.
const aElement = document.createElement("a");
aElement.classList.add("flex", "py-3", "px-3", "items-center", "gap-4", "rounded-md", "hover:bg-gray-800", "transition-colors", "duration-200", "text-white", "cursor-pointer", "text-sm");
aElement.appendChild(imgElement);
var textNode = document.createTextNode("Download");
aElement.appendChild(textNode);
aElement.addEventListener('click', (event) => {
    download();
});

// Get the <nav> element and append <a> to it.
const nav = document.querySelector("nav");
nav.appendChild(aElement);
