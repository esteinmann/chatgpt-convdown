/*
 * Copyright (C) 2022 Erik Steinmann
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Filter so the history update events are only triggered for chat.openai.com.
const filter = {    
    url: [{hostEquals: "chat.openai.com"}]
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
    } catch (error) {
        console.error(error);
    }
};

// Listen for history changes on chat.openai.com.
browser.webNavigation.onHistoryStateUpdated.addListener(listener, filter);
