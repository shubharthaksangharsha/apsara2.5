// Constants and globals
const API_BASE_URL = window.location.origin; // Assuming the backend is running on the same origin
let currentModelId = 'gemini-2.5-pro-preview-03-25'; // Default model
let isProcessing = false;
let currentChatId = generateId(); // Now generateId is defined
let conversations = []; // To store chat history
let imageAttachments = []; // To store attached images
let currentStreamController = null; // For managing active streams
let darkMode = localStorage.getItem('darkMode') === 'true' || false; // For theme switching
let isLiveModeActive = false; // Track if popup is open and WS is connected/connecting
let webSocket = null;
let currentLiveTurnAssistantContent = ""; // Aggregate content for the current turn
let currentLiveTurnAssistantElement = null; // The DOM element for the current turn bubble
let liveSessionTimerId = null; // Timer for session duration
let liveSessionIntervalId = null; // Interval for updating display
let liveSessionEndTime = 0; // Store end time
const LIVE_SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes
let mediaRecorder = null;
let audioContext = null;
let audioChunks = [];
let isRecording = false;
let audioPlaybackQueue = []; // Queue of { base64Data: string, targetElementId: string }
let isPlayingAudio = false;
let audioDestinationNode = null; // For potential effects/gain later
let currentAudioPlayer = null; // Reference to the currently playing audio element
// import hljs from 'highlight.js';
// import 'highlight.js/styles/default.css'; // or any other theme you like

// DOM elements
const elements = {
    modelSelect: document.getElementById('modelSelect'),
    conversationsList: document.getElementById('conversationsList'),
    chatMessages: document.getElementById('chatMessages'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    newChatBtn: document.getElementById('newChatBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsPanel: document.getElementById('settingsPanel'),
    closeSettingsBtn: document.querySelector('.settings-panel-close-btn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    lightModeIcon: document.getElementById('lightModeIcon'),
    darkModeIcon: document.getElementById('darkModeIcon'),
    attachmentBtn: document.getElementById('attachmentBtn'),
    fileInput: document.getElementById('fileInput'),
    systemInstruction: document.getElementById('systemInstruction'),
    enableJsonMode: document.getElementById('enableJsonMode'),
    jsonSchema: document.getElementById('jsonSchema'),
    jsonSchemaContainer: document.getElementById('jsonSchemaContainer'),
    enableGrounding: document.getElementById('enableGrounding'),
    enableThinking: document.getElementById('enableThinking'),
    thinkingBudget: document.getElementById('thinkingBudget'),
    thinkingBudgetValue: document.getElementById('thinkingBudgetValue'),
    thinkingBudgetContainer: document.getElementById('thinkingBudgetContainer'),
    temperature: document.getElementById('temperature'),
    temperatureValue: document.getElementById('temperatureValue'),
    streamResponse: document.getElementById('streamResponse'),
    imageGenSettings: document.getElementById('imageGenSettings'),
    numberOfImages: document.getElementById('numberOfImages'),
    aspectRatio: document.getElementById('aspectRatio'),
    typingIndicator: document.getElementById('typingIndicator'),
    clearAllConversationsBtn: document.getElementById('clearAllConversationsBtn'),
    modelInfo: document.getElementById('modelInfo'),
    streamProgressBar: document.getElementById('streamProgressBar'),
    voiceSelect: document.getElementById('voiceSelect'),
    liveModeBtn: document.getElementById('liveModeBtn'), // Live mode button
    liveModePopup: document.getElementById('liveModePopup'),
    liveChatMessages: document.getElementById('liveChatMessages'),
    liveMessageInput: document.getElementById('liveMessageInput'),
    liveSendBtn: document.getElementById('liveSendBtn'),
    closeLivePopupBtn: document.getElementById('closeLivePopupBtn'),
    liveStatusIndicator: document.getElementById('liveStatusIndicator'),
    liveConnectDisconnectBtn: document.getElementById('liveConnectDisconnectBtn'),
    livePopupSettingsBtn: document.getElementById('livePopupSettingsBtn'),
    liveTimerDisplay: document.getElementById('liveTimerDisplay'), // Add timer display element
    liveSettingsPanel: document.getElementById('liveSettingsPanel'),
    closeLiveSettingsBtn: document.getElementById('closeLiveSettingsBtn'),
    liveOutputAudioText: document.getElementById('liveOutputAudioText'),
    liveOutputText: document.getElementById('liveOutputText'),
    liveVoiceSelect: document.getElementById('liveVoiceSelect'),
    liveTurnCoverage: document.getElementById('liveTurnCoverage'),
    liveMicBtn: document.getElementById('liveMicBtn')
};



// Adjust textarea height based on content
function adjustTextareaHeight() {
    const textarea = elements.messageInput;
    if (!textarea) return; // Add check
    textarea.style.height = 'auto'; // Reset height first
    // Calculate scroll height and clamp it between min (e.g., initial height) and max
    const minHeight = 38; // Example initial height in pixels, adjust as needed
    const maxHeight = 150;
    const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = newHeight + 'px';
}

// Format timestamp for display
function formatTimestamp(date) {
    // *** Start Change: Add validation ***
    try {
        // Check if the date is reasonably valid before formatting
        // Use getTime() which returns NaN for invalid dates
        if (!date || isNaN(new Date(date).getTime())) {
            // console.warn("formatTimestamp received invalid date:", date); // Optional: reduce console noise
            return "--:--"; // Return a default string for invalid dates
        }
        // Ensure it's a Date object for formatting (redundant if getTime check passed, but safe)
        const dateObj = (date instanceof Date) ? date : new Date(date);
        return new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(dateObj);
    } catch (e) {
        // Catch any unexpected errors during formatting
        console.error("Error formatting timestamp:", e, "Input:", date);
        return "Error"; // Return an error indicator
    }
    // *** End Change ***
}

// Initialize application
async function initApp() {
    await fetchModels();
    await fetchVoices();
    setupEventListeners();
    adjustTextareaHeight();
    loadConversations();
    setSelectedModel(currentModelId);
    updateModelSpecificSettings();
    applyTheme(); // Apply saved theme
}

function generateId() {
    return Math.random().toString(36).substring(2, 15);
}


// Fetch available models from API
async function fetchModels() {
    try {
        const response = await fetch(`${API_BASE_URL}/models`);
        if (!response.ok) throw new Error('Failed to fetch models');
        
        const models = await response.json();
        
        // Make sure Imagen 3 model is included
        const imagen3Model = models.find(m => m.id === 'imagen-3.0-generate-002');
        if (!imagen3Model) {
            models.push({
                id: 'imagen-3.0-generate-002',
                name: 'Imagen 3',
                description: 'Advanced image generation from text prompt only.'
            });
        }
        
        populateModelSelector(models);
    } catch (error) {
        console.error('Error fetching models:', error);
        showError('Failed to load models. Please refresh and try again.');
    }
}

// Fetch available voices from API
async function fetchVoices() {
    try {
        const response = await fetch(`${API_BASE_URL}/voices`);
        if (!response.ok) throw new Error('Failed to fetch voices');
        const data = await response.json();
        populateVoiceSelector(data.voices || []);
        // Optionally load/set the current voice from backend or local storage
        // For now, we'll just populate the list
    } catch (error) {
        console.error('Error fetching voices:', error);
        // Optionally show an error to the user
        elements.voiceSelect.innerHTML = '<option value="">Error loading voices</option>';
    }
}

// Populate model selector dropdown
function populateModelSelector(models) {
    elements.modelSelect.innerHTML = '';
    
    // Group models by series
    const groupedModels = {
        '2.5 Series': [],
        '2.0 Series': [],
        'Image Generation': [],
        '1.5 Series': []
    };
    
    models.forEach(model => {
        if (model.name.includes('2.5')) {
            groupedModels['2.5 Series'].push(model);
        } else if (model.name.includes('2.0')) {
            if (model.name.includes('Image Gen')) {
                groupedModels['Image Generation'].push(model);
            } else {
                groupedModels['2.0 Series'].push(model);
            }
        } else if (model.name.includes('1.5')) {
            groupedModels['1.5 Series'].push(model);
        } else if (model.name.includes('Imagen')) {
            groupedModels['Image Generation'].push(model);
        }
    });
    
    // Create option groups
    for (const [groupName, groupModels] of Object.entries(groupedModels)) {
        if (groupModels.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = groupName;
            
            groupModels.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name;
                option.title = model.description;
                optgroup.appendChild(option);
            });
            
            elements.modelSelect.appendChild(optgroup);
        }
    }
}

// Populate voice selector dropdown
function populateVoiceSelector(voices) {
    elements.voiceSelect.innerHTML = ''; // Clear loading/error message
    if (!voices || voices.length === 0) {
        elements.voiceSelect.innerHTML = '<option value="">No voices available</option>';
        return;
    }
    voices.forEach(voiceName => {
        const option = document.createElement('option');
        option.value = voiceName;
        option.textContent = voiceName;
        elements.voiceSelect.appendChild(option);
    });
    // TODO: Set the selected voice based on current backend state or saved preference
}

// Set up event listeners
function setupEventListeners() {
    // Model selection
    elements.modelSelect.addEventListener('change', (e) => {
        currentModelId = e.target.value;
        updateModelSpecificSettings();
    });
    
    // Message input
    elements.messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    elements.messageInput.addEventListener('input', adjustTextareaHeight);
    
    // Send button
    elements.sendBtn.addEventListener('click', sendMessage);
    
    // New chat button
    elements.newChatBtn.addEventListener('click', startNewChat);
    
    // Settings panel
    elements.settingsBtn.addEventListener('click', () => {
        elements.settingsPanel.classList.add('open');
    });
    
    elements.closeSettingsBtn.addEventListener('click', () => {
        elements.settingsPanel.classList.remove('open');
    });
    
    // Theme toggle button
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Clear all conversations button
    elements.clearAllConversationsBtn.addEventListener('click', clearAllConversations);
    
    // File input for attachments
    elements.attachmentBtn.addEventListener('click', () => {
        elements.fileInput.click();
    });
    
    elements.fileInput.addEventListener('change', handleFileUpload);
    
    // JSON mode toggle
    elements.enableJsonMode.addEventListener('change', (e) => {
        elements.jsonSchemaContainer.style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Thinking budget toggle
    elements.enableThinking.addEventListener('change', (e) => {
        elements.thinkingBudgetContainer.style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Thinking budget slider
    elements.thinkingBudget.addEventListener('input', (e) => {
        elements.thinkingBudgetValue.textContent = `${e.target.value} tokens`;
    });
    
    // Temperature slider
    elements.temperature.addEventListener('input', (e) => {
        elements.temperatureValue.textContent = e.target.value;
    });

    // Voice selection
    elements.voiceSelect.addEventListener('change', handleVoiceSelection);

    if (!elements.liveModeBtn) console.error("Live Mode button element not found!");
    // Live Mode button
    elements.liveModeBtn?.addEventListener('click', openLivePopup);

    // Popup close button
    elements.closeLivePopupBtn?.addEventListener('click', closeLivePopup);

    // Popup connect/disconnect button
    elements.liveConnectDisconnectBtn?.addEventListener('click', handleLiveConnectDisconnect);

    // Popup message input & send button
    elements.liveMessageInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendLiveMessage();
        }
    });
    elements.liveSendBtn?.addEventListener('click', sendLiveMessage);

    // Popup settings button - Opens the NEW panel
    elements.livePopupSettingsBtn?.addEventListener('click', toggleLiveSettingsPanel);

    // Close button for the NEW live settings panel
    elements.closeLiveSettingsBtn?.addEventListener('click', closeLiveSettingsPanel);

    // Listeners for controls *inside* the live settings panel
    elements.liveOutputAudioText?.addEventListener('click', () => setLiveOutputFormat('AUDIO_TEXT'));
    elements.liveOutputText?.addEventListener('click', () => setLiveOutputFormat('TEXT'));
    elements.liveVoiceSelect?.addEventListener('change', handleLiveVoiceSelection);
    // Add listeners for other controls (turn coverage etc.)

    console.log("Event listeners set up.");

    // Add Mic Button Listener
    elements.liveMicBtn?.addEventListener('click', handleMicButtonClick);
}

// Handle voice selection change
async function handleVoiceSelection(e) {
    const selectedVoice = e.target.value;
    if (!selectedVoice) return;
    
    try {
        console.log(`Selecting voice: ${selectedVoice}`);
        const response = await fetch(`${API_BASE_URL}/voices/select`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voiceName: selectedVoice })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to select voice');
        }
        const result = await response.json();
        console.log(`Voice selected: ${result.selectedVoice}`);
        // Optionally save the selected voice to local storage or update UI state
    } catch (error) {
        console.error('Error selecting voice:', error);
        showError(`Failed to set voice: ${error.message}`);
        // Revert selection? Or just log error.
    }
}

