document.addEventListener('DOMContentLoaded', function() {
  // Immediately show the contact section (override main.js behavior)
  const contactSection = document.getElementById('ai');
  if (contactSection) {
    contactSection.classList.add('section-show');
  }

  // Set the contact link as active
  const navLinks = document.querySelectorAll('#navbar .nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#ai' || 
        link.getAttribute('href').endsWith('ai.html')) {
      link.classList.add('active');
    }
  });

  // Modify the navbar click handler specifically for the contact page
  const navbar = document.getElementById('navbar');
  if (navbar) {
    navbar.addEventListener('click', function(e) {
      const navLink = e.target.closest('.nav-link');
      if (navLink) {
        // If clicking on Contact link while already on contact page
        if (navLink.getAttribute('href') === '#ai' || 
            navLink.getAttribute('href').endsWith('ai.html')) {
          e.preventDefault();
          window.scrollTo({
            top: 0,
            behavior: 'smooth'
          });
        }
        // For mobile, close the navbar after click
        if (navbar.classList.contains('navbar-mobile')) {
          navbar.classList.remove('navbar-mobile');
          const navbarToggle = document.querySelector('.mobile-nav-toggle');
          if (navbarToggle) {
            navbarToggle.classList.toggle('bi-list');
            navbarToggle.classList.toggle('bi-x');
          }
        }
      }
    });
  }

  // Ensure header is in the correct state
  const header = document.getElementById('header');
  if (header) {
    header.classList.add('header-top');
  }

  // Mobile adaptations
  if (window.innerWidth <= 768) {
    document.body.style.overflow = 'hidden';
    document.getElementById('header').style.display = 'none';
  }

  // Handle window resize
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
      document.getElementById('header').style.display = 'none';
    } else {
      document.body.style.overflow = '';
      document.getElementById('header').style.display = '';
    }
  });

  // Chat functionality
  const chatContainer = document.getElementById('chat-container');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');
  
  // Create clear button (just trash icon)
  const clearButton = document.createElement('button');
  clearButton.id = 'clear-button';
  clearButton.innerHTML = '<i class="bi bi-trash"></i>';
  document.getElementById('ai').appendChild(clearButton);

  // Enhanced message styling
  function addMessage(message, sender) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('d-flex', 'mb-3');
    
    const bubble = document.createElement('div');
    bubble.classList.add(
      'p-3', 
      'rounded-4',
      'shadow-sm',
      ...(sender === 'user' ? ['user-message'] : ['ai-message'])
    );
    bubble.style.maxWidth = '80%';
    bubble.style.wordBreak = 'break-word';
    
    // Add robot icon for AI messages
    if (sender === 'ai') {
      const icon = document.createElement('i');
      icon.classList.add('bi', 'bi-robot', 'me-2');
      bubble.prepend(icon);
    }
    
    // Format message content (only for AI messages)
    if (sender === 'ai') {
      bubble.innerHTML = formatMessage(message);
    } else {
      bubble.textContent = message;
    }
    
    messageElement.appendChild(bubble);
    chatContainer.appendChild(messageElement);
    
    // Smooth scroll to bottom
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: 'smooth'
    });
  }

  // Format AI messages
  function formatMessage(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<u>$1</u>')
      .replace(/```(.*?)```/gs, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\*\s(.*?)(?=\n|$)/g, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  }

  // Loading indicator
  function addLoadingMessage() {
    const loadingElement = document.createElement('div');
    loadingElement.classList.add('d-flex', 'mb-3');
    
    const loadingBubble = document.createElement('div');
    loadingBubble.classList.add('p-3', 'rounded-4', 'ai-message');
    loadingBubble.style.maxWidth = '80%';
    
    const spinner = document.createElement('div');
    spinner.classList.add('spinner-border', 'spinner-border-sm', 'text-secondary', 'me-2');
    spinner.setAttribute('role', 'status');
    
    const text = document.createElement('span');
    text.textContent = 'AI is thinking...';
    
    loadingBubble.appendChild(spinner);
    loadingBubble.appendChild(text);
    loadingElement.appendChild(loadingBubble);
    loadingElement.id = 'loading-message';
    chatContainer.appendChild(loadingElement);
    
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: 'smooth'
    });
    
    return loadingElement;
  }

  // Save chat history
  function saveChatToLocalStorage() {
    const messages = Array.from(chatContainer.querySelectorAll('.d-flex'))
      .filter(el => el.id !== 'loading-message')
      .map(el => ({
        text: el.textContent.replace('AI is thinking...', '').trim(),
        sender: el.querySelector('.user-message') ? 'user' : 'ai',
        time: new Date().toISOString()
      }));
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }

  // Load chat history
  function loadChatFromLocalStorage() {
    const savedMessages = JSON.parse(localStorage.getItem('chatHistory'));
    if (savedMessages?.length > 0) {
      savedMessages.forEach(msg => addMessage(msg.text, msg.sender));
    } else {
      addMessage("Hello! I'm your AI assistant. How can I help you today?", 'ai');
    }
  }

  // Send message function
  async function sendMessage() {
    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    addMessage(userMessage, 'user');
    messageInput.value = '';
    sendButton.disabled = true;
    messageInput.disabled = true;

    const loadingElement = addLoadingMessage();

    try {
      const response = await fetch('/.netlify/functions/gemini-proxy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          message: userMessage,
          chatHistory: getCurrentChatHistory()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      loadingElement.remove();
      const aiMessage = data.response || "I didn't get a response.";
      addMessage(aiMessage, 'ai');
      saveChatToLocalStorage();
      
    } catch (error) {
      console.error('Error:', error);
      loadingElement.remove();
      addMessage(`Error: ${error.message || 'Failed to process request'}`, 'ai');
    } finally {
      sendButton.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
    }
  }

  // Get chat history from DOM
  function getCurrentChatHistory() {
    return Array.from(chatContainer.querySelectorAll('.d-flex'))
      .filter(el => el.id !== 'loading-message')
      .filter((el, index) => !(index === 0 && !el.querySelector('.user-message')))
      .map(el => ({
        sender: el.querySelector('.user-message') ? 'user' : 'ai',
        text: el.textContent.replace('AI is thinking...', '').trim()
      }));
  }

  // Clear chat function
  function clearChat() {
    if (chatContainer.children.length > 0 && confirm('Clear all chat history?')) {
      chatContainer.innerHTML = '';
      localStorage.removeItem('chatHistory');
      addMessage("Chat cleared. How can I help you now?", 'ai');
    }
  }

  // Event listeners
  sendButton.addEventListener('click', sendMessage);
  clearButton.addEventListener('click', clearChat);
  
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  messageInput.addEventListener('input', () => {
    sendButton.disabled = messageInput.value.trim() === '';
  });

  // Initialize chat
  loadChatFromLocalStorage();
  messageInput.focus();
});