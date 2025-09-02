// Background service worker for Arc Easel
chrome.runtime.onInstalled.addListener(() => {
    console.log('Arc Easel installed');
    
    // Initialize default data structure
    chrome.storage.local.set({
        easelData: {
            boards: {
                default: {
                    id: 'default',
                    name: 'Default Board',
                    createdAt: new Date().toISOString(),
                    color: '#667eea'
                }
            },
            items: {}
        }
    });
});

// Create context menu after startup
chrome.runtime.onStartup.addListener(() => {
    createContextMenu();
});

// Also create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    createContextMenu();
});

function createContextMenu() {
    try {
        chrome.contextMenus.removeAll(() => {
            chrome.contextMenus.create({
                id: "addToEasel",
                title: "Add to Arc Easel",
                contexts: ["page"]
            });
        });
    } catch (error) {
        console.error('Error creating context menu:', error);
    }
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "addToEasel") {
        await addTabToEasel(tab);
    }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveToEasel') {
        addPageToEasel(request.pageInfo).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'openEasel') {
        const easelUrl = chrome.runtime.getURL('easel.html');
        chrome.tabs.create({ url: easelUrl }).then(() => {
            sendResponse({ success: true });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }
});

// Function to add tab to easel
async function addTabToEasel(tab) {
    try {
        const data = await chrome.storage.local.get(['easelData']);
        const easelData = data.easelData || { boards: {}, items: {} };
        
        const item = {
            id: generateId(),
            title: tab.title || 'Untitled',
            url: tab.url,
            favicon: tab.favIconUrl,
            createdAt: new Date().toISOString(),
            boardId: 'default',
            position: getRandomPosition()
        };
        
        easelData.items[item.id] = item;
        await chrome.storage.local.set({ easelData });
        
        // Show notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="%23667eea" rx="8"/><text x="24" y="32" text-anchor="middle" fill="white" font-size="20">🎨</text></svg>',
            title: 'Arc Easel',
            message: `Added "${item.title}" to easel`
        }).catch(e => {
            console.log('Notifications not available');
        });
        
    } catch (error) {
        console.error('Error adding tab to easel:', error);
    }
}

// Function to add page info to easel
async function addPageToEasel(pageInfo) {
    try {
        const data = await chrome.storage.local.get(['easelData']);
        const easelData = data.easelData || { boards: {}, items: {} };
        
        const item = {
            id: generateId(),
            title: pageInfo.title || 'Untitled',
            url: pageInfo.url,
            favicon: pageInfo.favicon,
            createdAt: new Date().toISOString(),
            boardId: 'default',
            position: getRandomPosition()
        };
        
        easelData.items[item.id] = item;
        await chrome.storage.local.set({ easelData });
        
    } catch (error) {
        console.error('Error adding page to easel:', error);
    }
}

// Keyboard shortcut handler
chrome.commands.onCommand.addListener(async (command) => {
    try {
        switch (command) {
            case 'open-easel':
                const easelUrl = chrome.runtime.getURL('easel.html');
                await chrome.tabs.create({ url: easelUrl });
                break;
                
            case 'add-current-tab':
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    await addTabToEasel(tab);
                }
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
    }
});

// Utility functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getRandomPosition() {
    return {
        x: Math.random() * 400 + 50,
        y: Math.random() * 300 + 50
    };
}