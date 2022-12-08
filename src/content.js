/*
 * Copyright (C) 2022 Erik Steinmann
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const download = () => {
    // Determine line break character based on platform. Default to LF.
    var lineBreak = "\n";
    if(navigator.userAgent.indexOf("Windows") != -1) {
        // CLRF on Windows
        lineBreak = "\r\n";
    }
    
    // XPath is based on suggestions by ChatGPT ...
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
            const actor = (counter % 2) === 0 ? "You" : "ChatGPT";
            conversation += "[" + actor + "]: " + match.textContent + lineBreak + lineBreak;
            match = matches.iterateNext();
            counter++;
    }
    
    if (counter > 0) {
        console.log("Your conversation with ChatGPT:" + lineBreak + lineBreak + conversation);
        // Notify background script of new conversation content to create a download for.                
        browser.runtime.sendMessage({"content": conversation});
    } else {
        console.log("No conversation with ChatGPT found to download.");
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
