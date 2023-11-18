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

const saveOptions = (e) => {
    e.preventDefault();    
    const formData = new FormData(document.querySelector("form"));
    browser.storage.local.set({
        iconType: formData.get("iconType"),
        downloadMethod: formData.get("downloadMethod")
    });
};

const replaceText = (id, messageKey) => {
    const el = document.querySelector(`#${id}`);
    if (el) {
        el.innerText = browser.i18n.getMessage(messageKey);
    }
};

const replaceOptionValue = (selectId, optionValue, messageKey) => {
    const el = document.querySelector(`#${selectId} option[value='${optionValue}']`);
    if (el) {
        el.innerText = browser.i18n.getMessage(messageKey);
    }
};

const localize = () => {
    // Replace text in divs.        
    replaceText("lbl_icon_type", "settingsIconStyle");
    replaceText("lbl_download_method", "settingsDownloadMethod");
    replaceText("btn_save", "save");
    // Replace text in options.
    replaceOptionValue("select_icon_type", "green", "optionIconGreen");
    replaceOptionValue("select_icon_type", "bootstrap", "optionIconBootstrap");
    replaceOptionValue("select_download_method", "dom", "optionDom");
    replaceOptionValue("select_download_method", "api", "optionApi");
};

const restoreOptions = () => {        
    const setCurrentChoice = (result) => {
        if (result.iconType) {                        
            document.querySelector("#select_icon_type").value = result.iconType;
        } else {            
            // Default
            document.querySelector("#select_icon_type").value = "green";
        }
        if (result.downloadMethod) {
            document.querySelector("#select_download_method").value = result.downloadMethod;
        } else {
            // Default
            document.querySelector("#select_download_method").value = "dom";
        }
    };

    const onError = (error) => {
        console.log(`Error: ${error}`);
    };
    
    // Translate the options UI if possible.
    localize();

    if (isChrome) {
        // Chrome (probably) pass callback to get().
        browser.storage.local.get(null, setCurrentChoice);
    } else {
        // On Firefox (probably) handle promise.        
        browser.storage.local.get().then(setCurrentChoice, onError);
    }
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);
