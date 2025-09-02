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
        
        this.init();
    }
    
    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupDrawingCanvas();
        this.setTool('select'); // Initialize with select tool
        this.renderBoard();
        this.renderBoards();
    }
    
    async loadData() {
        try {
            const data = await chrome.storage.local.get(['easelData']);
            const easelData = data.easelData || { boards: {}, items: {}, drawings: {} };
            
            this.items = easelData.items || {};
            this.boards = easelData.boards || {};
            this.drawingPaths = easelData.drawings?.[this.currentBoard] || [];
            
            // Ensure default board exists
            if (!this.boards.default) {
                this.boards.default = {
                    id: 'default',
                    name: 'Default Board',
                    createdAt: new Date().toISOString(),
                    color: '#667eea'
                };
                await this.saveData();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    async saveData() {
        try {
            const data = await chrome.storage.local.get(['easelData']);
            const easelData = data.easelData || { drawings: {} };
            
            easelData.boards = this.boards;
            easelData.items = this.items;
            
            // Save drawings per board
            if (!easelData.drawings) easelData.drawings = {};
            easelData.drawings[this.currentBoard] = this.drawingPaths;
            
            await chrome.storage.local.set({ easelData });
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
        
        // Prevent context menu on canvas
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
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
            <div class="item-url ${item.screenshot ? 'has-screenshot' : ''}">${this.truncateUrl(item.url)}</div>
            ${item.screenshot ? `<div class="item-screenshot"><img src="${item.screenshot}" alt="Screenshot" /></div>` : ''}
            <div class="item-actions">
                <button class="action-btn screenshot-btn" data-item-id="${item.id}" title="Capture Screenshot">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9,2V7.38L10.38,8.76L12,7.14L13.62,8.76L15,7.38V2H9M4,9V15H6V11.5L7.5,13L9,11.5V15H11V9H4M13,9V15H15V11.5L16.5,13L18,11.5V15H20V9H13M5,16V18H7V16H5M17,16V18H19V16H17M2,20V22H22V20H2Z" />
                    </svg>
                </button>
                <button class="action-btn" onclick="easel.openItem('${item.id}')" title="Open">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z" />
                    </svg>
                </button>
                <button class="action-btn" onclick="easel.deleteItem('${item.id}')" title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                    </svg>
                </button>
            </div>
        `;
        
        // Add drag functionality
        div.addEventListener('mousedown', (e) => this.handleItemMouseDown(e, item));
        div.addEventListener('click', (e) => {
            // Handle screenshot button click
            if (e.target.closest('.screenshot-btn')) {
                e.preventDefault();
                e.stopPropagation();
                this.showScreenshotMenu(e, item.id);
                return;
            }
            
            // Allow other action buttons to work - don't interfere with their onclick handlers
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
        const item = this.items[itemId];
        if (item && item.url) {
            window.open(item.url, '_blank');
        }
    }
    
    async deleteItem(itemId) {
        if (confirm('Are you sure you want to delete this item?')) {
            delete this.items[itemId];
            await this.saveData();
            this.renderBoard();
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
            const data = await chrome.storage.local.get(['easelData']);
            const easelData = data.easelData || { drawings: {} };
            this.drawingPaths = easelData.drawings?.[this.currentBoard] || [];
            this.redrawCanvas();
        } catch (error) {
            console.error('Error loading board drawings:', error);
            this.drawingPaths = [];
        }
        
        this.renderBoard();
        this.updateBoardSelector();
    }
    
    updateBoardSelector() {
        const selector = document.getElementById('boardSelector');
        selector.innerHTML = '';
        
        Object.values(this.boards).forEach(board => {
            const option = document.createElement('option');
            option.value = board.id;
            option.textContent = board.name;
            option.selected = board.id === this.currentBoard;
            selector.appendChild(option);
        });
    }
    
    async createBoard() {
        const name = prompt('Enter board name:');
        if (!name) return;
        
        const board = {
            id: this.generateId(),
            name: name,
            createdAt: new Date().toISOString(),
            color: this.getRandomColor()
        };
        
        this.boards[board.id] = board;
        await this.saveData();
        this.renderBoards();
        this.updateBoardSelector();
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
                        <button class="action-btn" onclick="easel.deleteBoard('${board.id}')" title="Delete Board">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                            </svg>
                        </button>
                    ` : ''}
                </div>
            `;
            
            div.addEventListener('click', (e) => {
                if (!e.target.closest('.action-btn')) {
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
    
    handleDrawingMove(e) {
        if (!this.isDrawing || this.currentTool === 'select') return;
        
        e.preventDefault();
        
        const rect = e.target.getBoundingClientRect();
        const canvasContainer = document.getElementById('canvas');
        
        const x = e.clientX - rect.left + canvasContainer.scrollLeft;
        const y = e.clientY - rect.top + canvasContainer.scrollTop;
        
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
    
    handleDrawingEnd() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (this.currentPath.length > 1) {
            this.drawingPaths.push([...this.currentPath]);
            this.saveData();
            
            if (this.currentTool === 'arrow') {
                this.redrawCanvas();
            }
        }
        
        this.currentPath = [];
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
    
    async clearDrawings() {
        if (confirm('Clear all drawings from this board?')) {
            this.drawingPaths = [];
            await this.saveData();
            this.redrawCanvas();
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
            <div class="menu-item" data-action="upload">📁 Upload Screenshot</div>
            <div class="menu-item" data-action="fullpage">🖥️ Capture Full Page</div>
            <div class="menu-item" data-action="area">✂️ Select Area</div>
            <div class="menu-item" data-action="remove">🗑️ Remove Screenshot</div>
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
                await this.removeScreenshot(itemId);
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
    
    async removeScreenshot(itemId) {
        if (confirm('Remove screenshot from this item?')) {
            delete this.items[itemId].screenshot;
            await this.saveData();
            this.renderBoard();
        }
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
});

// Global functions for onclick handlers
window.easel = {
    openItem: (id) => easel.openItem(id),
    deleteItem: (id) => easel.deleteItem(id),
    deleteBoard: (id) => easel.deleteBoard(id),
    captureScreenshot: (id) => easel.captureScreenshot(id)
};