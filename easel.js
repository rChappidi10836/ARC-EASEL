// Arc Easel Main Application
class ArcEasel {
    constructor() {
        this.currentBoard = 'default';
        this.items = {};
        this.boards = {};
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.selectedItem = null;
        this.searchQuery = '';
        this.dragStartTime = 0;
        this.dragStartPos = { x: 0, y: 0 };
        this.itemElement = null;
        
        // Drawing functionality
        this.currentTool = 'select';
        this.isDrawing = false;
        this.drawingPaths = [];
        this.currentPath = [];
        this.penColor = '#3b82f6';
        this.textElements = [];
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupDrawingCanvas();
        this.setTool('select'); // Initialize with select tool
        this.renderBoard();
        this.renderBoards();
        this.renderTextElements();
        this.updateBoardSelector(); // Ensure dropdown is updated on init
    }
    
    async loadData() {
        try {
            let easelData;
            
            // Try Chrome storage first, fallback to localStorage
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const data = await chrome.storage.local.get(['easelData']);
                easelData = data.easelData || { boards: {}, items: {}, drawings: {}, texts: {} };
            } else {
                // Fallback to localStorage for regular web pages
                const stored = localStorage.getItem('easelData');
                easelData = stored ? JSON.parse(stored) : { boards: {}, items: {}, drawings: {}, texts: {} };
            }
            
            this.items = easelData.items || {};
            this.boards = easelData.boards || {};
            this.drawingPaths = easelData.drawings?.[this.currentBoard] || [];
            this.textElements = easelData.texts?.[this.currentBoard] || [];
            
            // Ensure default board exists
            if (!this.boards.default) {
                this.boards.default = {
                    id: 'default',
                    name: 'Default Board',
                    createdAt: new Date().toISOString(),
                    color: '#667eea'
                };
            }
            
            // Add test data if no items exist (for testing purposes)
            if (Object.keys(this.items).length === 0) {
                console.log('No items found, adding test items');
                const testItem1 = {
                    id: 'test1',
                    title: 'Google',
                    url: 'https://google.com',
                    favicon: null,
                    createdAt: new Date().toISOString(),
                    boardId: 'default',
                    position: { x: 100, y: 100 }
                };
                const testItem2 = {
                    id: 'test2',
                    title: 'GitHub',
                    url: 'https://github.com',
                    favicon: null,
                    createdAt: new Date().toISOString(),
                    boardId: 'default',
                    position: { x: 300, y: 150 }
                };
                this.items[testItem1.id] = testItem1;
                this.items[testItem2.id] = testItem2;
            }
            
            await this.saveData();
        } catch (error) {
            console.error('Error loading data:', error);
            // Initialize with empty data if loading fails
            this.items = {};
            this.boards = {
                default: {
                    id: 'default',
                    name: 'Default Board',
                    createdAt: new Date().toISOString(),
                    color: '#667eea'
                }
            };
            this.drawingPaths = [];
            this.textElements = [];
        }
    }
    
    async saveData() {
        try {
            let easelData;
            
            // Try Chrome storage first, fallback to localStorage
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const data = await chrome.storage.local.get(['easelData']);
                easelData = data.easelData || { drawings: {}, texts: {} };
                
                easelData.boards = this.boards;
                easelData.items = this.items;
                
                // Save drawings per board
                if (!easelData.drawings) easelData.drawings = {};
                easelData.drawings[this.currentBoard] = this.drawingPaths;
                
                // Save texts per board
                if (!easelData.texts) easelData.texts = {};
                easelData.texts[this.currentBoard] = this.textElements;
                
                await chrome.storage.local.set({ easelData });
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem('easelData');
                easelData = stored ? JSON.parse(stored) : { drawings: {}, texts: {} };
                
                easelData.boards = this.boards;
                easelData.items = this.items;
                
                // Save drawings per board
                if (!easelData.drawings) easelData.drawings = {};
                easelData.drawings[this.currentBoard] = this.drawingPaths;
                
                // Save texts per board
                if (!easelData.texts) easelData.texts = {};
                easelData.texts[this.currentBoard] = this.textElements;
                
                localStorage.setItem('easelData', JSON.stringify(easelData));
            }
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }
    
    setupEventListeners() {
        // Toolbar events
        document.getElementById('addItemBtn').addEventListener('click', () => this.showAddItemDialog());
        document.getElementById('addFirstItem')?.addEventListener('click', () => this.showAddItemDialog());
        document.getElementById('clearBoard').addEventListener('click', () => this.clearBoard());
        document.getElementById('sidebarToggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('searchBox').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('boardSelector').addEventListener('change', (e) => this.switchBoard(e.target.value));
        
        // Drawing tool events
        document.getElementById('selectTool').addEventListener('click', () => this.setTool('select'));
        document.getElementById('penTool').addEventListener('click', () => this.setTool('pen'));
        document.getElementById('arrowTool').addEventListener('click', () => this.setTool('arrow'));
        document.getElementById('eraserTool').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('textTool').addEventListener('click', () => this.setTool('text'));
        document.getElementById('penColor').addEventListener('change', (e) => this.penColor = e.target.value);
        document.getElementById('clearDrawings').addEventListener('click', () => this.clearDrawings());
        
        // Sidebar events
        document.getElementById('createBoardBtn').addEventListener('click', () => this.createBoard());
        
        // Canvas events
        const canvas = document.getElementById('canvas');
        canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        canvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
        
        // Drawing canvas events
        const drawingCanvas = document.getElementById('drawingCanvas');
        drawingCanvas.addEventListener('mousedown', (e) => this.handleDrawingStart(e));
        drawingCanvas.addEventListener('mousemove', (e) => this.handleDrawingMove(e));
        drawingCanvas.addEventListener('mouseup', () => this.handleDrawingEnd());
        drawingCanvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
        
        // Prevent context menu on canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Event delegation for dynamically created action buttons
        document.addEventListener('click', (e) => {
            // Handle item open button
            if (e.target.closest('.open-btn')) {
                const itemId = e.target.closest('.open-btn').dataset.itemId;
                console.log('Open button clicked via event delegation for item:', itemId);
                this.openItem(itemId);
                return;
            }
            
            // Handle item delete button
            if (e.target.closest('.delete-btn')) {
                const itemId = e.target.closest('.delete-btn').dataset.itemId;
                console.log('Delete button clicked via event delegation for item:', itemId);
                this.deleteItem(itemId);
                return;
            }
            
            // Handle board delete button
            if (e.target.closest('.delete-board-btn')) {
                const boardId = e.target.closest('.delete-board-btn').dataset.boardId;
                console.log('Delete board button clicked via event delegation for board:', boardId);
                this.deleteBoard(boardId);
                return;
            }
            
            // Handle preview refresh button
            if (e.target.closest('.preview-refresh')) {
                const iframe = e.target.closest('.live-preview').querySelector('.live-preview-frame');
                if (iframe) {
                    console.log('Refreshing live preview');
                    iframe.src = iframe.src;
                }
                return;
            }
        });
        
        // Handle iframe load/error events
        document.addEventListener('load', (e) => {
            if (e.target.classList && e.target.classList.contains('live-preview-frame')) {
                console.log('Live preview loaded:', e.target.dataset.url);
            }
        }, true);
        
        document.addEventListener('error', (e) => {
            if (e.target.classList && e.target.classList.contains('live-preview-frame')) {
                console.log('Live preview failed to load:', e.target.dataset.url);
                e.target.style.display = 'none';
                const fallback = e.target.nextElementSibling;
                if (fallback && fallback.classList.contains('preview-fallback')) {
                    fallback.style.display = 'block';
                }
            }
        }, true);
    }
    
    renderBoard() {
        const board = document.getElementById('board');
        const emptyState = document.getElementById('emptyState');
        
        // Get items for current board
        const boardItems = Object.values(this.items)
            .filter(item => item.boardId === this.currentBoard)
            .filter(item => this.searchQuery === '' || 
                item.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                item.url.toLowerCase().includes(this.searchQuery.toLowerCase()));
        
        // Clear existing items
        const existingItems = board.querySelectorAll('.item');
        existingItems.forEach(item => item.remove());
        
        if (boardItems.length === 0) {
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        boardItems.forEach(item => {
            const itemElement = this.createItemElement(item);
            board.appendChild(itemElement);
        });
    }
    
    createItemElement(item) {
        const div = document.createElement('div');
        div.className = 'item';
        div.dataset.id = item.id;
        div.style.left = item.position.x + 'px';
        div.style.top = item.position.y + 'px';
        
        div.innerHTML = `
            <div class="item-header">
                <img class="item-favicon" src="${item.favicon || this.getDefaultFavicon()}" 
                     onerror="this.src='${this.getDefaultFavicon()}'">
                <div class="item-title">${item.title}</div>
            </div>
            <div class="item-url ${item.screenshot || item.livePreview ? 'has-screenshot' : ''}">${this.truncateUrl(item.url)}</div>
            ${this.renderItemPreview(item)}
            <div class="item-actions">
                <button class="action-btn screenshot-btn" data-item-id="${item.id}" title="Capture Screenshot">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9,2V7.38L10.38,8.76L12,7.14L13.62,8.76L15,7.38V2H9M4,9V15H6V11.5L7.5,13L9,11.5V15H11V9H4M13,9V15H15V11.5L16.5,13L18,11.5V15H20V9H13M5,16V18H7V16H5M17,16V18H19V16H17M2,20V22H22V20H2Z" />
                    </svg>
                </button>
                <button class="action-btn open-btn" data-item-id="${item.id}" title="Open">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                    </svg>
                </button>
                <button class="action-btn delete-btn" data-item-id="${item.id}" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                </button>
            </div>
        `;
        
        // Add drag functionality
        div.addEventListener('mousedown', (e) => this.handleItemMouseDown(e, item));
        div.addEventListener('click', (e) => {
            // Handle screenshot button click (special case with menu)
            if (e.target.closest('.screenshot-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showScreenshotMenu(e, item.id);
                return;
            }
            
            // Allow all action buttons to work via event delegation - don't interfere
            if (e.target.closest('.action-btn')) {
                return;
            }
            
            // Only prevent default behavior if we're not dealing with action buttons
            // and we didn't just finish dragging
            if (!this.isDragging && Date.now() - this.dragStartTime > 200) {
                // Don't redirect on click, only on explicit open button
                e.preventDefault();
                e.stopPropagation();
            }
        });
        
        return div;
    }
    
    getDefaultFavicon() {
        return 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#6b7280">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,16.5L18,9.5L16.59,8.09L11,13.67L7.91,10.59L6.5,12L11,16.5Z"/>
            </svg>
        `);
    }
    
    truncateUrl(url) {
        try {
            const urlObj = new URL(url);
            let display = urlObj.hostname + urlObj.pathname;
            return display.length > 35 ? display.substring(0, 35) + '...' : display;
        } catch {
            return url.length > 35 ? url.substring(0, 35) + '...' : url;
        }
    }
    
    handleItemMouseDown(e, item) {
        if (e.target.closest('.action-btn')) return;
        
        e.preventDefault();
        this.isDragging = false;
        this.dragStartTime = Date.now();
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.selectedItem = item;
        
        const rect = e.target.getBoundingClientRect();
        const canvasRect = document.getElementById('canvas').getBoundingClientRect();
        
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        this.itemElement = e.target.closest('.item');
    }
    
    handleCanvasMouseMove(e) {
        if (!this.selectedItem) return;
        
        // Check if we've moved enough to start dragging
        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - this.dragStartPos.x, 2) + 
            Math.pow(e.clientY - this.dragStartPos.y, 2)
        );
        
        if (moveDistance > 5 && !this.isDragging) {
            this.isDragging = true;
            this.itemElement.classList.add('dragging');
            document.getElementById('canvas').classList.add('dragging');
        }
        
        if (!this.isDragging) return;
        
        const canvas = document.getElementById('canvas');
        const canvasRect = canvas.getBoundingClientRect();
        
        const x = e.clientX - canvasRect.left - this.dragOffset.x + canvas.scrollLeft;
        const y = e.clientY - canvasRect.top - this.dragOffset.y + canvas.scrollTop;
        
        if (this.itemElement) {
            this.itemElement.style.left = Math.max(0, x) + 'px';
            this.itemElement.style.top = Math.max(0, y) + 'px';
        }
    }
    
    handleCanvasMouseUp() {
        if (!this.selectedItem) return;
        
        const wasDragging = this.isDragging;
        
        if (this.isDragging && this.itemElement) {
            const x = parseInt(this.itemElement.style.left);
            const y = parseInt(this.itemElement.style.top);
            
            // Update item position
            this.items[this.selectedItem.id].position = { x, y };
            this.saveData();
            
            this.itemElement.classList.remove('dragging');
        }
        
        document.getElementById('canvas').classList.remove('dragging');
        this.isDragging = false;
        this.selectedItem = null;
        this.itemElement = null;
        
        // Return whether we were dragging (to prevent click event)
        return wasDragging;
    }
    
    handleCanvasMouseDown(e) {
        if (e.target === document.getElementById('canvas') || e.target === document.getElementById('board')) {
            // Deselect items
            document.querySelectorAll('.item').forEach(item => item.classList.remove('selected'));
        }
    }
    
    openItem(itemId) {
        console.log('openItem called with ID:', itemId);
        const item = this.items[itemId];
        console.log('Found item:', item);
        if (item && item.url) {
            console.log('Opening URL:', item.url);
            window.open(item.url, '_blank');
        } else {
            console.log('No item found or URL missing');
        }
    }
    
    async deleteItem(itemId) {
        console.log('deleteItem called with ID:', itemId);
        if (confirm('Are you sure you want to delete this item?')) {
            console.log('User confirmed deletion');
            delete this.items[itemId];
            await this.saveData();
            this.renderBoard();
        } else {
            console.log('User cancelled deletion');
        }
    }
    
    showAddItemDialog() {
        const url = prompt('Enter URL:');
        if (!url) return;
        
        const title = prompt('Enter title (optional):') || 'Untitled';
        
        this.addItem({
            url: url,
            title: title,
            favicon: null
        });
    }
    
    async addItem(itemData) {
        const item = {
            id: this.generateId(),
            title: itemData.title || 'Untitled',
            url: itemData.url,
            favicon: itemData.favicon,
            createdAt: new Date().toISOString(),
            boardId: this.currentBoard,
            position: { 
                x: Math.random() * 400 + 50, 
                y: Math.random() * 300 + 50 
            }
        };
        
        this.items[item.id] = item;
        await this.saveData();
        this.renderBoard();
        
        // Try to fetch favicon
        this.fetchFavicon(item);
    }
    
    async fetchFavicon(item) {
        try {
            const url = new URL(item.url);
            const faviconUrl = `${url.protocol}//${url.hostname}/favicon.ico`;
            
            // Test if favicon exists
            const img = new Image();
            img.onload = async () => {
                this.items[item.id].favicon = faviconUrl;
                await this.saveData();
                this.renderBoard();
            };
            img.src = faviconUrl;
        } catch (error) {
            // Use default favicon
        }
    }
    
    async switchBoard(boardId) {
        this.currentBoard = boardId;
        
        // Load drawings for this board
        try {
            let easelData;
            
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                const data = await chrome.storage.local.get(['easelData']);
                easelData = data.easelData || { drawings: {}, texts: {} };
            } else {
                const stored = localStorage.getItem('easelData');
                easelData = stored ? JSON.parse(stored) : { drawings: {}, texts: {} };
            }
            
            this.drawingPaths = easelData.drawings?.[this.currentBoard] || [];
            this.textElements = easelData.texts?.[this.currentBoard] || [];
            this.redrawCanvas();
            this.renderTextElements();
        } catch (error) {
            console.error('Error loading board drawings:', error);
            this.drawingPaths = [];
            this.textElements = [];
        }
        
        this.renderBoard();
        this.updateBoardSelector();
    }
    
    updateBoardSelector() {
        const selector = document.getElementById('boardSelector');
        if (!selector) {
            console.warn('Board selector not found, skipping update');
            return;
        }
        
        console.log('Updating board selector with boards:', Object.keys(this.boards));
        selector.innerHTML = '';
        
        Object.values(this.boards).forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.name;
            option.selected = board.id === this.currentBoard;
            selector.appendChild(option);
        });
        
        // Force dropdown refresh
        selector.value = this.currentBoard;
        
        console.log('Board selector updated, current board:', this.currentBoard);
    }
    
    async createBoard() {
        const name = prompt('Enter board name:');
        if (!name) return;
        
        console.log('Creating new board:', name);
        
        const board = {
            id: this.generateId(),
            name: name,
            createdAt: new Date().toISOString(),
            color: this.getRandomColor()
        };
        
        this.boards[board.id] = board;
        console.log('Board added, total boards:', Object.keys(this.boards).length);
        
        await this.saveData();
        this.renderBoards();
        this.updateBoardSelector();
        
        console.log('Board creation complete');
    }
    
    renderBoards() {
        const boardList = document.getElementById('boardList');
        boardList.innerHTML = '';
        
        Object.values(this.boards).forEach(board => {
            const div = document.createElement('div');
            div.className = 'board-item';
            if (board.id === this.currentBoard) {
                div.classList.add('active');
            }
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <div style="font-weight: 600; color: ${board.color};">${board.name}</div>
                        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
                            ${this.getBoardItemCount(board.id)} items
                        </div>
                    </div>
                    ${board.id !== 'default' ? `
                        <button class="action-btn delete-board-btn" data-board-id="${board.id}" title="Delete Board">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                            </svg>
                        </button>
                    ` : ''}
                </div>
            `;
            
            div.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
                    console.log('Switching to board from sidebar:', board.id, board.name);
                    this.switchBoard(board.id);
                    this.toggleSidebar();
                }
            });
            
            boardList.appendChild(div);
        });
    }
    
    getBoardItemCount(boardId) {
        return Object.values(this.items).filter(item => item.boardId === boardId).length;
    }
    
    async deleteBoard(boardId) {
        if (boardId === 'default') return;
        
        if (confirm(`Delete board "${this.boards[boardId].name}" and all its items?`)) {
            // Delete all items in this board
            Object.keys(this.items).forEach(itemId => {
                if (this.items[itemId].boardId === boardId) {
                    delete this.items[itemId];
                }
            });
            
            delete this.boards[boardId];
            
            // Switch to default board if current board was deleted
            if (this.currentBoard === boardId) {
                this.currentBoard = 'default';
            }
            
            await this.saveData();
            this.renderBoard();
            this.renderBoards();
            this.updateBoardSelector();
        }
    }
    
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    }
    
    handleSearch(query) {
        this.searchQuery = query;
        this.renderBoard();
    }
    
    async clearBoard() {
        if (confirm('Clear all items from this board?')) {
            Object.keys(this.items).forEach(itemId => {
                if (this.items[itemId].boardId === this.currentBoard) {
                    delete this.items[itemId];
                }
            });
            
            await this.saveData();
            this.renderBoard();
        }
    }
    
    handleKeyboard(e) {
        // Esc to close sidebar
        if (e.key === 'Escape') {
            document.getElementById('sidebar').classList.remove('open');
        }
        
        // Ctrl+N for new item
        if (e.ctrlKey && e.key === 'n') {
            e.preventDefault();
            this.showAddItemDialog();
        }
        
        // Delete selected item
        if (e.key === 'Delete' && this.selectedItem) {
            this.deleteItem(this.selectedItem.id);
        }
        
    }
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    getRandomColor() {
        const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#a8edea', '#fed6e3'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    setupDrawingCanvas() {
        const canvas = document.getElementById('drawingCanvas');
        const container = document.getElementById('canvas');
        
        // Set canvas size
        const resizeCanvas = () => {
            canvas.width = container.scrollWidth;
            canvas.height = container.scrollHeight;
            this.redrawCanvas();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        this.ctx = canvas.getContext('2d');
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Load saved drawings
        this.redrawCanvas();
    }
    
    setTool(tool) {
        this.currentTool = tool;
        
        // Update tool button states
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        // Update canvas pointer events
        const canvas = document.getElementById('drawingCanvas');
        if (tool === 'select') {
            canvas.classList.remove('drawing-mode');
        } else {
            canvas.classList.add('drawing-mode');
        }
    }
    
    handleDrawingStart(e) {
        if (this.currentTool === 'select') return;
        
        e.preventDefault();
        e.stopPropagation();
        
        this.isDrawing = true;
        const rect = e.target.getBoundingClientRect();
        const canvasContainer = document.getElementById('canvas');
        
        const x = e.clientX - rect.left + canvasContainer.scrollLeft;
        const y = e.clientY - rect.top + canvasContainer.scrollTop;
        
        if (this.currentTool === 'eraser') {
            this.eraseAtPoint(x, y);
        } else if (this.currentTool === 'text') {
            this.isDrawing = false; // Don't treat text as drawing
            this.createTextElement(x, y);
        } else {
            this.currentPath = [{
                x: x,
                y: y,
                tool: this.currentTool,
                color: this.penColor
            }];
            
            if (this.currentTool === 'pen') {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
            }
        }
    }
    
    handleDrawingMove(e) {
        if (!this.isDrawing || this.currentTool === 'select') return;
        
        e.preventDefault();
        
        const rect = e.target.getBoundingClientRect();
        const canvasContainer = document.getElementById('canvas');
        
        const x = e.clientX - rect.left + canvasContainer.scrollLeft;
        const y = e.clientY - rect.top + canvasContainer.scrollTop;
        
        if (this.currentTool === 'eraser') {
            this.eraseAtPoint(x, y);
        } else {
            this.currentPath.push({ x: x, y: y });
            
            if (this.currentTool === 'pen') {
                this.ctx.strokeStyle = this.penColor;
                this.ctx.lineWidth = 2;
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            } else if (this.currentTool === 'arrow') {
                // For arrows, we'll draw a preview
                this.redrawCanvas();
                this.drawArrowPreview();
            }
        }
    }
    
    handleDrawingEnd() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (this.currentPath && this.currentPath.length > 1) {
            this.drawingPaths.push([...this.currentPath]);
            this.saveData();
            
            if (this.currentTool === 'arrow') {
                this.redrawCanvas();
            }
        }
        
        this.currentPath = [];
    }
    
    handleArrowClick(x, y) {
        if (!this.isDrawingArrow) {
            // Start new arrow
            this.isDrawingArrow = true;
            this.arrowPoints = [{
                x: x,
                y: y,
                tool: 'arrow',
                color: this.penColor
            }];
        } else {
            // Add point to existing arrow
            this.arrowPoints.push({ x: x, y: y });
        }
        
        this.redrawCanvas();
        this.drawArrowPreview();
        
        // Show instructions to user
        this.showArrowInstructions();
    }
    
    finishArrow() {
        if (this.isDrawingArrow && this.arrowPoints.length >= 2) {
            this.drawingPaths.push([...this.arrowPoints]);
            this.saveData();
            this.redrawCanvas();
        }
        
        this.isDrawingArrow = false;
        this.arrowPoints = [];
        this.hideArrowInstructions();
    }
    
    cancelArrow() {
        this.isDrawingArrow = false;
        this.arrowPoints = [];
        this.redrawCanvas();
        this.hideArrowInstructions();
    }
    
    showArrowInstructions() {
        let instructions = document.getElementById('arrowInstructions');
        if (!instructions) {
            instructions = document.createElement('div');
            instructions.id = 'arrowInstructions';
            instructions.style.cssText = `
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(59, 130, 246, 0.9);
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 14px;
                z-index: 1001;
                backdrop-filter: blur(4px);
            `;
            document.body.appendChild(instructions);
        }
        
        const pointCount = this.arrowPoints.length;
        if (pointCount === 1) {
            instructions.textContent = 'Click to add arrow points • Double-click or press Enter to finish • Esc to cancel';
        } else {
            instructions.textContent = `Arrow: ${pointCount} points • Double-click or press Enter to finish • Esc to cancel`;
        }
    }
    
    hideArrowInstructions() {
        const instructions = document.getElementById('arrowInstructions');
        if (instructions) {
            instructions.remove();
        }
    }
    
    drawArrowPreview() {
        if (this.currentPath.length < 2) return;
        
        const start = this.currentPath[0];
        const end = this.currentPath[this.currentPath.length - 1];
        
        this.ctx.strokeStyle = this.penColor;
        this.ctx.lineWidth = 2;
        
        this.drawArrow(start.x, start.y, end.x, end.y);
    }
    
    drawArrow(fromX, fromY, toX, toY) {
        const headLength = 15;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Draw the line
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
        
        // Draw the arrowhead
        this.ctx.beginPath();
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
        this.ctx.moveTo(toX, toY);
        this.ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
        this.ctx.stroke();
    }
    
    redrawCanvas() {
        if (!this.ctx) return;
        
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        
        this.drawingPaths.forEach(path => {
            if (path.length < 2) return;
            
            const firstPoint = path[0];
            this.ctx.strokeStyle = firstPoint.color || '#3b82f6';
            this.ctx.lineWidth = 2;
            
            if (firstPoint.tool === 'pen') {
                this.ctx.beginPath();
                this.ctx.moveTo(firstPoint.x, firstPoint.y);
                
                for (let i = 1; i < path.length; i++) {
                    this.ctx.lineTo(path[i].x, path[i].y);
                }
                this.ctx.stroke();
            } else if (firstPoint.tool === 'arrow') {
                const lastPoint = path[path.length - 1];
                this.drawArrow(firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y);
            }
        });
    }
    
    eraseAtPoint(x, y) {
        const eraserRadius = 20; // Eraser size
        let pathsToRemove = [];
        let textsToRemove = [];
        let shouldUpdate = false;
        
        // Check each drawing path (pen strokes and arrows) for intersection with eraser
        this.drawingPaths.forEach((path, pathIndex) => {
            if (path.length < 2) return;
            
            // Check if any point in the path is within eraser radius
            for (let i = 0; i < path.length; i++) {
                const point = path[i];
                const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                
                if (distance <= eraserRadius) {
                    pathsToRemove.push(pathIndex);
                    break;
                }
            }
        });
        
        // Check each text element for intersection with eraser
        this.textElements.forEach((textElement, textIndex) => {
            // Create a bounding box around the text element
            const textWidth = textElement.text.length * (textElement.fontSize * 0.6); // Approximate text width
            const textHeight = textElement.fontSize;
            
            // Check if eraser point intersects with text bounding box
            if (x >= textElement.x - 5 && x <= textElement.x + textWidth + 5 &&
                y >= textElement.y - 5 && y <= textElement.y + textHeight + 5) {
                textsToRemove.push(textIndex);
            }
        });
        
        // Remove intersecting drawing paths
        if (pathsToRemove.length > 0) {
            pathsToRemove.sort((a, b) => b - a); // Sort in reverse order to avoid index shifting
            pathsToRemove.forEach(index => {
                this.drawingPaths.splice(index, 1);
            });
            shouldUpdate = true;
        }
        
        // Remove intersecting text elements
        if (textsToRemove.length > 0) {
            textsToRemove.sort((a, b) => b - a); // Sort in reverse order to avoid index shifting
            textsToRemove.forEach(index => {
                this.textElements.splice(index, 1);
            });
            shouldUpdate = true;
        }
        
        // Update canvas and save if anything was erased
        if (shouldUpdate) {
            this.redrawCanvas();
            this.renderTextElements();
            this.saveData();
        }
    }
    
    createTextElement(x, y) {
        // Create a temporary input element for text entry
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'text-input';
        input.style.left = x + 'px';
        input.style.top = y + 'px';
        input.style.color = this.penColor;
        input.placeholder = 'Enter text...';
        
        const board = document.getElementById('board');
        board.appendChild(input);
        
        input.focus();
        
        // Handle input completion
        const completeText = () => {
            const text = input.value.trim();
            if (text) {
                const textElement = {
                    id: this.generateId(),
                    text: text,
                    x: x,
                    y: y,
                    color: this.penColor,
                    fontSize: 16
                };
                
                this.textElements.push(textElement);
                this.saveData();
                this.renderTextElements();
            }
            board.removeChild(input);
        };
        
        input.addEventListener('blur', completeText);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                completeText();
            } else if (e.key === 'Escape') {
                board.removeChild(input);
            }
        });
    }
    
    renderTextElements() {
        // Remove existing text elements
        document.querySelectorAll('.text-element').forEach(el => el.remove());
        
        // Render current text elements
        const board = document.getElementById('board');
        this.textElements.forEach(textElement => {
            const div = document.createElement('div');
            div.className = 'text-element';
            div.textContent = textElement.text;
            div.style.left = textElement.x + 'px';
            div.style.top = textElement.y + 'px';
            div.style.color = textElement.color;
            div.style.fontSize = textElement.fontSize + 'px';
            div.dataset.id = textElement.id;
            
            // Add click event for editing
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editTextElement(textElement.id);
            });
            
            // Add double-click event for quick edit
            div.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.editTextElement(textElement.id);
            });
            
            board.appendChild(div);
        });
    }
    
    editTextElement(textId) {
        const textElement = this.textElements.find(t => t.id === textId);
        if (!textElement) return;
        
        // Hide the text element temporarily
        const textDiv = document.querySelector(`[data-id="${textId}"]`);
        if (textDiv) {
            textDiv.style.display = 'none';
        }
        
        // Create input for editing
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'text-input';
        input.value = textElement.text;
        input.style.left = textElement.x + 'px';
        input.style.top = textElement.y + 'px';
        input.style.color = textElement.color;
        input.style.fontSize = textElement.fontSize + 'px';
        
        const board = document.getElementById('board');
        board.appendChild(input);
        
        input.focus();
        input.select();
        
        // Handle input completion
        const completeEdit = () => {
            const newText = input.value.trim();
            if (newText && newText !== textElement.text) {
                textElement.text = newText;
                this.saveData();
            }
            
            board.removeChild(input);
            if (textDiv) {
                textDiv.style.display = 'block';
            }
            this.renderTextElements();
        };
        
        // Handle input cancellation
        const cancelEdit = () => {
            board.removeChild(input);
            if (textDiv) {
                textDiv.style.display = 'block';
            }
        };
        
        input.addEventListener('blur', completeEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                completeEdit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }
    
    async clearDrawings() {
        if (confirm('Clear all drawings and text from this board?')) {
            this.drawingPaths = [];
            this.textElements = [];
            await this.saveData();
            this.redrawCanvas();
            this.renderTextElements();
        }
    }
    
    async captureScreenshot(itemId) {
        const item = this.items[itemId];
        if (!item || !item.url) return;
        
        try {
            // Open URL in new tab for screenshot
            const newTab = window.open(item.url, '_blank');
            
            // Wait a bit for the page to load
            setTimeout(async () => {
                if (confirm('Is the page loaded? Click OK to capture screenshot, or Cancel to abort.')) {
                    try {
                        // Use HTML2Canvas or similar library for screenshot
                        // For now, we'll simulate with a placeholder or use a screenshot API
                        await this.captureWebsiteScreenshot(item);
                    } catch (error) {
                        console.error('Screenshot capture failed:', error);
                        alert('Screenshot capture failed. Please try again.');
                    }
                }
                newTab.close();
            }, 3000);
            
        } catch (error) {
            console.error('Error capturing screenshot:', error);
            alert('Could not capture screenshot. Try using the manual screenshot option.');
        }
    }
    
    async captureWebsiteScreenshot(item) {
        // For demo purposes, we'll use a placeholder screenshot service
        // In a real implementation, you might use:
        // 1. A screenshot API service
        // 2. Chrome Extension APIs (if this becomes an extension)
        // 3. Manual file upload
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    item.screenshot = event.target.result;
                    await this.saveData();
                    this.renderBoard();
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }
    
    showScreenshotMenu(event, itemId) {
        // Remove any existing menu
        const existingMenu = document.querySelector('.screenshot-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.className = 'screenshot-menu';
        menu.innerHTML = `
            <div class="menu-item" data-action="livePreview">🌐 Live Preview</div>
            <div class="menu-item" data-action="upload">📁 Upload Screenshot</div>
            <div class="menu-item" data-action="fullpage">🖥️ Capture Full Page</div>
            <div class="menu-item" data-action="area">✂️ Select Area</div>
            <div class="menu-item" data-action="remove">🗑️ Remove Preview</div>
        `;
        
        menu.style.position = 'absolute';
        menu.style.zIndex = '1001';
        menu.style.left = event.pageX + 'px';
        menu.style.top = event.pageY + 'px';
        
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                this.handleScreenshotAction(action, itemId);
                menu.remove();
            }
        });
        
        document.body.appendChild(menu);
        
        // Remove menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }
    
    async handleScreenshotAction(action, itemId) {
        const item = this.items[itemId];
        
        switch (action) {
            case 'livePreview':
                await this.enableLivePreview(itemId);
                break;
            case 'upload':
                await this.uploadScreenshot(itemId);
                break;
            case 'fullpage':
                await this.captureFullPage(itemId);
                break;
            case 'area':
                await this.captureSelectedArea(itemId);
                break;
            case 'remove':
                await this.removePreview(itemId);
                break;
        }
    }
    
    async uploadScreenshot(itemId) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    this.items[itemId].screenshot = event.target.result;
                    await this.saveData();
                    this.renderBoard();
                };
                reader.readAsDataURL(file);
            }
        });
        
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }
    
    async captureFullPage(itemId) {
        const item = this.items[itemId];
        if (!item || !item.url) return;
        
        // For demonstration, we'll open a new window and prompt for screenshot
        const newWindow = window.open(item.url, '_blank', 'width=1200,height=800');
        
        setTimeout(() => {
            alert('Please take a screenshot of the webpage and then use "Upload Screenshot" to add it to your item.');
            newWindow.close();
        }, 3000);
    }
    
    async captureSelectedArea(itemId) {
        alert('Area selection: Please take a screenshot of your desired area and use "Upload Screenshot" to add it.');
    }
    
    renderItemPreview(item) {
        if (item.livePreview) {
            return `
                <div class="item-preview live-preview">
                    <div class="preview-header">
                        <span class="preview-status">🌐 Live Preview</span>
                        <button class="preview-refresh" data-action="refresh">↻</button>
                    </div>
                    <iframe 
                        src="${item.url}" 
                        class="live-preview-frame"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        loading="lazy"
                        data-url="${item.url}">
                    </iframe>
                    <div class="preview-fallback" style="display: none;">
                        <div class="fallback-message">
                            <p>🔒 This site can't be previewed</p>
                            <p>Security restrictions prevent embedding</p>
                            <a href="${item.url}" target="_blank" class="fallback-link">Open in new tab →</a>
                        </div>
                    </div>
                </div>
            `;
        } else if (item.screenshot) {
            return `
                <div class="item-screenshot">
                    <img src="${item.screenshot}" alt="Screenshot" />
                </div>
            `;
        }
        return '';
    }
    
    async enableLivePreview(itemId) {
        console.log('Enabling live preview for item:', itemId);
        this.items[itemId].livePreview = true;
        // Remove screenshot if it exists (can't have both)
        if (this.items[itemId].screenshot) {
            delete this.items[itemId].screenshot;
        }
        await this.saveData();
        this.renderBoard();
    }
    
    async removePreview(itemId) {
        if (confirm('Remove preview from this item?')) {
            delete this.items[itemId].screenshot;
            delete this.items[itemId].livePreview;
            await this.saveData();
            this.renderBoard();
        }
    }
    
    async removeScreenshot(itemId) {
        // Legacy method - redirect to removePreview
        await this.removePreview(itemId);
    }
    
    selectScreenshotArea(itemId) {
        // This would implement area selection for partial screenshots
        // For now, we'll use the same capture method
        this.captureScreenshot(itemId);
    }
}

// Initialize the easel when page loads
let easel;
document.addEventListener('DOMContentLoaded', () => {
    easel = new ArcEasel();
    
    console.log('ArcEasel initialized with CSP-compliant event delegation');
});