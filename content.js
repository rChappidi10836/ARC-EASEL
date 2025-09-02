// Content script for Arc Easel
// This script runs on all web pages to provide additional functionality

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentPageInfo') {
        sendResponse({
            title: document.title,
            url: window.location.href,
            favicon: getFaviconUrl()
        });
    }
    
    if (request.action === 'addCurrentPage') {
        addCurrentPageToEasel();
    }
});

// Function to get favicon URL
function getFaviconUrl() {
    const favicon = document.querySelector('link[rel="icon"]') || 
                   document.querySelector('link[rel="shortcut icon"]') ||
                   document.querySelector('link[rel="apple-touch-icon"]');
    
    if (favicon) {
        return favicon.href;
    }
    
    // Fallback to Google's favicon service
    return `https://www.google.com/s2/favicons?domain=${window.location.hostname}`;
}

// Function to add current page to easel
async function addCurrentPageToEasel() {
    try {
        const pageInfo = {
            title: document.title,
            url: window.location.href,
            favicon: getFaviconUrl()
        };
        
        // Send to background script to save
        chrome.runtime.sendMessage({
            action: 'saveToEasel',
            pageInfo: pageInfo
        });
        
        // Show a subtle notification
        showPageNotification('Added to Arc Easel!');
        
    } catch (error) {
        console.error('Error adding page to easel:', error);
    }
}

// Show notification on page
function showPageNotification(message) {
    // Check if notification already exists
    if (document.getElementById('arc-easel-notification')) return;
    
    const notification = document.createElement('div');
    notification.id = 'arc-easel-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;`
}


    