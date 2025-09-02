// Popup functionality for Arc Easel
document.addEventListener('DOMContentLoaded', function() {
    loadStats();
    loadRecentItems();
    
    // Event listeners
    document.getElementById('openEasel').addEventListener('click', openEasel);
    document.getElementById('addCurrentTab').addEventListener('click', addCurrentTab);
    document.getElementById('addAllTabs').addEventListener('click', addAllTabs);
    document.getElementById('createBoard').addEventListener('click', createBoard);
});

async function loadStats() {
    try {
        const data = await chrome.storage.local.get(['easelData']);
        const easelData = data.easelData || { boards: {}, items: {} };
        
        const totalItems = Object.keys(easelData.items).length;
        const totalBoards = Object.keys(easelData.boards).length;
        
        document.getElementById('totalItems').textContent = totalItems;
        document.getElementById('totalBoards').textContent = totalBoards;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadRecentItems() {
    try {
        const data = await chrome.storage.local.get(['easelData']);
        const easelData = data.easelData || { boards: {}, items: {} };
        
        const items = Object.values(easelData.items)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);
        
        const recentItemsContainer = document.getElementById('recentItems');
        
        if (items.length === 0) {
            recentItemsContainer.innerHTML = '<div class="recent-item"><span>No recent items</span></div>';
            return;
        }
        
        recentItemsContainer.innerHTML = items.map(item => `
            <div class="recent-item">
                <img src="${item.favicon || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="%23ddd"/></svg>'}" onerror="this.style.display='none'">
                <span title="${item.title}">${item.title.length > 25 ? item.title.substring(0, 25) + '...' : item.title}</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading recent items:', error);
    }
}

async function openEasel() {
    try {
        const easelUrl = chrome.runtime.getURL('easel.html');
        await chrome.tabs.create({ url: easelUrl });
        window.close();
    } catch (error) {
        console.error('Error opening easel:', error);
    }
}

async function addCurrentTab() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) return;
        
        const item = {
            id: generateId(),
            title: tab.title || 'Untitled',
            url: tab.url,
            favicon: tab.favIconUrl,
            createdAt: new Date().toISOString(),
            boardId: 'default',
            position: { x: Math.random() * 300, y: Math.random() * 200 }
        };
        
        await saveItem(item);
        await showNotification('Tab added to easel!');
        await loadStats();
        await loadRecentItems();
        
    } catch (error) {
        console.error('Error adding current tab:', error);
    }
}

async function addAllTabs() {
    try {
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const items = [];
        
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            items.push({
                id: generateId(),
                title: tab.title || 'Untitled',
                url: tab.url,
                favicon: tab.favIconUrl,
                createdAt: new Date().toISOString(),
                boardId: 'default',
                position: { x: (i % 4) * 200 + 50, y: Math.floor(i / 4) * 150 + 50 }
            });
        }
        
        for (const item of items) {
            await saveItem(item);
        }
        
        await showNotification(`${tabs.length} tabs added to easel!`);
        await loadStats();
        await loadRecentItems();
        
    } catch (error) {
        console.error('Error adding all tabs:', error);
    }
}

async function createBoard() {
    const boardName = prompt('Enter board name:');
    if (!boardName) return;
    
    try {
        const board = {
            id: generateId(),
            name: boardName,
            createdAt: new Date().toISOString(),
            color: getRandomColor()
        };
        
        await saveBoard(board);
        await showNotification(`Board "${boardName}" created!`);
        await loadStats();
        
    } catch (error) {
        console.error('Error creating board:', error);
    }
}

async function saveItem(item) {
    const data = await chrome.storage.local.get(['easelData']);
    const easelData = data.easelData || { boards: {}, items: {} };
    
    easelData.items[item.id] = item;
    
    // Ensure default board exists
    if (!easelData.boards.default) {
        easelData.boards.default = {
            id: 'default',
            name: 'Default Board',
            createdAt: new Date().toISOString(),
            color: '#667eea'
        };
    }
    
    await chrome.storage.local.set({ easelData });
}

async function saveBoard(board) {
    const data = await chrome.storage.local.get(['easelData']);
    const easelData = data.easelData || { boards: {}, items: {} };
    
    easelData.boards[board.id] = board;
    await chrome.storage.local.set({ easelData });
}

async function showNotification(message) {
    // Simple notification - could be enhanced with chrome.notifications API
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 10px 15px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 1000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 2000);
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getRandomColor() {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];
    return colors[Math.floor(Math.random() * colors.length)];
}