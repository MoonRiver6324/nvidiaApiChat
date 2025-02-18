// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 配置 marked
    marked.setOptions({
        highlight: function(code, lang) {
            if (window.hljs) {
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (err) {
                        console.error('Highlight error:', err);
                    }
                }
                try {
                    return hljs.highlightAuto(code).value;
                } catch (err) {
                    console.error('Highlight error:', err);
                }
            }
            return code; // 如果 hljs 不可用或高亮失败，返回原始代码
        },
        breaks: true,
        gfm: true,
        headerIds: true,
        langPrefix: 'hljs language-'
    });

    // 初始化页面
    initializePage();
});

// 初始化变量
let currentChatId = null;
let chats = JSON.parse(localStorage.getItem('chats')) || [];

// DOM 元素
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');

// 初始化页面
function initializePage() {
    updateChatList();
    if (chats.length > 0) {
        loadChat(chats[0].id);
    }
}

// 创建新聊天
function createNewChat() {
    const chatId = Date.now().toString();
    const newChat = {
        id: chatId,
        title: '新对话',
        messages: []
    };
    chats.unshift(newChat);
    saveChatToLocalStorage();
    updateChatList();
    loadChat(chatId);
}

// 更新聊天列表
function updateChatList() {
    chatList.innerHTML = '';
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <div class="flex justify-between items-center">
                <span>${chat.title}</span>
                <button class="delete-chat-btn text-red-500 hover:text-red-700" data-id="${chat.id}">×</button>
            </div>
        `;
        chatItem.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-chat-btn')) {
                loadChat(chat.id);
            }
        });
        chatList.appendChild(chatItem);
    });

    // 添加删除按钮事件监听
    document.querySelectorAll('.delete-chat-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteChat(e.target.dataset.id);
        });
    });
}

// 删除聊天
function deleteChat(chatId) {
    chats = chats.filter(chat => chat.id !== chatId);
    saveChatToLocalStorage();
    updateChatList();
    if (chatId === currentChatId) {
        currentChatId = chats.length > 0 ? chats[0].id : null;
        if (currentChatId) {
            loadChat(currentChatId);
        } else {
            chatMessages.innerHTML = '';
        }
    }
}

// 加载聊天
function loadChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;

    chatMessages.innerHTML = '';
    chat.messages.forEach(msg => {
        appendMessage(msg.role, msg.content);
    });
    updateChatList();
}

// 保存聊天到本地存储
function saveChatToLocalStorage() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

// 添加消息到界面
function appendMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    try {
        // 使用配置后的 marked 解析内容
        const parsedContent = marked.parse(content);
        messageDiv.innerHTML = parsedContent;
        
        // 对新添加的代码块应用高亮
        if (window.hljs) {
            messageDiv.querySelectorAll('pre code').forEach((block) => {
                try {
                    hljs.highlightElement(block);
                } catch (err) {
                    console.error('Highlight error:', err);
                }
            });
        }
    } catch (err) {
        console.error('Markdown parsing error:', err);
        messageDiv.textContent = content; // 如果解析失败，显示原始内容
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加加载指示器
function appendLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'typing-indicator message assistant-message';
    loadingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(loadingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return loadingDiv;
}

// 发送消息
async function sendMessage(message) {
    if (!currentChatId) {
        createNewChat();
    }

    const currentChat = chats.find(c => c.id === currentChatId);
    if (!currentChat) return;

    // 添加用户消息
    appendMessage('user', message);
    currentChat.messages.push({ role: 'user', content: message });

    // 添加加载指示器
    const loadingIndicator = appendLoadingIndicator();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: currentChat.messages
            })
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        let assistantDiv = null;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.content) {
                            assistantMessage += parsed.content;
                            
                            // 移除加载指示器
                            if (loadingIndicator) {
                                loadingIndicator.remove();
                            }

                            // 更新或创建助手消息
                            if (!assistantDiv) {
                                assistantDiv = document.createElement('div');
                                assistantDiv.className = 'message assistant-message';
                                chatMessages.appendChild(assistantDiv);
                            }

                            try {
                                // 使用 marked 解析整个消息
                                assistantDiv.innerHTML = marked.parse(assistantMessage);
                                
                                // 对所有代码块应用高亮
                                if (window.hljs) {
                                    assistantDiv.querySelectorAll('pre code').forEach((block) => {
                                        try {
                                            hljs.highlightElement(block);
                                        } catch (err) {
                                            console.error('Highlight error:', err);
                                        }
                                    });
                                }
                            } catch (err) {
                                console.error('Markdown parsing error:', err);
                                assistantDiv.textContent = assistantMessage;
                            }

                            // 滚动到底部
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }

        // 保存助手消息到聊天历史
        if (assistantMessage) {
            currentChat.messages.push({ role: 'assistant', content: assistantMessage });
            // 更新聊天标题（使用第一条消息的前20个字符）
            if (currentChat.messages.length === 2) {
                currentChat.title = message.slice(0, 20) + (message.length > 20 ? '...' : '');
                updateChatList();
            }
            saveChatToLocalStorage();
        }

    } catch (error) {
        console.error('Error:', error);
        appendMessage('assistant', '发生错误：' + error.message);
    } finally {
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
}

// 事件监听器
sendBtn.addEventListener('click', () => {
    const message = userInput.value.trim();
    console.log(message)
    if (message) {
        sendMessage(message);
        userInput.value = '';
    }
});

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
    }
});

newChatBtn.addEventListener('click', createNewChat);

// 初始化页面
initializePage(); 