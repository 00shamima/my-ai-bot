import React, { useState, useEffect, useRef } from 'react';

export default function App() {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [attachedFile, setAttachedFile] = useState(null);
    const [isConfirmingNewChat, setIsConfirmingNewChat] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editingMessageText, setEditingMessageText] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [isConfirmingDeleteChat, setIsConfirmingDeleteChat] = useState(false);
    const [chatToDelete, setChatToDelete] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const apiKey = "AIzaSyCOzU3P1mIeF81-7T3oN_jaRLhQiUguu3M";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    const systemPrompt = "You are a helpful and creative AI assistant named Gemini. Your responses should be conversational, friendly, and informative.";

    const suggestions = [
        "What is the capital of France?",
        "Explain quantum computing simply.",
        "Tell me a fun fact about space.",
        "Write a short poem about the ocean."
    ];

    // --- LOCAL STORAGE FUNCTIONALITY ---
    // Load chat history from localStorage on initial render
    useEffect(() => {
        try {
            const storedChats = localStorage.getItem('chatHistory');
            if (storedChats) {
                const parsedChats = JSON.parse(storedChats);
                setChatHistory(parsedChats);
                if (parsedChats.length > 0) {
                    const latestChat = parsedChats[0];
                    setCurrentChatId(latestChat.id);
                    setMessages(latestChat.messages);
                } else {
                    setCurrentChatId(null);
                    setMessages([]);
                }
            } else {
                setChatHistory([]);
                setMessages([]);
                setCurrentChatId(null);
            }
        } catch (error) {
            console.error("Failed to load chat history from localStorage", error);
            setChatHistory([]);
            setMessages([]);
            setCurrentChatId(null);
        }
    }, []);

    // Save chat history to localStorage whenever it changes
    useEffect(() => {
        try {
            if (chatHistory.length > 0) {
                localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
            } else {
                localStorage.removeItem('chatHistory');
            }
        } catch (error) {
            console.error("Failed to save chat history to localStorage", error);
        }
    }, [chatHistory]);
    // --- END OF LOCAL STORAGE FUNCTIONALITY ---

    // Update messages when the current chat ID changes
    useEffect(() => {
        const currentChat = chatHistory.find(chat => chat.id === currentChatId);
        if (currentChat) {
            setMessages(currentChat.messages);
        } else {
            setMessages([]);
        }
    }, [currentChatId, chatHistory]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const sendMessage = async (query) => {
        setIsLoading(true);
        const newUserMessage = { id: crypto.randomUUID(), text: query, sender: 'user', timestamp: Date.now() };

        let activeChatId = currentChatId;
        if (!activeChatId) {
            const newChatId = Date.now().toString();
            activeChatId = newChatId;
            const newChat = {
                id: newChatId,
                title: query.length > 30 ? query.substring(0, 30) + '...' : query,
                messages: [newUserMessage],
                lastUpdated: Date.now(),
            };
            setChatHistory(prevHistory => [newChat, ...prevHistory]);
            setCurrentChatId(newChatId);
        } else {
            setChatHistory(prevHistory =>
                prevHistory.map(chat =>
                    chat.id === activeChatId
                        ? { ...chat, messages: [...chat.messages, newUserMessage], lastUpdated: Date.now() }
                        : chat
                ).sort((a,b) => b.lastUpdated - a.lastUpdated)
            );
        }

        try {
            const payload = {
                contents: [{ parts: [{ text: query }] }],
                tools: [{ "google_search": {} }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
            };

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API call failed with status: ${response.status}`);
            }

            const result = await response.json();
            const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
            const newBotMessage = { id: crypto.randomUUID(), text, sender: 'bot', timestamp: Date.now() };

            setChatHistory(prevHistory =>
                prevHistory.map(chat =>
                    chat.id === activeChatId
                        ? { ...chat, messages: [...chat.messages, newBotMessage], lastUpdated: Date.now() }
                        : chat
                ).sort((a,b) => b.lastUpdated - a.lastUpdated)
            );
        } catch (error) {
            console.error("Error with API call or localStorage:", error);
            const errorMessage = "Oops! Something went wrong. Please try again later.";
            const newErrorMessage = { id: crypto.randomUUID(), text: errorMessage, sender: 'bot', timestamp: Date.now() };

            setChatHistory(prevHistory =>
                prevHistory.map(chat =>
                    chat.id === activeChatId
                        ? { ...chat, messages: [...chat.messages, newErrorMessage], lastUpdated: Date.now() }
                        : chat
                ).sort((a,b) => b.lastUpdated - a.lastUpdated)
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setAttachedFile({ name: file.name, content: event.target.result });
            };
            reader.readAsText(file);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        let query = userInput.trim();
        if (!query && !attachedFile) return;

        if (attachedFile) {
            query = `Here is the content of a file named '${attachedFile.name}':\n\n${attachedFile.content}\n\nMy query is: ${query}`;
            setAttachedFile(null);
        }

        sendMessage(query);
        setUserInput('');
    };

    const handleDeleteMessage = (messageId) => {
        setChatHistory(prevHistory =>
            prevHistory.map(chat =>
                chat.id === currentChatId
                    ? {
                        ...chat,
                        messages: chat.messages.filter(msg => msg.id !== messageId)
                    }
                    : chat
            )
        );
    };

    const handleDeleteChat = (chatId) => {
        setChatHistory(prevHistory => {
            const newHistory = prevHistory.filter(chat => chat.id !== chatId);
            if (currentChatId === chatId) {
                if (newHistory.length > 0) {
                    setCurrentChatId(newHistory[0].id);
                } else {
                    setCurrentChatId(null);
                }
            }
            return newHistory;
        });
        setIsConfirmingDeleteChat(false);
        setChatToDelete(null);
    };

    const confirmDeleteChat = (chatId) => {
        setChatToDelete(chatId);
        setIsConfirmingDeleteChat(true);
    };

    const cancelDeleteChat = () => {
        setIsConfirmingDeleteChat(false);
        setChatToDelete(null);
    };

    const handleStartEdit = (message) => {
        setEditingMessageId(message.id);
        setEditingMessageText(message.text);
    };

    const handleSaveEdit = (e) => {
        e.preventDefault();
        if (!editingMessageId || !editingMessageText.trim()) {
            return;
        }

        setChatHistory(prevHistory =>
            prevHistory.map(chat =>
                chat.id === currentChatId
                    ? {
                        ...chat,
                        messages: chat.messages.map(msg =>
                            msg.id === editingMessageId ? { ...msg, text: editingMessageText.trim() } : msg
                        )
                    }
                    : chat
            )
        );

        setEditingMessageId(null);
        setEditingMessageText('');
    };

    const handleNewChat = () => {
        setIsConfirmingNewChat(true);
    };

    const confirmNewChat = () => {
        const newChat = {
            id: Date.now().toString(),
            title: "New Chat",
            messages: [],
            lastUpdated: Date.now(),
        };
        setChatHistory(prevHistory => [newChat, ...prevHistory]);
        setCurrentChatId(newChat.id);
        setIsConfirmingNewChat(false);
    };

    const cancelNewChat = () => {
        setIsConfirmingNewChat(false);
    };

    const handleSwitchChat = (chatId) => {
        setCurrentChatId(chatId);
    };

    const renderChatContent = () => {
        if (!currentChatId || messages.length === 0) {
            return (
                <div className="empty-state">
                    <h1 className="title">Ai-bot</h1>
                    <p className="subtitle">Hello! I'm Ai-bot, your friendly chatbot. How can I help you today?</p>
                    <div className="suggestions-grid">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={() => sendMessage(suggestion)}
                                className="suggestion-button"
                            >
                                <p>{suggestion}</p>
                            </button>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="messages-container">
                {messages.map((message) => (
                    <div key={message.id} className={`message-wrapper ${message.sender === 'user' ? 'user' : 'bot'}`}>
                        {editingMessageId === message.id ? (
                            <form onSubmit={handleSaveEdit} className="edit-form">
                                <textarea
                                    className="edit-input"
                                    value={editingMessageText}
                                    onChange={(e) => setEditingMessageText(e.target.value)}
                                    autoFocus
                                    rows="1"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSaveEdit(e);
                                        } else if (e.key === 'Escape') {
                                            setEditingMessageId(null);
                                        }
                                    }}
                                />
                                <button type="submit" className="edit-button save-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                </button>
                                <button type="button" onClick={() => setEditingMessageId(null)} className="edit-button cancel-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </form>
                        ) : (
                            <div className={`message-bubble ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}>
                                {message.text}
                                <div className="message-actions">
                                    <button onClick={() => handleStartEdit(message)} className="action-button edit-action">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14.25v2.25M6 14.25v2.25M4.5 14.25v2.25" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleDeleteMessage(message.id)} className="action-button delete-action">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9.5l-3.23 3.23a.75.75 0 01-1.06 0L8.24 9.5a.75.75 0 011.06-1.06L12 10.44l3.24-3.23a.75.75 0 011.06 1.06L13.06 12l3.23 3.23a.75.75 0 01-1.06 1.06l-3.23-3.23-3.23 3.23a.75.75 0 01-1.06-1.06l3.23-3.23L8.24 9.5a.75.75 0 011.06-1.06L12 10.44l3.24-3.23a.75.75 0 011.06 1.06z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="message-wrapper bot">
                        <div className="message-bubble bot-message loading">
                            <div className="dot"></div>
                            <div className="dot"></div>
                            <div className="dot"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        );
    };

    return (
        <div className={`app-container ${theme}-theme`}>
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2 className="header-title">History</h2>
                    <button
                        onClick={handleNewChat}
                        className="chat-new-button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        New Chat
                    </button>
                </div>
                <div className="chat-history">
                    {chatHistory.map(chat => (
                        <div
                            key={chat.id}
                            className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
                            onClick={() => handleSwitchChat(chat.id)}
                        >
                            <span className="history-title">{chat.title}</span>
                            <button
                                className="history-delete-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDeleteChat(chat.id);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="main-content">
                <header className="header">
                    <div className="header-title">Chatbot</div>
                    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="theme-toggle-button">
                        {theme === 'dark' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.5a.5.5 0 01.5.5v1a.5.5 0 01-1 0V3a.5.5 0 01.5-.5zM5.5 4.5a.5.5 0 01.5.5v1a.5.5 0 01-1 0V5a.5.5 0 01.5-.5zM3 12a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM19 12a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM5.5 18.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM12 20.5a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1a.5.5 0 01.5-.5zM18.5 18.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM18.5 5.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM12 6.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                            </svg>
                        )}
                    </button>
                </header>

                {renderChatContent()}

                {(isConfirmingNewChat || isConfirmingDeleteChat) && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h2 className="modal-header">
                                {isConfirmingNewChat ? "Confirm New Chat" : "Confirm Deletion"}
                            </h2>
                            <p className="modal-body">
                                {isConfirmingNewChat ? "Are you sure you want to start a new chat?" : "Are you sure you want to delete this chat?"}
                            </p>
                            <div className="modal-actions">
                                <button
                                    onClick={isConfirmingNewChat ? cancelNewChat : cancelDeleteChat}
                                    className="modal-button modal-cancel-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={isConfirmingNewChat ? confirmNewChat : () => handleDeleteChat(chatToDelete)}
                                    className="modal-button modal-confirm-button"
                                >
                                    {isConfirmingNewChat ? "New Chat" : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <footer className="footer">
                    <form onSubmit={handleSendMessage} className="input-form">
                        <input
                            type="file"
                            accept=".txt"
                            onChange={handleFileSelect}
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="file-button"
                            title="Attach file (text only)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-3.375 3.375c-.25.25-.625.3-.938.12l-2.062-1.031c-.18-.09-.375.05-.375.25v2.5a.75.75 0 001.5 0v-2.5c0-.18.15-.3.375-.25L10.75 9c.125.062.25.125.375.125h.5a.75.75 0 00.75-.75V8.25a.75.75 0 00-.75-.75z" />
                            </svg>
                        </button>
                        {attachedFile && (
                            <div className="file-info">
                                <span>{attachedFile.name}</span>
                                <button onClick={() => setAttachedFile(null)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        <input
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            className="text-input"
                            placeholder="Message bot..."
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className={`submit-button ${isLoading ? 'disabled' : ''}`}
                            disabled={isLoading}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="icon">
                                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.945a.75.75 0 00.925.94l3.714-1.164a.75.75 0 01.926.94l-2.432 7.945a.75.75 0 00.926.94l2.432-7.945a.75.75 0 00-.926-.94L9.704 9.07a.75.75 0 01.926-.94l2.432-7.945a.75.75 0 00-.926-.94z" />
                            </svg>
                        </button>
                    </form>
                </footer>
            </div>
            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

                    :root {
                        --bg-light: #ffffff;
                        --bg-dark: #111827;
                        --bg-gray-light: #f3f4f6;
                        --bg-gray-dark: #1f2937;
                        --bg-sidebar-light: #e5e7eb;
                        --bg-sidebar-dark: #374151;
                        --text-light: #1f2937;
                        --text-dark: #ffffff;
                        --text-gray-light: #6b7280;
                        --text-gray-dark: #6b7280;
                        --border-light: #d1d5db;
                        --border-dark: #374151;
                        --blue-light: #3b82f6;
                        --blue-dark: #2563eb;
                        --blue-hover-light: #2563eb;
                        --blue-hover-dark: #1d4ed8;
                        --red-light: #ef4444;
                        --red-dark: #dc2626;
                    }

                    .light-theme {
                        background-color: var(--bg-light);
                        color: var(--text-light);
                    }

                    .dark-theme {
                        background-color: var(--bg-dark);
                        color: var(--text-dark);
                    }

                    body, html, #root {
                        height: 100%;
                        margin: 0;
                        font-family: 'Inter', sans-serif;
                    }

                    .app-container {
                        display: flex;
                        height: 100vh;
                        width: 100vw;
                    }

                    .sidebar {
                        display: flex;
                        flex-direction: column;
                        width: 256px;
                        padding: 16px;
                        border-right: 1px solid var(--border-light);
                        background-color: var(--bg-gray-light);
                        overflow-y: auto;
                        transition: all 0.2s ease-in-out;
                    }

                    .dark-theme .sidebar {
                        border-right: 1px solid var(--border-dark);
                        background-color: var(--bg-gray-dark);
                    }

                    .sidebar-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 12px;
                    }

                    .chat-new-button {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 8px;
                        border-radius: 9999px;
                        color: white;
                        background-color: var(--blue-light);
                        transition: background-color 0.2s;
                        cursor: pointer;
                        font-size: 0.875rem;
                    }

                    .dark-theme .chat-new-button {
                        background-color: var(--blue-dark);
                    }

                    .chat-new-button:hover {
                        background-color: var(--blue-hover-light);
                    }

                    .dark-theme .chat-new-button:hover {
                        background-color: var(--blue-hover-dark);
                    }

                    .chat-new-button svg {
                        width: 16px;
                        height: 16px;
                        margin-right: 4px;
                    }

                    .chat-history {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }

                    .history-item {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: background-color 0.2s;
                    }

                    .light-theme .history-item {
                        background-color: var(--bg-sidebar-light);
                        color: var(--text-light);
                    }

                    .dark-theme .history-item {
                        background-color: rgba(55, 65, 81, 0.5);
                        color: var(--text-dark);
                    }

                    .history-item:hover {
                        background-color: var(--border-light);
                    }

                    .dark-theme .history-item:hover {
                        background-color: rgba(55, 65, 81, 0.8);
                    }

                    .history-item.active {
                        background-color: var(--blue-light);
                        color: white;
                    }

                    .dark-theme .history-item.active {
                        background-color: var(--blue-dark);
                    }

                    .history-title {
                        flex: 1;
                        font-size: 0.875rem;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .history-delete-button {
                        padding: 4px;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                    }

                    .history-delete-button:hover {
                        background-color: rgba(255, 255, 255, 0.2);
                    }

                    .main-content {
                        display: flex;
                        flex-direction: column;
                        flex: 1;
                    }

                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 16px;
                        border-bottom: 1px solid var(--border-light);
                        background-color: var(--bg-gray-light);
                    }

                    .dark-theme .header {
                        border-bottom: 1px solid var(--border-dark);
                        background-color: var(--bg-gray-dark);
                    }

                    .title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        margin: 0;
                        background: linear-gradient(to right, #3b82f6, #6366f1);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                    }

                    .header-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                    }

                    .theme-toggle-button {
                        padding: 8px;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                        cursor: pointer;
                    }

                    .light-theme .theme-toggle-button:hover {
                        background-color: var(--bg-sidebar-light);
                    }

                    .dark-theme .theme-toggle-button:hover {
                        background-color: var(--bg-sidebar-dark);
                    }

                    .messages-container {
                        flex: 1;
                        overflow-y: auto;
                        padding: 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                    }

                    .empty-state {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 32px;
                        text-align: center;
                    }

                    .empty-state .subtitle {
                        color: var(--text-gray-light);
                        margin-bottom: 32px;
                    }

                    .dark-theme .empty-state .subtitle {
                        color: var(--text-gray-dark);
                    }

                    .suggestions-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 16px;
                        width: 100%;
                        max-width: 640px;
                    }

                    @media (min-width: 640px) {
                        .suggestions-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }

                    .suggestion-button {
                        padding: 16px;
                        border-radius: 12px;
                        transition: background-color 0.2s;
                    }

                    .light-theme .suggestion-button {
                        background-color: var(--bg-sidebar-light);
                        color: var(--text-light);
                    }

                    .dark-theme .suggestion-button {
                        background-color: rgba(55, 65, 81, 0.5);
                        color: var(--text-dark);
                    }

                    .light-theme .suggestion-button:hover {
                        background-color: var(--border-light);
                    }

                    .dark-theme .suggestion-button:hover {
                        background-color: rgba(55, 65, 81, 0.8);
                    }

                    .message-wrapper {
                        display: flex;
                    }

                    .message-wrapper.user {
                        justify-content: flex-end;
                    }

                    .message-wrapper.bot {
                        justify-content: flex-start;
                    }

                    .message-bubble {
                        padding: 12px;
                        border-radius: 8px;
                        max-width: 640px;
                        position: relative;
                        transition: background-color 0.2s;
                    }

                    .message-bubble:hover .message-actions {
                        opacity: 1;
                    }

                    .user-message {
                        background-color: var(--blue-light);
                        color: white;
                        border-bottom-right-radius: 0;
                    }

                    .dark-theme .user-message {
                        background-color: var(--blue-dark);
                    }

                    .bot-message {
                        background-color: var(--bg-sidebar-light);
                        color: var(--text-light);
                        border-bottom-left-radius: 0;
                    }

                    .dark-theme .bot-message {
                        background-color: var(--bg-sidebar-dark);
                        color: var(--text-dark);
                    }

                    .loading {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 4px;
                    }

                    .dot {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background-color: var(--text-gray-light);
                        animation: bounce 1s infinite;
                    }

                    .dark-theme .dot {
                        background-color: var(--text-gray-dark);
                    }

                    .dot:nth-child(2) { animation-delay: 0.2s; }
                    .dot:nth-child(3) { animation-delay: 0.4s; }

                    @keyframes bounce {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-5px); }
                    }

                    .edit-form {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        width: 100%;
                        max-width: 640px;
                    }

                    .edit-input {
                        flex: 1;
                        padding: 8px 12px;
                        border-radius: 8px;
                        border: 2px solid transparent;
                        resize: none;
                    }

                    .light-theme .edit-input {
                        background-color: var(--bg-sidebar-light);
                        color: var(--text-light);
                    }

                    .dark-theme .edit-input {
                        background-color: var(--bg-sidebar-dark);
                        color: var(--text-dark);
                    }

                    .edit-input:focus {
                        outline: none;
                        border-color: var(--blue-light);
                    }

                    .edit-button {
                        padding: 8px;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .save-button {
                        background-color: var(--blue-light);
                        color: white;
                    }

                    .save-button:hover {
                        background-color: var(--blue-hover-light);
                    }

                    .cancel-button {
                        background-color: var(--bg-sidebar-light);
                        color: var(--text-light);
                    }

                    .dark-theme .cancel-button {
                        background-color: var(--bg-sidebar-dark);
                        color: var(--text-dark);
                    }

                    .cancel-button:hover {
                        background-color: var(--border-light);
                    }

                    .message-actions {
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        display: flex;
                        gap: 4px;
                        opacity: 0;
                        transition: opacity 0.2s ease-in-out;
                    }

                    .message-wrapper.bot .message-actions {
                        right: auto;
                        left: -8px;
                    }

                    .action-button {
                        padding: 4px;
                        border-radius: 50%;
                        transition: background-color 0.2s;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background-color: var(--bg-sidebar-dark);
                        color: white;
                    }

                    .user .action-button {
                        background-color: var(--blue-dark);
                    }

                    .user .action-button:hover {
                        background-color: var(--blue-hover-dark);
                    }

                    .bot .action-button {
                        background-color: var(--bg-sidebar-dark);
                    }

                    .light-theme .bot .action-button {
                        background-color: var(--border-light);
                        color: var(--text-light);
                    }

                    .light-theme .bot .action-button:hover {
                        background-color: var(--bg-sidebar-light);
                    }

                    .icon {
                        width: 16px;
                        height: 16px;
                    }

                    .footer {
                        padding: 16px;
                        background-color: var(--bg-gray-light);
                    }

                    .dark-theme .footer {
                        background-color: var(--bg-gray-dark);
                    }

                    .suggestions-container {
                        display: flex;
                        gap: 8px;
                        overflow-x: auto;
                        padding-bottom: 8px;
                    }

                    .suggestions-container::-webkit-scrollbar {
                        display: none;
                    }

                    .suggestions-container button {
                        flex-shrink: 0;
                        border: 1px solid var(--border-light);
                        border-radius: 9999px;
                        padding: 8px 16px;
                        font-size: 0.875rem;
                        transition: all 0.2s;
                    }

                    .dark-theme .suggestions-container button {
                        border: 1px solid var(--border-dark);
                    }

                    .input-form {
                        display: flex;
                        gap: 8px;
                        align-items: center;
                    }

                    .file-button {
                        padding: 12px;
                        border-radius: 9999px;
                        transition: background-color 0.2s;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .light-theme .file-button {
                        background-color: var(--border-light);
                    }

                    .light-theme .file-button:hover {
                        background-color: var(--bg-sidebar-light);
                    }

                    .dark-theme .file-button {
                        background-color: var(--bg-sidebar-dark);
                    }

                    .dark-theme .file-button:hover {
                        background-color: var(--bg-gray-dark);
                    }

                    .file-info {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 4px 12px;
                        border-radius: 9999px;
                        font-size: 0.875rem;
                    }

                    .light-theme .file-info {
                        background-color: var(--bg-sidebar-light);
                    }

                    .dark-theme .file-info {
                        background-color: var(--bg-sidebar-dark);
                    }

                    .file-info button {
                        color: var(--text-gray-light);
                    }

                    .dark-theme .file-info button {
                        color: var(--text-gray-dark);
                    }

                    .text-input {
                        flex: 1;
                        padding: 12px 20px;
                        border-radius: 9999px;
                        border: 2px solid transparent;
                        transition: all 0.2s;
                    }

                    .light-theme .text-input {
                        background-color: var(--bg-sidebar-light);
                        color: var(--text-light);
                    }

                    .dark-theme .text-input {
                        background-color: var(--bg-sidebar-dark);
                        color: var(--text-dark);
                    }

                    .text-input:focus {
                        outline: none;
                        border-color: var(--blue-light);
                    }

                    .submit-button {
                        padding: 12px;
                        border-radius: 9999px;
                        transition: all 0.2s;
                        cursor: pointer;
                        color: white;
                    }

                    .light-theme .submit-button {
                        background-color: var(--blue-light);
                    }

                    .light-theme .submit-button:hover {
                        background-color: var(--blue-hover-light);
                    }

                    .dark-theme .submit-button {
                        background-color: var(--blue-dark);
                    }

                    .dark-theme .submit-button:hover {
                        background-color: var(--blue-hover-dark);
                    }

                    .submit-button.disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background-color: rgba(0, 0, 0, 0.5);
                        z-index: 50;
                    }

                    .modal-content {
                        padding: 24px;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }

                    .light-theme .modal-content {
                        background-color: var(--bg-light);
                        color: var(--text-light);
                    }

                    .dark-theme .modal-content {
                        background-color: var(--bg-gray-dark);
                        color: var(--text-dark);
                    }

                    .modal-header {
                        font-size: 1.125rem;
                        font-weight: 700;
                        margin-bottom: 16px;
                    }

                    .modal-body {
                        margin-bottom: 16px;
                    }

                    .modal-actions {
                        display: flex;
                        justify-content: flex-end;
                        gap: 8px;
                    }

                    .modal-button {
                        padding: 8px 16px;
                        border-radius: 9999px;
                        transition: all 0.2s;
                        cursor: pointer;
                    }

                    .modal-cancel-button {
                        background-color: var(--bg-sidebar-light);
                        color: var(--text-light);
                    }

                    .light-theme .modal-cancel-button:hover {
                        background-color: var(--bg-sidebar-light);
                    }

                    .dark-theme .modal-cancel-button {
                        background-color: var(--bg-sidebar-dark);
                        color: var(--text-dark);
                    }

                    .dark-theme .modal-cancel-button:hover {
                        background-color: var(--bg-gray-dark);
                    }

                    .modal-confirm-button {
                        background-color: var(--red-light);
                        color: white;
                    }

                    .dark-theme .modal-confirm-button {
                        background-color: var(--red-dark);
                    }

                    .modal-confirm-button:hover {
                        background-color: #dc2626;
                    }
                `}
            </style>
        </div>
    );
}
