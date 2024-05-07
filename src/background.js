/*
 * Copyright (C) 2022 Erik Steinmann
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Add shim to make chrome supported when browser is used
if (typeof browser === "undefined") {
    browser = chrome;
}

var activeTabId = null;

// Filter so the history update events are only triggered for chat.openai.com.
const filter = {    
    url: [
        {hostEquals: "chat.openai.com"},
        {hostEquals: "chatgpt.com"}]
};

const listener = async (evt) => {
    // Filter out any sub-frame related navigation event.
    if (evt.frameId !== 0) {
        return;
    }
    
    // TODO Make logging configurable (to disable it in release mode for example) 
    console.log("history updated: " + evt.url);
    
    // Execute content script to add download button.
    try {
        await browser.tabs.executeScript(evt.tabId, {
            file: "/download-button.js"
        });
        activeTabId = evt.tabId;
    } catch (error) {
        console.error(error);
    }
};

// Listen for history changes on chat.openai.com.
browser.webNavigation.onHistoryStateUpdated.addListener(listener, filter);

// Listen for command execution.
browser.commands.onCommand.addListener((command) => {
    if (!activeTabId) {
        return;
    }

    switch(command) {
        case "download":
            browser.tabs.sendMessage(activeTabId, { type: "download" });
            break;
        case "copy":
            browser.tabs.sendMessage(activeTabId, { type: "copy"});
            break;    
    }    
});