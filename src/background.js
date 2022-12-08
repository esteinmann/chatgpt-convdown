/*
 * Copyright (C) 2022 Erik Steinmann
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function getFileName() {
    // Date formatting suggested by ChatGPT, asked for filename safe ISO date as string ...
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

function startup() {}

browser.runtime.onMessage.addListener(notify);
browser.runtime.onStartup.addListener(startup);