// Handle file upload for image attachments AND potentially grounding
async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Reset the file input immediately to allow selecting the same file again
    e.target.value = '';

    // Option 1: Handle as Image Attachment (Existing Logic)
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Data = event.target.result.split(',')[1];
            imageAttachments.push({
                mimeType: file.type,
                data: base64Data
            });
            renderImageAttachmentPreview(event.target.result);
        };
        reader.readAsDataURL(file);
        return; // Stop here for image attachments
    }

    // Option 2: Handle as File Upload for Grounding (New Logic)
    // You might want a separate button or logic to distinguish between
    // image attachments for the message vs. files for grounding.
    // For now, let's assume non-image files are for grounding upload.
    console.log(`Uploading file for grounding: ${file.name}`);
    showInfo(`Uploading ${file.name}...`); // Use a new showInfo function or similar

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_BASE_URL}/files`, {
            method: 'POST',
            body: formData
            // No 'Content-Type' header needed, browser sets it for FormData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to upload file (${response.status})`);
        }

        const result = await response.json();
        console.log('File uploaded successfully:', result.file);
        showSuccess(`${file.name} uploaded successfully!`); // Use a new showSuccess function or similar

        // TODO: Update UI to show uploaded files (fetch from GET /files ?)
        // You'll likely need a new UI section and state management for uploaded files.

    } catch (error) {
        console.error('Error uploading file:', error);
        showError(`Failed to upload ${file.name}: ${error.message}`);
    }
}

// Refactored image preview rendering
function renderImageAttachmentPreview(imageDataUrl) {
    const previewContainer = document.createElement('div');
    previewContainer.className = 'image-preview attachment-preview';

    const previewImage = document.createElement('img');
    previewImage.src = imageDataUrl;
    previewImage.alt = 'Attachment Preview';

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.className = 'remove-image-btn';
    removeBtn.title = 'Remove Attachment';
    removeBtn.addEventListener('click', () => {
        const index = imageAttachments.findIndex(img => `data:${img.mimeType};base64,${img.data}` === imageDataUrl);
        if (index > -1) {
            imageAttachments.splice(index, 1);
        }
        previewContainer.remove();
        // If no previews left, remove the container itself
        if (!getAttachmentPreviewsContainer().hasChildNodes()) {
            getAttachmentPreviewsContainer().remove();
        }
        console.log('Image attachments:', imageAttachments);
    });

    previewContainer.appendChild(previewImage);
    previewContainer.appendChild(removeBtn);

    // Append preview to the dedicated container
    const previewsParent = getAttachmentPreviewsContainer();
    previewsParent.appendChild(previewContainer);
}

// Helper to get or create the previews container
function getAttachmentPreviewsContainer() {
    const inputContainer = elements.messageInput.closest('.message-input-container');
    let previewsContainer = inputContainer.querySelector('.attachment-previews-container');
    if (!previewsContainer) {
        previewsContainer = document.createElement('div');
        previewsContainer.className = 'attachment-previews-container';
        const inputRow = inputContainer.querySelector('.message-input-row');
        inputContainer.insertBefore(previewsContainer, inputRow); // Insert before the input row
    }
    return previewsContainer;
}

// Modify startNewChat and loadConversation to clear previews
function clearAttachmentPreviews() {
    const inputContainer = elements.messageInput?.closest('.message-input-container');
    const previewsContainer = inputContainer?.querySelector('.attachment-previews-container');
    if (previewsContainer) {
        previewsContainer.remove(); // Remove the whole container
    }
    imageAttachments = []; // Also clear the array
}

function startNewChat() {
    closeLivePopup(); // Ensure popup is closed and disconnected
    currentChatId = generateId();
    imageAttachments = [];
    
    // Clear chat messages
    elements.chatMessages.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to Apsara 2.5</h2>
            <p>An advanced AI chat interface for Gemini models</p>
            <p class="small">Developed by shubharthak</p>
        </div>
    `;
    
    // Clear input
    elements.messageInput.value = '';
    adjustTextareaHeight();
    
    // Clear any image previews
    const previews = document.querySelectorAll('.image-preview');
    previews.forEach(preview => preview.remove());
    
    // Add to conversations list
    addConversationToList('New Chat', currentChatId);
    
    // Save to local storage
    saveConversation({
        id: currentChatId,
        title: 'New Chat',
        messages: [],
        model: currentModelId,
        timestamp: new Date()
    });
    clearAttachmentPreviews(); // Clear previews
}

// Add conversation to sidebar list
function addConversationToList(title, id) {
    const listItem = document.createElement('li');
    listItem.setAttribute('data-id', id);
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'conversation-title';
    titleSpan.textContent = title;
    
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'conversation-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-conversation-btn';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.addEventListener('click', (e) => deleteConversation(id, e));
    
    actionsDiv.appendChild(deleteBtn);
    listItem.appendChild(titleSpan);
    listItem.appendChild(actionsDiv);
    
    if (id === currentChatId) {
        listItem.classList.add('active');
    }
    
    listItem.addEventListener('click', () => {
        loadConversation(id);
    });
    
    // Add to the beginning of the list
    if (elements.conversationsList.firstChild) {
        elements.conversationsList.insertBefore(listItem, elements.conversationsList.firstChild);
    } else {
        elements.conversationsList.appendChild(listItem);
    }
}

// Save conversation to local storage
function saveConversation(conversation) {
    let savedConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    
    // Find if conversation already exists
    const index = savedConversations.findIndex(c => c.id === conversation.id);
    
    if (index !== -1) {
        // Update existing conversation
        savedConversations[index] = conversation;
    } else {
        // Add new conversation
        savedConversations.unshift(conversation);
    }
    
    // Limit to 10 most recent conversations
    savedConversations = savedConversations.slice(0, 10);
    
    localStorage.setItem('conversations', JSON.stringify(savedConversations));
    conversations = savedConversations;
}

// Load conversations from local storage
function loadConversations() {
    const savedConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    conversations = savedConversations;
    
    elements.conversationsList.innerHTML = '';
    
    savedConversations.forEach(conversation => {
        addConversationToList(conversation.title, conversation.id);
    });
    
    // If there are no conversations, start a new one
    if (savedConversations.length === 0) {
        startNewChat();
    } else {
        // Load the most recent conversation
        loadConversation(savedConversations[0].id);
    }
}

//Function to show Groundings
function buildGroundingHTML(queries) {
    const wrapper = document.createElement('div');
    wrapper.className = 'grounding-info';
    const ul = document.createElement('ul');
    queries.forEach(q => {
      const li = document.createElement('li');
      const a  = document.createElement('a');
      a.href       = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      a.target     = '_blank';
      a.textContent = q;
      li.appendChild(a);
      ul.appendChild(li);
    });
    wrapper.appendChild(ul);
    return wrapper;
  }
  
// Load a specific conversation
function loadConversation(id) {
    closeLivePopup(); // Ensure popup is closed and disconnected
    const conversation = conversations.find(c => c.id === id);
    if (!conversation) return;
    
    currentChatId = id;
    currentModelId = conversation.model;
    setSelectedModel(currentModelId);
    
    // Update active class in sidebar
    document.querySelectorAll('#conversationsList li').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-id') === id) {
            item.classList.add('active');
        }
    });
    
    // Clear chat messages
    elements.chatMessages.innerHTML = '';
    
    // Render messages
    conversation.messages.forEach(message => {
        renderMessage(message);
    });
    
    // If no messages, show welcome message
    if (conversation.messages.length === 0) {
        elements.chatMessages.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to Apsara 2.5</h2>
                <p>An advanced AI chat interface for Gemini models</p>
                <p class="small">Developed by shubharthak</p>
            </div>
        `;
    }
    
    // Clear input and attachments
    elements.messageInput.value = '';
    imageAttachments = [];
    adjustTextareaHeight();
    
    // Clear any image previews
    const previews = document.querySelectorAll('.image-preview');
    previews.forEach(preview => preview.remove());
    
    // Scroll to bottom
    scrollToBottom();
    clearAttachmentPreviews(); // Clear previews
}

