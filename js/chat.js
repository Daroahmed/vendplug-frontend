// Chat functionality
class ChatManager {
    constructor() {
        this.socket = null;
        this.currentChatId = null;
        this.currentUser = null;
        this.chats = [];
        this.participants = [];
        this.typingTimeout = null;
        
        this.init();
    }

    async init() {
        // Get current user
        this.currentUser = JSON.parse(localStorage.getItem('vendplugUser'));
        if (!this.currentUser) {
            window.location.href = 'index.html';
            return;
        }

        // Initialize socket connection
        this.initSocket();
        
        // Load user chats
        await this.loadChats();
        
        // Setup event listeners
        this.setupEventListeners();
    }

    initSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('✅ Connected to chat server');
            this.socket.emit('join_user', { userId: this.currentUser.id });
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Disconnected from chat server');
        });

        this.socket.on('new_message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('message_reaction', (data) => {
            this.handleMessageReaction(data);
        });

        this.socket.on('message_reaction_removed', (data) => {
            this.handleMessageReactionRemoved(data);
        });

        this.socket.on('message_deleted', (data) => {
            this.handleMessageDeleted(data);
        });

        this.socket.on('user_typing', (data) => {
            this.handleTypingIndicator(data);
        });

        this.socket.on('message_read_status', (data) => {
            this.handleMessageReadStatus(data);
        });
    }

    setupEventListeners() {
        // Search functionality
        document.getElementById('chatSearch').addEventListener('input', (e) => {
            this.filterChats(e.target.value);
        });

        // Message input
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('input', (e) => {
            this.handleTyping(e.target.value);
            this.autoResizeTextarea(e.target);
        });

        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });
    }

    async loadChats() {
        try {
            const response = await fetch('/api/chats', {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load chats');
            }

            const data = await response.json();
            this.chats = data.data || [];
            this.renderChatList();
        } catch (error) {
            console.error('Error loading chats:', error);
            this.showError('Failed to load chats');
        }
    }

    renderChatList() {
        const chatList = document.getElementById('chatList');
        
        if (this.chats.length === 0) {
            chatList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comments"></i>
                    <h3>No conversations yet</h3>
                    <p>Start a new chat to begin messaging</p>
                </div>
            `;
            return;
        }

        chatList.innerHTML = this.chats.map(chat => {
            const otherParticipant = chat.participants.find(p => 
                p.user._id !== this.currentUser.id
            );
            
            const lastMessage = chat.lastMessage;
            const preview = lastMessage ? 
                (lastMessage.content.length > 50 ? 
                    lastMessage.content.substring(0, 50) + '...' : 
                    lastMessage.content) : 
                'No messages yet';

            return `
                <div class="chat-item" onclick="chatManager.selectChat('${chat._id}')" data-chat-id="${chat._id}">
                    <div class="chat-item-header">
                        <div class="chat-participant">${otherParticipant?.user?.fullName || 'Unknown'}</div>
                        <div class="chat-time">${this.formatTime(chat.lastMessageAt)}</div>
                    </div>
                    <div class="chat-preview">${preview}</div>
                    <div class="chat-meta">
                        <div class="chat-status">${this.getChatStatus(chat)}</div>
                        ${chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async selectChat(chatId) {
        this.currentChatId = chatId;
        
        // Update UI
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('active');

        // Show messages area
        document.getElementById('chatWelcome').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'block';
        document.getElementById('messageInputContainer').style.display = 'block';

        // Join chat room
        this.socket.emit('join_chat', { chatId, userId: this.currentUser.id });

        // Load messages
        await this.loadMessages(chatId);

        // Mark as read
        await this.markChatAsRead(chatId);
    }

    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            this.renderMessages(data.data || []);
        } catch (error) {
            console.error('Error loading messages:', error);
            this.showError('Failed to load messages');
        }
    }

    renderMessages(messages) {
        const messagesContainer = document.getElementById('chatMessages');
        
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-comment"></i>
                    <h3>No messages yet</h3>
                    <p>Start the conversation!</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = messages.map(message => {
            const isSent = message.sender._id === this.currentUser.id;
            const senderName = message.sender.fullName || 'Unknown';
            const initials = senderName.split(' ').map(n => n[0]).join('').toUpperCase();
            
            return `
                <div class="message ${isSent ? 'sent' : 'received'}" data-message-id="${message._id}">
                    <div class="message-avatar">${initials}</div>
                    <div class="message-content">
                        <p class="message-text">${this.escapeHtml(message.content)}</p>
                        <div class="message-time">${this.formatTime(message.createdAt)}</div>
                        ${message.reactions && message.reactions.length > 0 ? `
                            <div class="message-reactions">
                                ${message.reactions.map(reaction => `
                                    <span class="reaction" onclick="chatManager.toggleReaction('${message._id}', '${reaction.emoji}')">
                                        ${reaction.emoji} ${reaction.count || 1}
                                    </span>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${message.attachments && message.attachments.length > 0 ? `
                            <div class="message-attachments">
                                ${message.attachments.map(attachment => `
                                    <a href="${attachment.url}" target="_blank" class="attachment">
                                        <i class="fas fa-file"></i>
                                        ${attachment.originalName}
                                    </a>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();
        
        if (!content || !this.currentChatId) return;

        try {
            const response = await fetch(`/api/chats/${this.currentChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentUser.token}`
                },
                body: JSON.stringify({ content })
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            // Clear input
            messageInput.value = '';
            this.autoResizeTextarea(messageInput);

            // Reload messages to show the new one
            await this.loadMessages(this.currentChatId);
            await this.loadChats(); // Update chat list

        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message');
        }
    }

    handleNewMessage(data) {
        if (data.chatId === this.currentChatId) {
            // Reload messages if it's the current chat
            this.loadMessages(this.currentChatId);
        }
        
        // Update chat list
        this.loadChats();
    }

    handleMessageReaction(data) {
        // Update message reactions in real-time
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            // Reload messages to show updated reactions
            this.loadMessages(this.currentChatId);
        }
    }

    handleMessageReactionRemoved(data) {
        // Update message reactions in real-time
        const messageElement = document.querySelector(`[data-message-id="${data.messageId}"]`);
        if (messageElement) {
            // Reload messages to show updated reactions
            this.loadMessages(this.currentChatId);
        }
    }

    handleMessageDeleted(data) {
        if (data.chatId === this.currentChatId) {
            // Reload messages if it's the current chat
            this.loadMessages(this.currentChatId);
        }
    }

    handleTypingIndicator(data) {
        const typingIndicator = document.getElementById('typingIndicator');
        const typingText = document.getElementById('typingText');
        
        if (data.isTyping) {
            typingText.textContent = `${data.userName} is typing...`;
            typingIndicator.style.display = 'block';
        } else {
            typingIndicator.style.display = 'none';
        }
    }

    handleMessageReadStatus(data) {
        // Update read status in real-time
        console.log('Message read status updated:', data);
    }

    handleTyping(content) {
        if (!this.currentChatId) return;

        // Send typing start
        this.socket.emit('typing_start', {
            chatId: this.currentChatId,
            userId: this.currentUser.id,
            userName: this.currentUser.fullName
        });

        // Clear existing timeout
        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        // Set timeout to stop typing
        this.typingTimeout = setTimeout(() => {
            this.socket.emit('typing_stop', {
                chatId: this.currentChatId,
                userId: this.currentUser.id,
                userName: this.currentUser.fullName
            });
        }, 1000);
    }

    async markChatAsRead(chatId) {
        try {
            await fetch(`/api/chats/${chatId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                }
            });
        } catch (error) {
            console.error('Error marking chat as read:', error);
        }
    }

    async toggleReaction(messageId, emoji) {
        try {
            const response = await fetch(`/api/messages/${messageId}/reactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.currentUser.token}`
                },
                body: JSON.stringify({ emoji })
            });

            if (!response.ok) {
                throw new Error('Failed to add reaction');
            }

            // Reload messages to show updated reactions
            await this.loadMessages(this.currentChatId);

        } catch (error) {
            console.error('Error adding reaction:', error);
        }
    }

    async handleFileUpload(files) {
        if (!files || files.length === 0) return;

        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('attachments', file);
        });

        try {
            const response = await fetch(`/api/chats/${this.currentChatId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.currentUser.token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload files');
            }

            // Reload messages
            await this.loadMessages(this.currentChatId);
            await this.loadChats();

        } catch (error) {
            console.error('Error uploading files:', error);
            this.showError('Failed to upload files');
        }
    }

    triggerFileInput() {
        document.getElementById('fileInput').click();
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
    }

    filterChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        const searchTerm = query.toLowerCase();

        chatItems.forEach(item => {
            const participantName = item.querySelector('.chat-participant').textContent.toLowerCase();
            const preview = item.querySelector('.chat-preview').textContent.toLowerCase();
            
            if (participantName.includes(searchTerm) || preview.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    getChatStatus(chat) {
        if (chat.unreadCount > 0) {
            return 'Unread';
        }
        return 'Read';
    }

    formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // Less than 1 minute
            return 'Just now';
        } else if (diff < 3600000) { // Less than 1 hour
            return Math.floor(diff / 60000) + 'm ago';
        } else if (diff < 86400000) { // Less than 1 day
            return Math.floor(diff / 3600000) + 'h ago';
        } else {
            return date.toLocaleDateString();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        // Simple error display - you can enhance this
        alert(message);
    }
}

// New Chat Modal Functions
async function showNewChatModal() {
    document.getElementById('newChatModal').classList.add('show');
}

function closeNewChatModal() {
    document.getElementById('newChatModal').classList.remove('show');
    document.getElementById('chatParticipantType').value = '';
    document.getElementById('participantSelect').style.display = 'none';
    document.getElementById('chatParticipant').innerHTML = '<option value="">Select participant</option>';
}

async function loadParticipants() {
    const type = document.getElementById('chatParticipantType').value;
    const participantSelect = document.getElementById('participantSelect');
    const chatParticipant = document.getElementById('chatParticipant');
    
    if (!type) {
        participantSelect.style.display = 'none';
        return;
    }

    participantSelect.style.display = 'block';
    chatParticipant.innerHTML = '<option value="">Loading...</option>';

    try {
        const endpoint = type === 'Vendor' ? '/api/vendors' : '/api/agents';
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `Bearer ${chatManager.currentUser.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load participants');
        }

        const data = await response.json();
        const participants = data.data || [];

        chatParticipant.innerHTML = '<option value="">Select participant</option>' +
            participants.map(p => `<option value="${p._id}">${p.fullName || p.businessName || p.shopName}</option>`).join('');

    } catch (error) {
        console.error('Error loading participants:', error);
        chatParticipant.innerHTML = '<option value="">Error loading participants</option>';
    }
}

async function createNewChat() {
    const participantId = document.getElementById('chatParticipant').value;
    const participantType = document.getElementById('chatParticipantType').value;

    if (!participantId || !participantType) {
        alert('Please select a participant');
        return;
    }

    try {
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${chatManager.currentUser.token}`
            },
            body: JSON.stringify({
                participantId,
                participantType
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create chat');
        }

        const data = await response.json();
        
        // Close modal
        closeNewChatModal();
        
        // Reload chats
        await chatManager.loadChats();
        
        // Select the new chat
        chatManager.selectChat(data.data._id);

    } catch (error) {
        console.error('Error creating chat:', error);
        alert('Failed to create chat');
    }
}

// Support Ticket Functions
function showSupportModal() {
    document.getElementById('supportModal').classList.add('show');
}

function closeSupportModal() {
    document.getElementById('supportModal').classList.remove('show');
    document.getElementById('supportForm').reset();
}

async function createSupportTicket() {
    const form = document.getElementById('supportForm');
    const formData = new FormData(form);
    
    const ticketData = {
        category: formData.get('supportCategory'),
        subject: formData.get('supportSubject'),
        description: formData.get('supportDescription'),
        priority: formData.get('supportPriority')
    };

    if (!ticketData.category || !ticketData.subject || !ticketData.description) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch('/api/support/tickets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${chatManager.currentUser.token}`
            },
            body: JSON.stringify(ticketData)
        });

        if (!response.ok) {
            throw new Error('Failed to create support ticket');
        }

        const data = await response.json();
        
        // Close modal
        closeSupportModal();
        
        // Show success message
        alert('Support ticket created successfully!');
        
        // Optionally redirect to support tickets or show the ticket
        console.log('Support ticket created:', data.data);

    } catch (error) {
        console.error('Error creating support ticket:', error);
        alert('Failed to create support ticket');
    }
}

// Logout function
function logout() {
    localStorage.removeItem('vendplugUser');
    window.location.href = 'index.html';
}

// Initialize chat manager when page loads
let chatManager;
document.addEventListener('DOMContentLoaded', () => {
    chatManager = new ChatManager();
});
