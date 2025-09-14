import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [attachedFile, setAttachedFile] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageText, setEditingMessageText] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isConfirmingDeleteChat, setIsConfirmingDeleteChat] = useState(false);
  const [chatToDelete, setChatToDelete] = useState(null);
  const [userName, setUserName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // IMPORTANT: For production, store your API key in a secure way (e.g., environment variables)
  // NEVER hardcode it in client-side code that can be viewed by others.
  const apiKey = "AIzaSyCOzU3P1mIeF81-7T3oN_jaRLhQiUguu3M";

  // Correct API URLs for the Gemini models
  const textApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  const visionApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  const systemPrompt = "You are a helpful and creative AI assistant named Gemini. Your responses should be conversational, friendly, and informative.";

  const suggestions = [
    "What is the capital of France?",
    "Explain quantum computing simply.",
    "Tell me a fun fact about space.",
    "Write a short poem about the ocean."
  ];

  // --- LOCAL STORAGE & INITIAL LOAD ---
  useEffect(() => {
    try {
      const storedChats = localStorage.getItem('chatHistory');
      const storedUserName = localStorage.getItem('userName');
      if (storedChats) {
        const parsedChats = JSON.parse(storedChats);
        setChatHistory(parsedChats);
        if (parsedChats.length > 0) {
          const latestChat = parsedChats[0];
          setCurrentChatId(latestChat.id);
          setMessages(latestChat.messages);
        }
      }
      if (storedUserName) {
        setUserName(storedUserName);
      }
    } catch (error) {
      console.error("Failed to load state from localStorage", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
      localStorage.setItem('userName', userName);
    } catch (error) {
      console.error("Failed to save state to localStorage", error);
    }
  }, [chatHistory, userName]);
  // --- END OF LOCAL STORAGE ---

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setUserInput('');
    setAttachedFile(null);
  };

  const handleSwitchChat = (chatId) => {
    setCurrentChatId(chatId);
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
    }
  };

  const confirmDeleteChat = (e, chatId) => {
    e.stopPropagation();
    setChatToDelete(chatId);
    setIsConfirmingDeleteChat(true);
  };

  const cancelDeleteChat = () => {
    setIsConfirmingDeleteChat(false);
    setChatToDelete(null);
  };

  const handleDeleteChat = () => {
    const chatId = chatToDelete;
    setChatHistory(prevHistory => {
      const newHistory = prevHistory.filter(chat => chat.id !== chatId);
      if (currentChatId === chatId) {
        if (newHistory.length > 0) {
          setCurrentChatId(newHistory[0].id);
          setMessages(newHistory[0].messages);
        } else {
          setCurrentChatId(null);
          setMessages([]);
        }
      }
      return newHistory;
    });
    setIsConfirmingDeleteChat(false);
    setChatToDelete(null);
  };

  const handleDeleteMessage = (messageId) => {
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
    setChatHistory(prevHistory =>
      prevHistory.map(chat =>
        chat.id === currentChatId
          ? { ...chat, messages: chat.messages.filter(msg => msg.id !== messageId) }
          : chat
      ).sort((a, b) => b.lastUpdated - a.lastUpdated)
    );
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
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === editingMessageId ? { ...msg, text: editingMessageText.trim() } : msg
      )
    );
    setChatHistory(prevHistory =>
      prevHistory.map(chat =>
        chat.id === currentChatId
          ? {
            ...chat,
            messages: chat.messages.map(msg =>
              msg.id === editingMessageId ? { ...msg, text: editingMessageText.trim() } : msg
            ),
            lastUpdated: Date.now()
          }
          : chat
      ).sort((a, b) => b.lastUpdated - a.lastUpdated)
    );
    setEditingMessageId(null);
    setEditingMessageText('');
  };

  const sendMessage = async (query, file) => {
    setIsLoading(true);
    const userMessage = {
      id: crypto.randomUUID(),
      text: query,
      sender: 'user',
      timestamp: Date.now(),
      file: file ? { name: file.name, type: file.type, data: file.data } : null,
    };

    let activeChatId = currentChatId;
    let isFirstMessage = false;

    if (!activeChatId) {
      const newChatId = Date.now().toString();
      activeChatId = newChatId;
      isFirstMessage = true;
      setCurrentChatId(newChatId);
    }

    // Add user message to display
    setMessages(prevMessages => [...prevMessages, userMessage]);

    // Update chat history with the new message
    setChatHistory(prevHistory => {
      if (isFirstMessage) {
        const newChat = {
          id: activeChatId,
          title: query.length > 30 ? query.substring(0, 30) + '...' : query,
          messages: [userMessage],
          lastUpdated: Date.now(),
        };
        return [newChat, ...prevHistory];
      } else {
        return prevHistory.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: [...chat.messages, userMessage], lastUpdated: Date.now() }
            : chat
        ).sort((a, b) => b.lastUpdated - a.lastUpdated);
      }
    });

    try {
      let payload;
      let targetUrl;

      // Prepare conversation history for the API call
      const historyMessages = chatHistory.find(chat => chat.id === activeChatId)?.messages || [];
      const conversationHistory = historyMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));

      // Check if a file is attached to determine API type
      if (file) {
        const base64Data = file.data.split(',')[1];
        payload = {
          contents: [{
            parts: [
              { text: query },
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Data,
                },
              },
            ],
          }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        };
        targetUrl = visionApiUrl;
      } else {
        payload = {
          contents: [
            ...conversationHistory,
            { role: 'user', parts: [{ text: query }] }
          ],
          systemInstruction: { parts: [{ text: systemPrompt }] },
        };
        targetUrl = textApiUrl;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API call failed with status: ${response.status} - ${errorData.error.message}`);
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response. Please try again.";
      const newBotMessage = { id: crypto.randomUUID(), text, sender: 'bot', timestamp: Date.now() };

      setMessages(prevMessages => [...prevMessages, newBotMessage]);
      setChatHistory(prevHistory => {
        const chatToUpdate = prevHistory.find(chat => chat.id === activeChatId);
        if (chatToUpdate) {
          const updatedChat = {
            ...chatToUpdate,
            messages: [...chatToUpdate.messages, newBotMessage],
            lastUpdated: Date.now()
          };
          const updatedHistory = [updatedChat, ...prevHistory.filter(chat => chat.id !== activeChatId)];
          return updatedHistory.sort((a, b) => b.lastUpdated - a.lastUpdated);
        }
        return prevHistory;
      });
    } catch (error) {
      console.error("Error with API call:", error);
      const errorMessage = "Oops! Something went wrong. Please try again later.";
      const newErrorMessage = { id: crypto.randomUUID(), text: errorMessage, sender: 'bot', timestamp: Date.now() };

      setMessages(prevMessages => [...prevMessages, newErrorMessage]);
      setChatHistory(prevHistory =>
        prevHistory.map(chat =>
          chat.id === activeChatId
            ? { ...chat, messages: [...chat.messages, newErrorMessage], lastUpdated: Date.now() }
            : chat
        ).sort((a, b) => b.lastUpdated - a.lastUpdated)
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
        setAttachedFile({ name: file.name, type: file.type, data: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendMessageSubmit = (e) => {
    e.preventDefault();
    const query = userInput.trim();
    if (!query && !attachedFile) return;

    sendMessage(query, attachedFile);
    setUserInput('');
    setAttachedFile(null);
  };

  return (
    <div className={`app-container ${theme}-theme`}>
      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="header-title">History</h2>
          <button onClick={handleNewChat} className="chat-new-button">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Chat
          </button>
        </div>
        <div className="chat-history no-scrollbar">
          {chatHistory.map(chat => (
            <div
              key={chat.id}
              className={`history-item ${chat.id === currentChatId ? 'active' : ''}`}
              onClick={() => handleSwitchChat(chat.id)}
            >
              <span className="history-title">{chat.title}</span>
              <button
                className="history-delete-button"
                onClick={(e) => confirmDeleteChat(e, chat.id)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9.5l-3.23 3.23a.75.75 0 01-1.06 0L8.24 9.5a.75.75 0 011.06-1.06L12 10.44l3.24-3.23a.75.75 0 011.06 1.06L13.06 12l3.23 3.23a.75.75 0 01-1.06 1.06l-3.23-3.23-3.23 3.23a.75.75 0 01-1.06-1.06l3.23-3.23L8.24 9.5a.75.75 0 011.06-1.06L12 10.44l3.24-3.23a.75.75 0 011.06 1.06z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <header className="header">
          <button className="menu-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
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

        {/* Conditional Rendering of Chat Content */}
        {messages.length === 0 && !currentChatId ? (
          <div className="empty-state">
            <h1 className="title">Hello there!</h1>
            <p className="subtitle">I'm a powerful AI. How can I help you today?</p>
            <div className="suggestions-grid">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setUserInput(suggestion);
                    handleSendMessageSubmit({ preventDefault: () => { } });
                  }}
                  className="suggestion-button"
                >
                  <p>{suggestion}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages-container no-scrollbar">
            {messages.map((message) => (
              <div key={message.id} className={`message-wrapper ${message.sender}`}>
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
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </button>
                    <button type="button" onClick={() => setEditingMessageId(null)} className="edit-button cancel-button">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </form>
                ) : (
                  <div className={`message-bubble ${message.sender}-message`}>
                    {message.file && message.file.type.startsWith('image/') && (
                      <img src={message.file.data} alt={message.file.name} className="attached-image" />
                    )}
                    <p>{message.text}</p>
                    {message.sender === 'user' && (
                      <div className="message-actions">
                        <button onClick={() => handleStartEdit(message)} className="action-button edit-action">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14.25v2.25M6 14.25v2.25M4.5 14.25v2.25" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteMessage(message.id)} className="action-button delete-action">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="message-wrapper bot">
                <div className="message-bubble bot-message typing-indicator">
                  AI is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isConfirmingDeleteChat && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="modal-header">Confirm Deletion</h2>
              <p className="modal-body">Are you sure you want to delete this chat?</p>
              <div className="modal-actions">
                <button onClick={cancelDeleteChat} className="modal-button modal-cancel-button">
                  Cancel
                </button>
                <button onClick={handleDeleteChat} className="modal-button modal-confirm-button">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer and Input Form */}
        <footer className="footer">
          <form onSubmit={handleSendMessageSubmit} className="input-form">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="file-button"
              title="Attach an image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L4.5 17.25M4.5 17.25a2.25 2.25 0 000 3.182L5.808 22.5M4.5 17.25A2.25 2.25 0 017.682 15h6.206a2.25 2.25 0 012.247 2.248M19.5 7.5a2.25 2.25 0 00-2.25-2.25H6.551a2.25 2.25 0 00-2.126 1.258m8.74 1.137l-4.5 4.5m1.5-4.5h6.75m-6.75 0l4.5 4.5" />
              </svg>
            </button>
            {attachedFile && (
              <div className="file-info">
                <span>{attachedFile.name}</span>
                <button type="button" onClick={() => setAttachedFile(null)}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
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
                  handleSendMessageSubmit(e);
                }
              }}
              className="text-input"
              placeholder="Message AI-bot..."
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`submit-button ${isLoading || (!userInput.trim() && !attachedFile) ? 'disabled' : ''}`}
              disabled={isLoading || (!userInput.trim() && !attachedFile)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-4.5-4.5M19.5 12l-4.5 4.5" />
              </svg>
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}