// Set the selected model in the dropdown
function setSelectedModel(modelId) {
    const options = Array.from(elements.modelSelect.options);
    const option = options.find(opt => opt.value === modelId);
    
    if (option) {
        option.selected = true;
    }
    
    updateModelSpecificSettings();
}

// Update settings based on selected model
function updateModelSpecificSettings() {
    // Handle Imagen 3 model
    const isImagen3 = currentModelId === 'imagen-3.0-generate-002';
    // Handle Gemini Image Gen model
    const isGeminiImageGen = currentModelId === 'gemini-2.0-flash-exp-image-generation';
    // Check if image generation model
    const isImageGen = isImagen3 || isGeminiImageGen;
    
    // Show/hide image generation settings - only for Imagen 3
    elements.imageGenSettings.style.display = isImagen3 ? 'block' : 'none';
    
    // Handle system instructions for Gemini Image Gen (not supported)
    elements.systemInstruction.disabled = isGeminiImageGen;
    if (isGeminiImageGen) {
        elements.systemInstruction.placeholder = 'System instructions not supported for this model';
        // Clear any existing system instruction
        if (elements.systemInstruction.value.trim()) {
            elements.systemInstruction.value = '';
        }
    } else {
        elements.systemInstruction.placeholder = 'Enter system instructions here...';
    }
    
    // Add model-specific info to UI
    const modelInfoElement = document.getElementById('modelInfo');
    if (modelInfoElement) {
        if (isImagen3) {
            modelInfoElement.textContent = 'Imagen 3: Creates high-quality images from text. Configure image settings below.';
            modelInfoElement.style.display = 'block';
        } else if (isGeminiImageGen) {
            modelInfoElement.textContent = 'Gemini Image Generation: Creates both text and images in the same response.';
            modelInfoElement.style.display = 'block';
        } else {
            modelInfoElement.style.display = 'none';
        }
    }
    
    // Adjust grounding options
    const canUseGrounding = currentModelId.includes('2.0') || currentModelId.includes('1.5') || currentModelId.includes('2.5');
    elements.enableGrounding.disabled = !canUseGrounding || isImagen3;
    elements.enableGrounding.checked = canUseGrounding && !isImagen3 && elements.enableGrounding.checked;
    
    // Adjust thinking budget options
    const canUseThinking = currentModelId.includes('2.5');
    elements.enableThinking.disabled = !canUseThinking || isImageGen;
    elements.enableThinking.checked = canUseThinking && !isImageGen && elements.enableThinking.checked;
    elements.thinkingBudgetContainer.style.display = canUseThinking && !isImageGen && elements.enableThinking.checked ? 'block' : 'none';
    
    // Adjust JSON mode
    elements.enableJsonMode.disabled = isImageGen;
    if (isImageGen && elements.enableJsonMode.checked) {
        elements.enableJsonMode.checked = false;
        elements.jsonSchemaContainer.style.display = 'none';
    }
}

// Prepare message data for API
function prepareMessageData(textContent) {
    const messageData = {
        modelId: currentModelId,
        contents: [],
        config: {}
    };
    
    // Include previous messages for context
    const conversation = conversations.find(c => c.id === currentChatId);
    if (conversation && conversation.messages.length > 0) {
        // Add up to the last 10 messages for context (to avoid token limits)
        const contextMessages = conversation.messages.slice(-10);
        
        contextMessages.forEach(msg => {
            if (msg.role === 'user') {
                const userParts = [];
                
                if (msg.content) {
                    userParts.push({ text: msg.content });
                }
                
                if (msg.images && msg.images.length > 0) {
                    msg.images.forEach(image => {
                        userParts.push({
                            inlineData: {
                                mimeType: image.mimeType,
                                data: image.data
                            }
                        });
                    });
                }
                
                messageData.contents.push({
                    role: 'user',
                    parts: userParts
                });
            } else if (msg.role === 'assistant' && msg.content) {
                const assistantParts = [{ text: msg.content }];
                
                messageData.contents.push({
                    role: 'model',
                    parts: assistantParts
                });
            }
        });
    }
    
    // Add current message being sent
    const userParts = [];
    
    // Add text content
    if (textContent) {
        userParts.push({ text: textContent });
    }
    
    // Add image attachments
    imageAttachments.forEach(image => {
        userParts.push({
            inlineData: {
                mimeType: image.mimeType,
                data: image.data
            }
        });
    });
    
    // Add the current message
    messageData.contents.push({
        role: 'user',
        parts: userParts
    });
    
    // Add system instruction if provided (except for Gemini Image Gen which doesn't support it)
    if (elements.systemInstruction.value.trim() && currentModelId !== 'gemini-2.0-flash-exp-image-generation') {
        messageData.config.systemInstruction = {
            parts: [{ text: elements.systemInstruction.value.trim() }]
        };
    }
    
    // Add JSON mode if enabled
    if (elements.enableJsonMode.checked) {
        messageData.config.generationConfig = messageData.config.generationConfig || {};
        messageData.config.generationConfig.responseMimeType = 'application/json';
        
        // Add JSON schema if provided
        if (elements.jsonSchema.value.trim()) {
            try {
                const schema = JSON.parse(elements.jsonSchema.value.trim());
                messageData.config.generationConfig.responseSchema = schema;
            } catch (error) {
                console.error('Invalid JSON schema:', error);
            }
        }
    }
    
    // Add grounding if enabled
    if (elements.enableGrounding.checked) {
        if (currentModelId.includes('2.0') || currentModelId.includes('2.5')) {
            messageData.config.enableGoogleSearch = true;
        } else if (currentModelId.includes('1.5')) {
            messageData.config.enableGoogleSearchRetrieval = true;
            messageData.config.dynamicRetrievalThreshold = 0.6; // Default threshold
        } 
    }
    
    // Add thinking budget if enabled
    if (elements.enableThinking.checked && currentModelId.includes('2.5')) {
        messageData.config.thinkingConfig = {
            thinkingBudget: parseInt(elements.thinkingBudget.value)
        };
    }
    
    // Add temperature
    messageData.config.generationConfig = messageData.config.generationConfig || {};
    messageData.config.generationConfig.temperature = parseFloat(elements.temperature.value);
    
    // Add image generation settings if applicable
    if (currentModelId === 'imagen-3.0-generate-002') {
        messageData.config.generationConfig = messageData.config.generationConfig || {};
        messageData.config.generationConfig.numberOfImages = parseInt(elements.numberOfImages.value);
        messageData.config.generationConfig.aspectRatio = elements.aspectRatio.value;
    }
    
    console.log('Sending message data:', messageData);
    return messageData;
}

