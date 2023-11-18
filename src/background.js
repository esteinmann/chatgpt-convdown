/*
 * Copyright (C) 2022 Erik Steinmann
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Add shim to make chrome supported when browser is used
if (typeof browser === "undefined") {
    browser = chrome;
}

const guidRegex = /[a-fA-F\d]{8}(?:-[a-fA-F\d]{4}){3}-[a-fA-F\d]{12}/g;
const conversationsTabs = {};

// Filter so the history update events are only triggered for chat.openai.com.
const filter = {    
    url: [{hostEquals: "chat.openai.com"}]
};

// Execute content script to add download button.
const runContentScript = async (tabId) => {    
    try {
        await browser.tabs.executeScript(tabId, {
            file: "/download-button.js"
        });
    } catch (error) {
        console.error(error);
    }
};

const listener = async (evt) => {
    // Filter out any sub-frame related navigation event.
    if (evt.frameId !== 0) {
        return;
    }
    
    // TODO Make logging configurable (to disable it in release mode for example) 
    console.log("history updated: " + evt.url);
    const matches = evt.url.match(guidRegex);
    if (matches) {
        // Store / overwrite tab ID for use in HTTP resonse listener.
        conversationsTabs[matches[0]] = {
            tabId: evt.tabId,
            json: "" // Conversation from chat.openai.com API as JSON text.
        };
    }
    
    // TODO Fetch the chat from the API so we don't need to intercept the call.
    // -- That will be hard, need the credentials from the API call.    
    
    // Execute content script to add download button.
    await runContentScript(evt.tabId);
};

const responseStartedListener = async (req) => {
    console.log(`req started response from: ${req.url}`);

    const matches = req.url.match(guidRegex);
    if (!matches) {
        return;
    }

    if (!conversationsTabs[matches[0]]) {
        return;
    }

    const filter = browser.webRequest.filterResponseData(req.requestId);
    const decoder = new TextDecoder("utf-8");
    var textContent = "";

    filter.ondata = (event) => {
        console.log(`filter.ondata received ${event.data.byteLength} bytes`);
        let str = decoder.decode(event.data, { stream: true });
        textContent += str;
        filter.write(event.data);
    };

    filter.onstop = () => {
        filter.close();        
        conversationsTabs[matches[0]].json = textContent;
    };
};

const responseCompletedListener = async (evt) => {
    console.log(`req completed response from: ${evt.url}`);
    
    // Extract conversation GUID from URL.
    const matches = evt.url.match(guidRegex);
    if (!matches) {
        return;
    }

    // Lookup tab by conversation GUID.
    if (!conversationsTabs[matches[0]]) {
        return;
    }
                
    const tabId = conversationsTabs[matches[0]].tabId;
    if (tabId === undefined) {
        return;
    }
    
    // Execute content script to add download button.
    await runContentScript(tabId);
    browser.tabs.sendMessage(
        tabId,
        {
            type: "conversation_ready",
            json: conversationsTabs[matches[0]].json
        }
    );
};

// Listen for history changes on chat.openai.com.
browser.webNavigation.onHistoryStateUpdated.addListener(listener, filter);
// Listen for HTTP requests to chat.openai.com/backend-api/conversation.
browser.webRequest.onBeforeRequest.addListener(responseStartedListener,
    {urls: ["https://chat.openai.com/backend-api/conversation/*"]},
    ["blocking"]);
browser.webRequest.onCompleted.addListener(responseCompletedListener,
    {urls: ["https://chat.openai.com/backend-api/conversation/*"]});
