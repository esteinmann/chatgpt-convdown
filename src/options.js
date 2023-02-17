/*
 * Copyright (C) 2023 Erik Steinmann
 * 
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Add shim to make chrome supported when browser is used
var isChrome = false;
if (typeof browser === "undefined") {
    isChrome = true;
    browser = chrome;
}

function saveOptions(e) {
    e.preventDefault();    
    const formData = new FormData(document.querySelector("form"));
    browser.storage.local.set({
        iconType: formData.get("iconType")
    });
}

function restoreOptions() {
    function setCurrentChoice(result) {
        if (result.iconType) {
            // Check radio button from iconType value.
            document.querySelector("#radio_" + result.iconType).checked = true;
        } else {
            // Check first radio button.
            document.querySelector("#radio_green").checked = true;
        }
    }

    function onError(error) {
        console.log(`Error: ${error}`);
    }

    if (isChrome) {
        // Chrome (probably) pass callback to get().
        browser.storage.local.get("iconType", setCurrentChoice);
    } else {
        // On Firefox (probably) handle promise.
        browser.storage.local.get("iconType").then(setCurrentChoice, onError);
    }
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);