// Send message to API
async function sendMessage() {
    const textContent = elements.messageInput.value.trim();

    // If live popup is active, don't send from main input (optional)
    if (isLiveModeActive) {
        showInfo("Live Chat is active in the popup.");
        return;
    }

    if (!textContent && imageAttachments.length === 0) return;

    // Standard REST/SSE processing check
    if (isProcessing) {
        showError("Please wait for the previous request to complete.");
        return;
    }

    // --- Send via REST/SSE --- (No WS check needed here anymore)
    console.log("Sending message via REST/SSE");
    isProcessing = true;
    elements.sendBtn.disabled = true;
    elements.typingIndicator.classList.add('visible');

    try {
         // --- Render User Message in MAIN chat ---
         const userMessageData = {
             role: 'user',
             content: textContent,
             images: [...imageAttachments], // Include attachments
             timestamp: new Date()
         };
         renderMessage(userMessageData); // Render in main chat

         // Store user message in conversation history
         const conversation = conversations.find(c => c.id === currentChatId);
         if (conversation) {
             conversation.messages.push(userMessageData); // Already includes images
             // Update title logic
             if (conversation.messages.length === 1 && textContent) {
                 const title = textContent.slice(0, 30) + (textContent.length > 30 ? '...' : '');
                 conversation.title = title;
                 const listItem = document.querySelector(`#conversationsList li[data-id="${currentChatId}"]`);
                 if (listItem) {
                     const titleSpan = listItem.querySelector('.conversation-title');
                     if (titleSpan) titleSpan.textContent = title;
                 }
             }
             saveConversation(conversation);
         }

        // Clear MAIN input and previews
        elements.messageInput.value = '';
        adjustTextareaHeight();
        clearAttachmentPreviews();

        // Prepare assistant message placeholder for REST/SSE
        const assistantMessage = { role: 'assistant', content: '', timestamp: new Date() };
        if (conversation) { conversation.messages.push(assistantMessage); }

        const messageData = prepareMessageData(textContent); // Prepare REST payload
        const useStreaming = elements.streamResponse.checked;

        if (useStreaming) {
            await handleStreamingResponse(messageData, assistantMessage);
        } else {
            await handleNonStreamingResponse(messageData, assistantMessage);
        }
    } catch (error) {
        console.error('Error sending REST/SSE message:', error);
        showError('An error occurred while sending your message. Please try again.');
        // Remove failed assistant placeholder message
        const conversation = conversations.find(c => c.id === currentChatId);
        if (conversation && conversation.messages[conversation.messages.length - 1]?.role === 'assistant') {
            conversation.messages.pop();
            saveConversation(conversation);
        }
    } finally {
        isProcessing = false;
        elements.sendBtn.disabled = false;
        elements.typingIndicator.classList.remove('visible');
        scrollToBottom(); // Scroll main chat
    }
}

