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
        conversationsTabs[matches[0]] = evt.tabId;
    }
    
    // Execute content script to add download button.    
    await runContentScript(evt.tabId);
};

const responseListener = async (evt) => {
    console.log("response from: " + evt.url);
    
    // Extract conversation GUID from URL.
    const matches = evt.url.match(guidRegex);
    if (!matches) {
        return;
    }

    // Lookup tab by conversation GUID.
    const tabId = conversationsTabs[matches[0]];
    if (tabId === undefined) {
        return;
    }
    
    // Execute content script to add download button.
    await runContentScript(tabId);
};

// Listen for history changes on chat.openai.com.
browser.webNavigation.onHistoryStateUpdated.addListener(listener, filter);
// Listen for HTTP requests to chat.openai.com/backend-api/conversation.
browser.webRequest.onCompleted.addListener(responseListener,
    {urls: ["https://chat.openai.com/backend-api/conversation/*"]});