// Handle streaming response
async function handleStreamingResponse(messageData, assistantMessage) {
    try {
        // Create message element for streaming content
        renderMessage(assistantMessage);
        const messageElement = document.querySelector('.message.assistant:last-child .message-content');
        
        // Show progress bar
        elements.streamProgressBar.classList.add('active');
        
        // Create AbortController for stream
        const controller = new AbortController();
        currentStreamController = controller;
        
        // Make request to streaming endpoint
        const response = await fetch(`${API_BASE_URL}/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData),
            signal: controller.signal
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        // Setup event source for streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completeResponse = '';
        
        // Process stream chunks
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            // Add chunk to buffer and process complete SSE messages
            buffer += decoder.decode(value, { stream: true });
            
            // Process all complete events in the buffer
            const events = buffer.split('\n\n');
            buffer = events.pop() || ''; // Keep the incomplete part in the buffer
            
            for (const event of events) {
                if (!event.trim()) continue;
                
                // Parse event
                const lines = event.split('\n');
                const eventType = lines.find(line => line.startsWith('event:'))?.substring(6).trim() || 'message';
                const dataLine = lines.find(line => line.startsWith('data:'));
                
                if (!dataLine) continue;
                
                const data = JSON.parse(dataLine.substring(5).trim());
                
                if (eventType === 'error') {
                    showError(data.error || 'An error occurred');
                    continue;
                }
                
                if (eventType === 'image_chunk' || eventType === 'image_result') {
                    // Handle image generation result
                    if (data.inlineData) {
                        const img = document.createElement('img');
                        img.src = `data:${data.inlineData.mimeType};base64,${data.inlineData.data}`;
                        img.alt = 'Generated Image';
                        img.classList.add('generated-image');
                        
                        if (!messageElement.querySelector(`img[src="${img.src}"]`)) {
                            messageElement.appendChild(img);
                            
                            // Add image to assistant message for storage
                            if (!assistantMessage.images) {
                                assistantMessage.images = [];
                            }
                            
                            assistantMessage.images.push({
                                mimeType: data.inlineData.mimeType,
                                data: data.inlineData.data
                            });
                            
                            // Update conversation with image
                            const conversation = conversations.find(c => c.id === currentChatId);
                            if (conversation) {
                                const lastMessage = conversation.messages[conversation.messages.length - 1];
                                if (lastMessage && lastMessage.role === 'assistant') {
                                    lastMessage.images = assistantMessage.images;
                                    saveConversation(conversation);
                                }
                            }
                        }
                    }
                    continue;
                }
                
                if (eventType === 'grounding_metadata') {
                    // store the queries on the message object
                    assistantMessage.groundingQueries = data.webSearchQueries
                    continue
                }
                  
                
                // Handle text content
                if (data.text) {
                    completeResponse += data.text;
                    assistantMessage.content = completeResponse;
                    
                    // Render markdown
                    messageElement.innerHTML = marked.parse(completeResponse);
                    
                    // Highlight code blocks
                    messageElement.querySelectorAll('pre code').forEach(block => {
                        hljs.highlightBlock(block);
                    });
                    
                    // Update conversation
                    const conversation = conversations.find(c => c.id === currentChatId);
                    if (conversation) {
                        const lastMessage = conversation.messages[conversation.messages.length - 1];
                        if (lastMessage && lastMessage.role === 'assistant') {
                            lastMessage.content = completeResponse;
                            saveConversation(conversation);
                        }
                    }
                    
                    scrollToBottom();
                }
            }
        }
        
        currentStreamController = null;
        // ▪ the stream is done; now actually attach the grounding HTML
        if (assistantMessage.groundingQueries?.length) {
            // find the last-assistant bubble's content div
            const messageContent = document.querySelector(
            '.message.assistant:last-child .message-content'
            );
            // build and append your chip
            const groundingNode = buildGroundingHTML(assistantMessage.groundingQueries);
            messageContent.appendChild(groundingNode);
        }
        // Hide progress bar when done
        elements.streamProgressBar.classList.remove('active');
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Stream aborted');
        } else {
            throw error;
        }
    } finally {
        // Always hide progress bar
        elements.streamProgressBar.classList.remove('active');
    }
}

// Handle non-streaming response
async function handleNonStreamingResponse(messageData, assistantMessage) {
    try {
        elements.typingIndicator.classList.add('visible');
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messageData)
        });
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        console.log('API response:', data);

        // --- Start Image Handling ---
        if (Array.isArray(data.response)) { // Check if response is an array (multipart)
            let textContent = '';
            const images = [];
            data.response.forEach(part => {
                if (part.text) {
                    textContent += part.text;
                } else if (part.inlineData?.data && part.inlineData?.mimeType) { // Check for valid inlineData
                    images.push({ // Store in the format renderMessage expects
                        mimeType: part.inlineData.mimeType,
                        data: part.inlineData.data
                    });
                }
            });
            assistantMessage.content = textContent;
            assistantMessage.images = images; // Assign collected images
            console.log(`Non-streaming: Processed ${images.length} images and text content.`);
            renderMessage(assistantMessage); // Re-render the message with images

        } // --- End Image Handling ---
        else if (typeof data.response === 'string') {
            assistantMessage.content = data.response;
            renderMessage(assistantMessage);
        } else if (typeof data.response === 'object' && data.response !== null) { // Check for non-null object
            try { // Safely stringify JSON response
                 assistantMessage.content = '```json\n' + JSON.stringify(data.response, null, 2) + '\n```';
            } catch (e) {
                 console.error("Error stringifying JSON response:", e);
                 assistantMessage.content = "[Error displaying JSON object]";
            }
            renderMessage(assistantMessage);
        } else {
             console.warn("Received unexpected response structure:", data);
             assistantMessage.content = "[Received unexpected data]";
             renderMessage(assistantMessage);
        }


        // Update conversation history (ensure images are saved)
        const conversation = conversations.find(c => c.id === currentChatId);
        if (conversation) {
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = assistantMessage.content;
                lastMessage.images = assistantMessage.images || []; // Ensure images array exists
                saveConversation(conversation);
            }
        }
        // ... (Grounding metadata handling remains the same) ...

    } catch(error) {
         console.error("Error in handleNonStreamingResponse:", error);
         showError(`Error getting response: ${error.message}`);
         // Remove placeholder on error
         const conversation = conversations.find(c => c.id === currentChatId);
         if (conversation && conversation.messages[conversation.messages.length-1]?.role==='assistant') {
             conversation.messages.pop(); saveConversation(conversation);
         }
    } finally {
        elements.typingIndicator.classList.remove('visible');
    }
}

// Render a message in the chat
function renderMessage(message) {
    const messageElement = document.createElement('div');
    // Add system message class if applicable
    messageElement.className = `message ${message.role} ${message.role === 'system' ? 'system-message' : ''}`;

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // *** Start ID Generation Fix ***
    let messageId = `${message.role}-`;
    try {
        const timestampValue = message.timestamp ? new Date(message.timestamp).getTime() : null;
        if (timestampValue && !isNaN(timestampValue)) {
            messageId += timestampValue;
        } else {
            messageId += Math.random().toString(36).substring(2, 9);
        }
    } catch (e) {
        messageId += Math.random().toString(36).substring(2, 9);
    }
    // *** End ID Generation Fix ***

    // Handle different content types
    if (message.role === 'user' || message.role === 'assistant') {
        // Render text content (handling potential markdown)
        if (message.content) {
            // Store full content for potential re-rendering (e.g., markdown parsing)
            messageBubble.dataset.fullContent = message.content;
            messageContent.innerHTML = marked.parse(message.content);

            // Highlight code blocks only for assistant messages for clarity
            if (message.role === 'assistant') {
                 messageContent.querySelectorAll('pre code').forEach(block => {
                      try {
                          hljs.highlightElement(block);
                      } catch(e) {
                           console.warn("Highlight.js error:", e);
                      }
                 });
            }
        }

        // Render image attachments (user or assistant)
        if (message.images && message.images.length > 0) {
            message.images.forEach(image => {
                const img = document.createElement('img');
                img.src = `data:${image.mimeType};base64,${image.data}`;
                img.alt = message.role === 'user' ? 'Attachment' : 'Generated Image';
                img.classList.add(message.role === 'assistant' ? 'generated-image' : 'attached-image'); // Add specific classes
                messageContent.appendChild(img);
            });
        }

         // Render grounding info for assistant messages
         if (message.role === 'assistant' && message.groundingQueries?.length) {
            const groundingNode = buildGroundingHTML(message.groundingQueries);
            messageContent.appendChild(groundingNode);
         }

    } else if (message.role === 'system') { // Handle system messages
         messageContent.textContent = message.content; // Display plain text
    }


    // Add timestamp display
    if (message.role !== 'system') {
        const timestampElement = document.createElement('div');
        timestampElement.className = 'message-timestamp';
        timestampElement.textContent = formatTimestamp(message.timestamp);
        messageBubble.appendChild(timestampElement);
    }


    messageBubble.insertBefore(messageContent, messageBubble.firstChild);
    messageElement.appendChild(messageBubble);

    // Avoid adding duplicate placeholders during streaming updates, allow user messages
    const existingElement = document.getElementById(messageId);
    if (!existingElement || message.role === 'user' || message.role === 'system') {
         // Only set ID if we are actually adding the element
         messageElement.id = messageId;
         elements.chatMessages.appendChild(messageElement);
    } else if (existingElement && message.role === 'assistant') {
         // If assistant message exists (likely placeholder), update its content
         const existingContent = existingElement.querySelector('.message-content');
         const existingTimestamp = existingElement.querySelector('.message-timestamp');
         if (existingContent) existingContent.innerHTML = messageContent.innerHTML;
         if (existingTimestamp) existingTimestamp.textContent = formatTimestamp(message.timestamp);
         return existingElement; // Return updated element
    }


    // Scroll to bottom
    scrollToBottom();

    return messageElement; // Return the created or updated element
}

// Scroll chat to bottom
function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Show error message
function showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    document.body.appendChild(errorElement);
    
    setTimeout(() => {
        errorElement.classList.add('show');
        
        setTimeout(() => {
            errorElement.classList.remove('show');
            setTimeout(() => {
                errorElement.remove();
            }, 300);
        }, 3000);
    }, 100);
}

// Apply theme (dark or light)
function applyTheme() {
    if (darkMode) {
        document.body.classList.add('dark-mode');
        elements.lightModeIcon.style.display = 'none';
        elements.darkModeIcon.style.display = 'block';
    } else {
        document.body.classList.remove('dark-mode');
        elements.lightModeIcon.style.display = 'block';
        elements.darkModeIcon.style.display = 'none';
    }
}

// Toggle dark/light mode
function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem('darkMode', darkMode);
    applyTheme();
}

// Delete a specific conversation
function deleteConversation(id, event) {
    event.stopPropagation(); // Prevent triggering conversation selection
    
    let savedConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    savedConversations = savedConversations.filter(c => c.id !== id);
    localStorage.setItem('conversations', JSON.stringify(savedConversations));
    conversations = savedConversations;
    
    // Remove from DOM
    const listItem = document.querySelector(`#conversationsList li[data-id="${id}"]`);
    if (listItem) listItem.remove();
    
    // If deleted the active conversation, load another one or create new
    if (id === currentChatId) {
        if (savedConversations.length > 0) {
            loadConversation(savedConversations[0].id);
        } else {
            startNewChat();
        }
    }
}

// Clear all conversations
function clearAllConversations() {
    if (confirm('Are you sure you want to delete all conversations? This cannot be undone.')) {
        localStorage.setItem('conversations', '[]');
        conversations = [];
        elements.conversationsList.innerHTML = '';
        startNewChat();
    }
}

// Helper function for non-error info messages (similar to showError)
function showInfo(message) {
    showToast(message, 'info');
}

// Helper function for success messages
function showSuccess(message) {
    showToast(message, 'success');
}

// Generic Toast Notification Function
function showToast(message, type = 'info') { // types: info, success, error, warning
    const toastElement = document.createElement('div');
    toastElement.className = `toast-message ${type}`; // Use type for styling
    toastElement.textContent = message;

    document.body.appendChild(toastElement);

    // Position calculation might be needed if multiple toasts can appear

    setTimeout(() => {
        toastElement.classList.add('show');
        setTimeout(() => {
            toastElement.classList.remove('show');
            setTimeout(() => {
                toastElement.remove();
            }, 300); // CSS transition duration
        }, 3000); // Display duration
    }, 100); // Delay before showing
}

// --- Live Mode Popup Logic ---

function openLivePopup() {
    console.log("Opening Live Popup...");
    if (!elements.liveModePopup) return;
    elements.liveModePopup.style.display = 'flex'; // Show overlay
    setTimeout(() => {
        elements.liveModePopup.classList.add('visible'); // Trigger transition
    }, 10); // Small delay ensures transition triggers

    // Add active class to main button
    elements.liveModeBtn?.classList.add('popup-active');

    // Reset UI state inside popup
    updateLivePopupState('disconnected'); // Initial state
    // Optional: Clear previous messages? Or keep them for the session?
    // elements.liveChatMessages.innerHTML = '<div class="message system-message"><div class="message-bubble">Welcome to Live Chat. Click Connect to start.</div></div>';

    // Disable main chat input while popup is open? (UX decision)
    // elements.messageInput.disabled = true;
    // elements.sendBtn.disabled = true;
}

function closeLivePopup() {
    console.log("Closing Live Popup function called..."); // Add this log
    if (!elements.liveModePopup) return;
    elements.liveModePopup.classList.remove('visible'); // Start fade out
    // Remove from DOM after transition
    setTimeout(() => {
        elements.liveModePopup.style.display = 'none';
    }, 300); // Match CSS transition duration

    // Remove active class from main button
    elements.liveModeBtn?.classList.remove('popup-active');

    // Disconnect WebSocket if connected
    disconnectWebSocket();

    // Re-enable main chat input if it was disabled
    // elements.messageInput.disabled = false;
    // elements.sendBtn.disabled = false;
}

function updateLivePopupState(state) { // states: 'disconnected', 'connecting', 'connected', 'error'
    if (!elements.liveStatusIndicator || !elements.liveMessageInput || !elements.liveSendBtn || !elements.liveConnectDisconnectBtn) {
        console.error("Live popup elements not found for state update.");
        return;
    }

    elements.liveStatusIndicator.classList.remove('disconnected', 'connecting', 'connected', 'error');
    elements.liveConnectDisconnectBtn.disabled = false;
    elements.liveConnectDisconnectBtn.textContent = 'Connect';
    elements.liveConnectDisconnectBtn.classList.remove('disconnect');
    elements.liveMessageInput.disabled = true;
    elements.liveSendBtn.disabled = true;

    switch (state) {
        case 'connecting':
            elements.liveStatusIndicator.classList.add('connecting');
            elements.liveStatusIndicator.textContent = 'Connecting...';
            elements.liveConnectDisconnectBtn.disabled = true;
            elements.liveConnectDisconnectBtn.textContent = 'Connecting...';
            break;
        case 'connected':
            elements.liveStatusIndicator.classList.add('connected');
            elements.liveStatusIndicator.textContent = 'Connected';
            elements.liveConnectDisconnectBtn.textContent = 'Disconnect';
            elements.liveConnectDisconnectBtn.classList.add('disconnect');
            elements.liveMessageInput.disabled = false; // Enable input
            elements.liveSendBtn.disabled = false;
            isLiveModeActive = true;
            disableLiveSettings(true); // Disable settings once fully connected
            break;
        case 'error':
            elements.liveStatusIndicator.classList.add('error');
            elements.liveStatusIndicator.textContent = 'Error';
            elements.liveConnectDisconnectBtn.textContent = 'Retry'; // Or just Connect
             isLiveModeActive = false;
            disableLiveSettings(false); // Re-enable settings on error
            break;
        case 'disconnected':
        default:
            elements.liveStatusIndicator.classList.add('disconnected');
            elements.liveStatusIndicator.textContent = 'Disconnected';
             isLiveModeActive = false;
            disableLiveSettings(false); // Re-enable settings on disconnect
            break;
    }

    // Disable Mic button unless connected and audio is enabled
    const canUseMic = (state === 'connected' && elements.liveOutputAudioText?.classList.contains('active'));
    elements.liveMicBtn.disabled = !canUseMic;
}

function handleLiveConnectDisconnect() {
    if (isLiveModeActive || (webSocket && webSocket.readyState === WebSocket.OPEN)) {
        disconnectWebSocket();
    } else {
        connectWebSocket();
    }
}

// --- Timer Display Function ---
function updateTimerDisplay() {
    if (!elements.liveTimerDisplay) return;

    const now = Date.now();
    const remainingMs = Math.max(0, liveSessionEndTime - now);
    const remainingSeconds = Math.floor(remainingMs / 1000);
    const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const seconds = String(remainingSeconds % 60).padStart(2, '0');

    elements.liveTimerDisplay.textContent = `${minutes}:${seconds}`;

    if (remainingMs === 0 && liveSessionIntervalId) {
        // Stop interval once timer reaches zero (timer expiry handled by setTimeout)
        clearInterval(liveSessionIntervalId);
        liveSessionIntervalId = null;
    }
}

// --- WebSocket Functions (Now Tied to Popup) ---

function startLiveSessionTimer() {
    clearLiveSessionTimer(); // Clear any existing timer/interval first
    liveSessionEndTime = Date.now() + LIVE_SESSION_DURATION_MS;
    console.log(`Starting live session timer. Ends at: ${new Date(liveSessionEndTime).toLocaleTimeString()}`);

    // Update display immediately and then every second
    updateTimerDisplay();
    liveSessionIntervalId = setInterval(updateTimerDisplay, 1000);

    // Set the main expiry timeout
    liveSessionTimerId = setTimeout(() => {
        console.log("Live session timer expired.");
        renderLiveSystemMessage("Session timer expired. Disconnecting.");
        disconnectWebSocket();
        showInfo("Live session ended due to inactivity.");
         if (liveSessionIntervalId) clearInterval(liveSessionIntervalId); // Ensure interval cleared on expiry too
         liveSessionIntervalId = null;
    }, LIVE_SESSION_DURATION_MS);
}

function clearLiveSessionTimer() {
     if (liveSessionTimerId) {
        clearTimeout(liveSessionTimerId);
        liveSessionTimerId = null;
     }
     if (liveSessionIntervalId) {
         clearInterval(liveSessionIntervalId);
         liveSessionIntervalId = null;
     }
     liveSessionEndTime = 0;
     // Clear the display when timer is cleared
     if (elements.liveTimerDisplay) {
         elements.liveTimerDisplay.textContent = ""; // Or "--:--"
     }
     console.log("Cleared live session timer and display.");
}

async function connectWebSocket() {
    console.log("Attempting to connect WebSocket for Live Popup...");
    updateLivePopupState('connecting');
    renderLiveSystemMessage("Connecting to Live Mode...");

    // --- Prepare Live Config from UI ---
    const selectedOutputFormat = elements.liveOutputAudioText?.classList.contains('active') ? 'AUDIO_TEXT' : 'TEXT';
    const selectedVoice = elements.liveVoiceSelect?.value || 'Puck';
    const modalities = selectedOutputFormat === 'AUDIO_TEXT' ? 'TEXT,AUDIO' : 'TEXT';

    // --- Construct WS URL with Query Params ---
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = `${wsProtocol}//${window.location.host}/live`;
    // Add query parameters
    wsUrl += `?modalities=${encodeURIComponent(modalities)}`;
    wsUrl += `&voice=${encodeURIComponent(selectedVoice)}`;
    // Add other params if needed
    console.log(`Live Popup: Connecting to ${wsUrl}`);

    // Disable settings *before* creating socket
    disableLiveSettings(true);

    try {
        webSocket = new WebSocket(wsUrl);
        console.log("Live Popup: WebSocket object created.");

        webSocket.onopen = () => { /* ... */ };

        webSocket.onmessage = (event) => {
            // Log the raw event data received from the backend proxy
            console.log("Live Popup: WebSocket onmessage event fired. Raw data:", event.data);
            console.debug("Type of data received:", typeof event.data);

            let message; // Message variable is defined here
            try {
                if (typeof event.data !== 'string') {
                    console.error("Received non-string data from WebSocket:", event.data);
                    return;
                }
                message = JSON.parse(event.data);
            } catch (err) {
                console.error("Failed to parse Live Popup WebSocket message JSON:", err, "\nRaw data:", event.data);
                return;
            }
            console.log("Parsed Live Popup WebSocket message:", message);

            // --- Start: Moved message handling logic INSIDE onmessage ---

            // Handle Meta Events from Backend Proxy
            let isMetaEvent = false;
            if (message.event === 'connected') {
                console.log(">>> Handling 'connected' event <<<");
                console.log("Backend confirmed Live session connected for Popup.");
                isMetaEvent = true;
                // No return, check other fields
            }
            if (message.event === 'error') {
                console.log(">>> Handling 'error' event <<<");
                console.error("WebSocket error relayed from backend:", message.message);
                renderLiveSystemMessage(`Error: ${message.message}`);
                updateLivePopupState('error');
                disconnectWebSocket(false);
                isMetaEvent = true;
                return;
            }
            if (message.event === 'closed') {
                 console.log(">>> Handling 'closed' event <<<");
                 console.log("Backend relayed Live session closed.");
                 renderLiveSystemMessage("Connection closed by server.");
                 updateLivePopupState('disconnected');
                 isLiveModeActive = false;
                 if (webSocket) webSocket = null;
                 isMetaEvent = true;
                 return;
            }

            // --- Handle Messages Forwarded from Google Live API ---
            let handledGoogleMessage = false;
            if (message.setupComplete) {
                // *** Add Try/Catch around setup complete logic ***
                try {
                    console.log(">>> Handling 'setupComplete' message <<<");
                    console.log("Google API Setup Complete received for Popup.");
                    updateLivePopupState('connected');
                    renderLiveSystemMessage("Live Mode ready.");
                    disableLiveSettings(true);
                    startLiveSessionTimer();
                    const isAudioModeActive = elements.liveOutputAudioText?.classList.contains('active');
                    if (elements.liveMicBtn) {
                        elements.liveMicBtn.disabled = !isAudioModeActive;
                        console.log(`Mic button ${elements.liveMicBtn.disabled ? 'disabled' : 'enabled'} based on setupComplete.`);
                    }
                } catch (setupError) {
                    console.error("Error during setupComplete handling:", setupError);
                    renderLiveSystemMessage("Error initializing live session state.");
                    disconnectWebSocket(); // Disconnect if setup handling fails
                }
                // *** End Try/Catch ***
                handledGoogleMessage = true;
            }

            if (message.serverContent) {
                console.log(">>> Handling 'serverContent' message <<<", message.serverContent);
                handleLiveServerContent(message.serverContent, message.usageMetadata); // Handle text, audio, etc.
                 // Handle potential audio content within serverContent
                const audioPart = message.serverContent.modelTurn?.parts?.find(part => part.audio);
                if (audioPart?.audio?.content) {
                    console.log("Received audio content chunk in serverContent");
                    queueAudioForPlayback(audioPart.audio.content); // Pass base64 string
                }
                handledGoogleMessage = true;
            }
            if (message.toolCall?.functionCalls?.length) {
                 console.log(">>> Handling 'toolCall' message <<<");
                console.warn("Tool call received in Live Popup:", message.toolCall.functionCalls);
                renderLiveSystemMessage(`Assistant wants to use tool(s): ${message.toolCall.functionCalls.map(fc => fc.name).join(', ')} (Not implemented)`);
                 handledGoogleMessage = true;
            }
             // Add checks for other Google message types (toolCallCancellation, goAway, etc.) here if needed

             // Log if no specific handler was matched for a non-meta event
             if (!isMetaEvent && !handledGoogleMessage) {
                  console.warn("Received unhandled message structure:", message);
             }
             // --- End: Moved message handling logic INSIDE onmessage ---
        }; // End of webSocket.onmessage handler

        webSocket.onerror = (error) => {
            // ... (existing error logic) ...
             elements.liveMicBtn.disabled = true; // Disable mic on error
        };

        webSocket.onclose = (event) => {
            // ... (existing close logic) ...
             elements.liveMicBtn.disabled = true; // Disable mic on close
             stopRecording(); // Ensure recording stops if connection drops
        };
        console.log("Live Popup: WebSocket event handlers assigned.");

    } catch (error) {
        // ... (existing catch logic) ...
        elements.liveMicBtn.disabled = true; // Disable mic on initial connect error
    }
}

function disconnectWebSocket() {
     disableLiveSettings(false);
     stopRecording(); // Make sure recording stops on disconnect
     elements.liveMicBtn.disabled = true; // Disable mic button
     // ... (rest of disconnect logic) ...
}

// --- Handle incoming content within the popup ---
function handleLiveServerContent(serverContent, usageMetadata) {
     const content = serverContent;
     let textChunk = content.modelTurn?.parts?.[0]?.text || "";

     if (textChunk) {
         currentLiveTurnAssistantContent += textChunk;
         if (!currentLiveTurnAssistantElement) {
             const assistantMessageData = { role: 'assistant', content: '', timestamp: new Date() };
             const renderedElement = renderLiveMessage(assistantMessageData);
             currentLiveTurnAssistantElement = renderedElement?.querySelector('.message-content');
         }
         if (currentLiveTurnAssistantElement) {
             try { // Add try...catch around marked.parse
                currentLiveTurnAssistantElement.innerHTML = marked.parse(currentLiveTurnAssistantContent);
             } catch (markdownError) {
                 console.error("Markdown parsing error:", markdownError, "\nContent:", currentLiveTurnAssistantContent);
                 // Fallback: Display raw text if markdown fails
                 currentLiveTurnAssistantElement.textContent = currentLiveTurnAssistantContent;
             }
             // Apply highlighting *after* setting innerHTML
             currentLiveTurnAssistantElement.querySelectorAll('pre code').forEach(block => {
                 try { if (window.hljs) hljs.highlightElement(block); } catch(e) {}
             });
             scrollLivePopupToBottom();
         }
     }

     if (content.groundingMetadata?.webSearchQueries?.length) {
         if (currentLiveTurnAssistantElement) {
             const existingGrounding = currentLiveTurnAssistantElement.querySelector('.grounding-info');
             if(existingGrounding) existingGrounding.remove();
             const groundingNode = buildGroundingHTML(content.groundingMetadata.webSearchQueries);
             currentLiveTurnAssistantElement.appendChild(groundingNode);
             scrollLivePopupToBottom();
         }
     }

     if (content.turnComplete === true) {
         console.log("Live Popup: Server indicated turn complete.");
         currentLiveTurnAssistantContent = "";
         currentLiveTurnAssistantElement = null;
         // Optional: Add usageMetadata display somewhere?
         if (usageMetadata) console.log("Usage Metadata:", usageMetadata);
     }
}

// --- Send Message (from Popup Input) ---
function sendLiveMessage() {
    if (!isLiveModeActive || !webSocket || webSocket.readyState !== WebSocket.OPEN) {
        console.warn("Cannot send message: Live mode not connected.");
        // Optionally show message in popup: renderLiveSystemMessage("Not connected.");
        return;
    }

    const textContent = elements.liveMessageInput.value.trim();
    if (!textContent) return;

    console.log("Sending message via Live Popup WebSocket:", textContent);

    // Render user message in the *popup*
    renderLiveMessage({
        role: 'user',
        content: textContent,
        timestamp: new Date()
    });
    elements.liveMessageInput.value = ''; // Clear popup input
    adjustLiveTextareaHeight(); // Adjust height if needed

    try {
        webSocket.send(textContent); // Send raw text
         // Reset for next assistant response
         currentLiveTurnAssistantContent = "";
         currentLiveTurnAssistantElement = null;
    } catch (error) {
        console.error("Error sending Live Popup WebSocket message:", error);
        renderLiveSystemMessage("Error sending message.");
        disconnectWebSocket();
    }
     scrollLivePopupToBottom();
}

// --- Rendering Logic for Live Popup ---
function renderLiveMessage(message) {
    if (!elements.liveChatMessages) return null;

    // --- Assistant Message Update Logic ---
    // Use the ID generated from timestamp/role for more reliable updates
    let liveMessageId = `live-${message.role}-`;
    try {
        const timestampValue = message.timestamp ? new Date(message.timestamp).getTime() : null;
        if (timestampValue && !isNaN(timestampValue)) {
            liveMessageId += timestampValue;
        } else {
            liveMessageId += Math.random().toString(36).substring(2, 9);
        }
    } catch (e) {
        liveMessageId += Math.random().toString(36).substring(2, 9);
    }

    const existingElement = document.getElementById(liveMessageId);

    // If it's an assistant message AND we have an existing placeholder for this ID, update it.
    if (message.role === 'assistant' && existingElement) {
        const existingContentDiv = existingElement.querySelector('.message-content');
        const existingBubble = existingContentDiv.closest('.message-bubble');
        const existingTimestamp = existingBubble?.querySelector('.message-timestamp');

        if (existingContentDiv) {
             // Update content using marked.parse
             try {
                 existingContentDiv.innerHTML = marked.parse(message.content || ''); // Use message content
             } catch (markdownError) {
                 console.error("Markdown parsing error during update:", markdownError);
                 existingContentDiv.textContent = message.content || ''; // Fallback
             }
             // Apply highlighting
              existingContentDiv.querySelectorAll('pre code').forEach(block => {
                 try { if (window.hljs) hljs.highlightElement(block); } catch(e) {}
              });
        }
        // Update timestamp if available
        if (existingTimestamp) {
            existingTimestamp.textContent = formatTimestamp(message.timestamp || new Date());
        }
        // Add/update grounding if present
        if (existingContentDiv && message.groundingQueries?.length) {
             const existingGrounding = existingContentDiv.querySelector('.grounding-info');
             if(existingGrounding) existingGrounding.remove();
             const groundingNode = buildGroundingHTML(message.groundingQueries);
             existingContentDiv.appendChild(groundingNode);
        }
        scrollLivePopupToBottom();
        return existingElement; // Return the updated element
    }

    // --- Create New Message Element ---
    // (If it's not an existing assistant message to update)
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.role} ${message.role === 'system' ? 'system-message' : ''}`;
    messageElement.id = liveMessageId; // Assign ID

    const messageBubble = document.createElement('div');
    messageBubble.className = 'message-bubble';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';

    // Populate content based on role
    if (message.role === 'user' || message.role === 'assistant') {
        if (message.content) {
             try {
                messageContent.innerHTML = marked.parse(message.content);
             } catch(markdownError) {
                 console.error("Markdown parsing error on create:", markdownError);
                 messageContent.textContent = message.content;
             }
             if (message.role === 'assistant') {
                messageContent.querySelectorAll('pre code').forEach(block => {
                    try { if (window.hljs) hljs.highlightElement(block); } catch(e) {}
                });
                // Add grounding if assistant (also needed on create)
                 if (message.groundingQueries?.length) {
                     const groundingNode = buildGroundingHTML(message.groundingQueries);
                     messageContent.appendChild(groundingNode);
                 }
             }
        } else if (message.role === 'assistant') {
             // Create placeholder bubble for assistant if content is initially empty
             messageContent.innerHTML = '<span class="placeholder-dot"></span>'; // Add a visual placeholder
        }
    } else if (message.role === 'system') {
        messageContent.textContent = message.content;
    }

     // Add timestamp display
    if (message.role !== 'system') {
        const timestampElement = document.createElement('div');
        timestampElement.className = 'message-timestamp';
        timestampElement.textContent = formatTimestamp(message.timestamp || new Date());
        messageBubble.appendChild(timestampElement);
    }

    messageBubble.insertBefore(messageContent, messageBubble.firstChild);
    messageElement.appendChild(messageBubble);

    // --- Append the new element ---
    elements.liveChatMessages.appendChild(messageElement);
    scrollLivePopupToBottom();

    return messageElement; // Return the newly created element
}

function renderLiveSystemMessage(text) {
     console.info("Live System Message:", text);
     renderLiveMessage({ role: 'system', content: text, timestamp: new Date() });
}

function scrollLivePopupToBottom() {
    if (elements.liveChatMessages) {
        elements.liveChatMessages.scrollTop = elements.liveChatMessages.scrollHeight;
    }
}

function adjustLiveTextareaHeight() {
    const textarea = elements.liveMessageInput;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minHeight = 38;
    const maxHeight = 100;
    const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight));
    textarea.style.height = newHeight + 'px';
}


// --- Ensure Highlight.js is available ---
// Check if hljs is loaded, maybe add a check in render functions
if (typeof hljs === 'undefined') {
    console.warn("Highlight.js (hljs) library not found. Code highlighting will be disabled.");
}


// Initialize the app
document.addEventListener('DOMContentLoaded', initApp);

// --- Live Settings Panel Logic ---
function toggleLiveSettingsPanel() {
    if (!elements.liveSettingsPanel || !elements.liveChatMessages) return;
    const isOpen = elements.liveSettingsPanel.classList.contains('open');
    if (isOpen) {
        closeLiveSettingsPanel();
    } else {
        openLiveSettingsPanel();
    }
}

function openLiveSettingsPanel() {
    console.log("Opening Live Settings");
    elements.liveSettingsPanel?.classList.add('open');
    elements.liveChatMessages?.classList.add('settings-open'); // Adjust message area margin
    // Populate voice select if not already done
    populateLiveVoiceSelector();
}

function closeLiveSettingsPanel() {
    console.log("Closing Live Settings");
    elements.liveSettingsPanel?.classList.remove('open');
    elements.liveChatMessages?.classList.remove('settings-open');
}

function setLiveOutputFormat(format) { // 'AUDIO_TEXT' or 'TEXT'
    console.log("Setting Live Output Format:", format);
    if (!elements.liveOutputAudioText || !elements.liveOutputText) return;
    const isAudioText = format === 'AUDIO_TEXT';
    elements.liveOutputAudioText.classList.toggle('active', isAudioText);
    elements.liveOutputText.classList.toggle('active', !isAudioText);
    // TODO: Store this setting and use it when connecting WebSocket in Phase 2
}

function populateLiveVoiceSelector() {
     // Reuse fetchVoices if needed, or assume voices are fetched initially
     // This populates the *live settings* voice dropdown
     if (elements.liveVoiceSelect && elements.liveVoiceSelect.options.length <= 1) { // Populate only once
         console.log("Populating live voice selector");
         elements.liveVoiceSelect.innerHTML = ''; // Clear placeholder
         const available = elements.voiceSelect?.options ? Array.from(elements.voiceSelect.options).map(o=>o.value) : [];
         if (available.length > 0) {
              available.forEach(voiceName => {
                  const option = document.createElement('option');
                  option.value = voiceName;
                  option.textContent = voiceName;
                  elements.liveVoiceSelect.appendChild(option);
              });
              // Set default selection?
              elements.liveVoiceSelect.value = available[0];
         } else {
              elements.liveVoiceSelect.innerHTML = '<option>No voices</option>';
         }
     }
}

function handleLiveVoiceSelection(e) {
     const selectedVoice = e.target.value;
     console.log("Live Voice Selected:", selectedVoice);
     // TODO: Store this setting and use it when connecting WebSocket in Phase 2
     // We don't need to call the /voices/select API here,
     // the backend will use the chosen voice when ai.live.connect is called.
}

function disableLiveSettings(disabled) {
    const panel = elements.liveSettingsPanel;
    if (!panel) return;
    const controls = panel.querySelectorAll('button, select, input');
    controls.forEach(control => {
        // Don't disable the close button for the panel itself
        if (control.id !== 'closeLiveSettingsBtn') {
             control.disabled = disabled;
        }
    });
     panel.style.opacity = disabled ? 0.6 : 1; // Indicate disabled state
     panel.style.pointerEvents = disabled ? 'none' : 'auto'; // Prevent interaction
     console.log(`Live settings ${disabled ? 'disabled' : 'enabled'}.`);
}

// --- Audio Input Functions ---
async function handleMicButtonClick() {
    if (!isLiveModeActive) {
        showError("Connect to Live Mode before using the microphone.");
        return;
    }
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    console.log("Starting audio recording...");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Microphone access (getUserMedia) not supported by your browser.");
        return false;
    }
    if (isRecording) {
         console.warn("Already recording.");
         return false;
    }

    try {
        // Get audio stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        // Setup Audio Context (create only once)
        if (!audioContext) {
             audioContext = new (window.AudioContext || window.webkitAudioContext)();
             // Optional: Create gain/destination nodes if needed later
             // audioDestinationNode = audioContext.createMediaStreamDestination();
        }
        // Ensure context is running (browsers might suspend it)
        if (audioContext.state === 'suspended') {
             await audioContext.resume();
        }

        // Setup MediaRecorder
        const options = { mimeType: 'audio/webm;codecs=opus' }; // Prefer Opus/WebM if supported
        try {
             mediaRecorder = new MediaRecorder(stream, options);
        } catch (e1) {
             console.warn(`MediaRecorder with ${options.mimeType} failed: ${e1}. Trying default.`);
             try {
                  mediaRecorder = new MediaRecorder(stream); // Try default mimeType
             } catch(e2) {
                  console.error("MediaRecorder setup failed:", e2);
                  showError("Failed to create MediaRecorder. Check browser compatibility.");
                  if (stream) stream.getTracks().forEach(track => track.stop()); // Release mic
                  return false;
             }
        }

        console.log("MediaRecorder created with mimeType:", mediaRecorder.mimeType);
        audioChunks = []; // Clear previous chunks

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
                // Send chunks in real-time
                sendAudioChunk(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            console.log("Recording stopped.");
            isRecording = false;
            // *** Start Change ***
            if (elements.liveMicBtn) { // Check if element exists
                elements.liveMicBtn.classList.remove('recording');
                // Re-enable button ONLY if still connected and audio allowed
                const canUseMic = (isLiveModeActive && elements.liveOutputAudioText?.classList.contains('active'));
                elements.liveMicBtn.disabled = !canUseMic;
            }
             // *** End Change ***

            // Stop the tracks to turn off mic indicator
            // Use optional chaining safely here as we are just calling methods
            mediaRecorder?.stream?.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.onerror = (event) => {
             console.error("MediaRecorder error:", event.error);
             showError("An error occurred during recording.");
             stopRecording(); // Attempt to clean up
        };

        // Start recording, collecting data in small chunks (e.g., every 250ms)
        mediaRecorder.start(250);
        isRecording = true;
        // *** Start Change ***
        if (elements.liveMicBtn) { // Check if element exists
            elements.liveMicBtn.classList.add('recording');
            elements.liveMicBtn.disabled = false; // Keep enabled to allow stopping
        }
        // *** End Change ***
        console.log("MediaRecorder started.");
        return true;

    } catch (err) {
        console.error("Error accessing microphone:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            showError("Microphone permission denied. Please allow access in browser settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
             showError("No microphone found.");
        } else {
             showError(`Error accessing microphone: ${err.name}`);
        }
        isRecording = false;
        if (elements.liveMicBtn){
            elements.liveMicBtn.classList.remove('recording');
            elements.liveMicBtn.disabled = false; // Allow retry if error wasn't fatal

        }
        return false;
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        console.log("Stopping MediaRecorder...");
        try {
            mediaRecorder.stop(); // This triggers onstop handler
        } catch (e) {
             console.error("Error stopping MediaRecorder:", e);
             // Force cleanup if stop fails
             isRecording = false;
             // *** Start Change ***
             if (elements.liveMicBtn) { // Check if element exists
                 elements.liveMicBtn.classList.remove('recording');
                 elements.liveMicBtn.disabled = false;
             }
             // *** End Change ***
             // Manually stop tracks if onstop didn't fire
              mediaRecorder?.stream?.getTracks().forEach(track => track.stop());
        }
    } else {
         console.log("Not recording or recorder not initialized.");
         // Ensure UI is correct even if recorder wasn't active
         isRecording = false;
         // *** Start Change ***
         if (elements.liveMicBtn) { // Check if element exists
             elements.liveMicBtn.classList.remove('recording');
             // Only enable if live mode is active and allows audio
             const canUseMic = (isLiveModeActive && elements.liveOutputAudioText?.classList.contains('active'));
             elements.liveMicBtn.disabled = !canUseMic;
         }
         // *** End Change ***
    }
}

function sendAudioChunk(audioBlob) {
    if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        // console.log(`Sending audio chunk via WebSocket: size ${audioBlob.size}`);
        try {
            // Backend expects raw Buffer. Send Blob directly, WS converts it.
            webSocket.send(audioBlob);
        } catch (error) {
            console.error("Error sending audio chunk:", error);
            renderLiveSystemMessage("Error sending audio.");
            // Optionally stop recording or disconnect on send error
            // stopRecording();
            // disconnectWebSocket();
        }
    } else {
        console.warn("Cannot send audio chunk: WebSocket not open.");
        // Stop recording if connection is lost while sending
        if (isRecording) stopRecording();
    }
} 

// --- Audio Output/Playback Functions ---

// Modify queue to store target element ID
function queueAudioForPlayback(base64AudioData, targetElementId) {
    audioPlaybackQueue.push({ base64Data, targetElementId });
    console.log(`Audio chunk queued for element ${targetElementId}. Queue size: ${audioPlaybackQueue.length}`);
    if (!isPlayingAudio) {
        playNextAudioChunk();
    }
}

async function playNextAudioChunk() {
    if (audioPlaybackQueue.length === 0) {
        isPlayingAudio = false;
        currentAudioPlayer = null; // Clear reference
        console.log("Audio playback queue empty.");
        return;
    }
    if (!audioContext || audioContext.state === 'suspended') {
         console.warn("AudioContext not ready for playback.");
         // Optionally try to resume context here or wait
         if (audioContext) await audioContext.resume();
         if (!audioContext || audioContext.state !== 'running') {
              showError("Audio playback failed. Please interact with the page (click) to enable audio.");
              audioPlaybackQueue = []; // Clear queue if context fails
              isPlayingAudio = false;
              return;
         }
    }

    isPlayingAudio = true;
    const { base64Data, targetElementId } = audioPlaybackQueue.shift(); // Get next chunk and target
    const targetMessageElement = document.getElementById(targetElementId);
    const messageContentDiv = targetMessageElement?.querySelector('.message-content');

    if (!messageContentDiv) {
        console.warn(`Target element content div #${targetElementId} not found for audio playback. Skipping.`);
        isPlayingAudio = false; // Allow next attempt quickly
        setTimeout(playNextAudioChunk, 50);
        return;
    }

    try {
        // Decode base64 -> ArrayBuffer -> AudioBuffer (same as before)
        const byteString = atob(base64Data);
        const byteArray = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) byteArray[i] = byteString.charCodeAt(i);
        const audioBuffer = await audioContext.decodeAudioData(byteArray.buffer);

        // Find or create the audio player *within the target message*
        let audioPlayerDiv = messageContentDiv.querySelector('.audio-player-message');
        let audioElement;

        if (!audioPlayerDiv) {
            const template = document.getElementById('audioPlayerTemplate');
            if (!template) throw new Error("Audio player template not found");
            const clone = template.content.cloneNode(true);
            audioPlayerDiv = clone.querySelector('.audio-player-message');
            audioElement = clone.querySelector('.audio-player-element');
            messageContentDiv.appendChild(clone); // Append player to message content
            console.log(`Audio player created for message ${targetElementId}`);
        } else {
            audioElement = audioPlayerDiv.querySelector('.audio-player-element');
            if (!audioElement) throw new Error("Audio element missing within player div");
             console.log(`Reusing audio player for message ${targetElementId}`);
        }

         // Stop previous playback if any
         if (currentAudioPlayer && !currentAudioPlayer.paused) {
             currentAudioPlayer.pause();
             currentAudioPlayer.currentTime = 0; // Reset previous
         }

         currentAudioPlayer = audioElement; // Set new current player

        // Create a *new* source node each time you play
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // Set the audio source for the HTML element (allows controls to work)
        const audioBlob = new Blob([byteArray.buffer], { type: 'audio/webm' }); // Assuming webm/opus output
        const audioUrl = URL.createObjectURL(audioBlob);
        audioElement.src = audioUrl; // Set src for controls

        source.onended = () => {
            console.log(`Audio chunk finished playing for ${targetElementId}.`);
             URL.revokeObjectURL(audioUrl); // Clean up object URL
             // Wait a tiny bit before processing next to ensure state updates
             setTimeout(playNextAudioChunk, 50);
        };

        console.log(`Playing audio chunk for ${targetElementId}...`);
        // Start playback via AudioContext (more precise) or HTML element
        // source.start(); // Using AudioContext - might not sync with controls perfectly
        audioElement.play().catch(e => console.error("Audio element play error:", e)); // Using HTML element - better control sync

    } catch (error) {
        console.error("Error decoding or playing audio:", error);
        renderLiveSystemMessage(`Error playing audio for message ${targetElementId}.`);
        isPlayingAudio = false;
        currentAudioPlayer = null;
        setTimeout(playNextAudioChunk, 100); // Try next after delay
    }
}

// --- Update handleLiveServerContent ---
// (No change needed here, audio is handled directly in onmessage)

// --- Update updateLivePopupState ---
// Ensure mic button is disabled correctly initially and on error/disconnect
function updateLivePopupState(state) {
    // ... (existing state updates) ...

     // Disable Mic button unless connected and audio is enabled
     const canUseMic = (state === 'connected' && elements.liveOutputAudioText?.classList.contains('active'));
     elements.liveMicBtn.disabled = !canUseMic;

    // ... (rest of the function) ...
}