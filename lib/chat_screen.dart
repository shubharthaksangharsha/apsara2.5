import 'dart:io';
import 'dart:typed_data';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_generative_ai/google_generative_ai.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:animated_text_kit/animated_text_kit.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import 'package:shimmer/shimmer.dart';
import 'package:vibration/vibration.dart';
import 'package:flutter_keyboard_visibility/flutter_keyboard_visibility.dart';
import 'theme_provider.dart';
import 'dart:async';
import 'services/weather_service.dart';
import 'widgets/about_section.dart';
import 'services/hive_service.dart';
import 'widgets/enhanced_message_content.dart';
import 'widgets/wake_word_popup.dart';
import 'services/wake_word_service.dart';
import 'dart:math';

// Function Declarations for Tools
final getWeatherFunction = FunctionDeclaration(
  'getWeather',
  'Get detailed weather information for a specific location',
  Schema.object(properties: {
    'city': Schema.string(
      description: 'The city name to get weather for',
      nullable: false,
    ),
    'country': Schema.string(
      description: 'The country code (e.g., US, UK, IN)',
      nullable: true,
    ),
  }),
);

final switchThemeFunction = FunctionDeclaration(
  'switchTheme',
  'Switch the app theme between light and dark mode',
  Schema.object(properties: {
    'mode': Schema.string(
      description: 'The theme mode to switch to: "light", "dark", or "system"',
      nullable: false,
    ),
  }),
);

// Function Implementations
final WeatherService _weatherService = WeatherService();

Future<Map<String, Object?>> getWeather(Map<String, Object?> args) async {
  try {
    final city = args['city'] as String;
    final country = args['country'] as String?;
    
    final weatherData = await _weatherService.getWeather(city, country);
    final iconUrl = _weatherService.getWeatherIconUrl(weatherData['icon'] as String);
    
    return {
      'temperature': weatherData['temperature'],
      'condition': weatherData['condition'],
      'description': weatherData['description'],
      'humidity': weatherData['humidity'],
      'windSpeed': weatherData['windSpeed'],
      'location': weatherData['location'],
      'iconUrl': iconUrl,
    };
  } catch (e) {
    return {
      'error': 'Failed to get weather data: $e',
    };
  }
}

Map<String, Object?> switchTheme(Map<String, Object?> args, BuildContext context) {
  final mode = args['mode'] as String;
  ThemeMode themeMode;
  
  switch (mode.toLowerCase()) {
    case 'light':
      themeMode = ThemeMode.light;
      break;
    case 'dark':
      themeMode = ThemeMode.dark;
      break;
    case 'system':
      themeMode = ThemeMode.system;
      break;
    default:
      throw ArgumentError('Invalid theme mode: $mode');
  }
  
  ThemeProvider.updateThemeMode(themeMode);
  
  return {
    'success': true,
    'currentMode': mode.toLowerCase(),
  };
}

// Function Registry
final Map<String, Function> functions = {
  'getWeather': (Map<String, Object?> args) async => await getWeather(args),
  'switchTheme': switchTheme,
};

// Function Dispatcher
Future<FunctionResponse> dispatchFunctionCall(FunctionCall call, BuildContext context) async {
  final function = functions[call.name]!;
  final result = call.name == 'switchTheme'
      ? (function as Function(Map<String, Object?>, BuildContext))(call.args, context)
      : await (function as Function(Map<String, Object?>))(call.args);
  return FunctionResponse(call.name, result);
}

class ImagePreview extends StatelessWidget {
  final String imagePath;
  final bool isWebImage;

  const ImagePreview({
    super.key,
    required this.imagePath,
    required this.isWebImage,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: EdgeInsets.zero,
      child: Stack(
        fit: StackFit.expand,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              color: Colors.black87,
              child: Hero(
                tag: imagePath,
                child: InteractiveViewer(
                  minScale: 0.5,
                  maxScale: 4.0,
                  child: isWebImage
                      ? Image.network(
                          imagePath,
                          fit: BoxFit.contain,
                        )
                      : Image.file(
                          File(imagePath),
                          fit: BoxFit.contain,
                        ),
                ),
              ),
            ),
          ),
          Positioned(
            top: 16,
            right: 16,
            child: IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 30),
              onPressed: () => Navigator.pop(context),
            ),
          ),
        ],
      ),
    );
  }
}

enum GeminiModel {
  flash20('gemini-2.0-flash', 'Gemini 2.0 Flash'),
  flash20Lite('gemini-2.0-flash-lite', 'Gemini 2.0 Flash Lite'),
  flash15('gemini-1.5-flash', 'Gemini 1.5 Flash'),
  pro25Preview('gemini-2.5-pro-preview-03-25', 'Gemini 2.5 Pro Preview'),
  pro20('gemini-2.0-pro', 'Gemini 2.0 Pro'),
  pro15('gemini-1.5-pro', 'Gemini 1.5 Pro');

  final String modelName;
  final String displayName;
  const GeminiModel(this.modelName, this.displayName);
}

class Conversation {
  final String id;
  List<ChatMessage> messages;
  final DateTime timestamp;

  Conversation({
    required this.id,
    required this.messages,
    required this.timestamp,
  });

  // Convert to Map for Hive storage
  Future<Map<String, dynamic>> toMap() async {
    final List<Map<String, dynamic>> serializedMessages = [];
    
    for (final message in messages) {
      serializedMessages.add(await message.toMap());
    }
    
    return {
      'id': id,
      'messages': serializedMessages,
      'timestamp': timestamp.millisecondsSinceEpoch,
    };
  }

  // Create Conversation from Map (from Hive)
  static Future<Conversation> fromMap(Map<dynamic, dynamic> map) async {
    final List<ChatMessage> messages = [];
    
    if (map['messages'] != null) {
      final messagesList = map['messages'] as List;
      for (final messageMap in messagesList) {
        if (messageMap is Map) {
          final message = await ChatMessage.fromMap(Map<dynamic, dynamic>.from(messageMap));
          if (message != null) {
            messages.add(message);
          }
        }
      }
    }
    
    return Conversation(
      id: map['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
      messages: messages,
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        (map['timestamp'] as int?) ?? DateTime.now().millisecondsSinceEpoch
      ),
    );
  }
}

class ChatScreen extends StatefulWidget {
  final WakeWordService? wakeWordService;

  const ChatScreen({Key? key, this.wakeWordService}) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _textController = TextEditingController();
  final TextEditingController _systemPromptController = TextEditingController();
  final List<ChatMessage> _messages = [];
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();
  late AnimationController _fabAnimationController;
  late Animation<double> _fabAnimation;
  
  late GenerativeModel _model;
  late ChatSession? _chat;
  bool _isLoading = false;
  GeminiModel _selectedModel = GeminiModel.flash20;
  String _currentStreamResponse = '';
  List<XFile>? _selectedImages;
  List<Conversation> _conversations = [];
  int _currentConversationIndex = 0;
  String _currentStreamBuffer = '';
  Timer? _streamTimer;
  int _charIndex = 0;
  Set<String> _enabledTools = {'getWeather', 'switchTheme'};
  bool _isInitialized = false;
  int? _editingMessageIndex;
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  
  // Add a persistent FocusNode for editing
  final FocusNode _editFocusNode = FocusNode();
  
  // Add stream subscription for cancellation
  StreamSubscription? _streamSubscription;
  bool _showWakeWordPopup = false;

  @override
  void initState() {
    super.initState();
    _fabAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _fabAnimation = CurvedAnimation(
      parent: _fabAnimationController,
      curve: Curves.easeInOut,
    );
    _fabAnimationController.forward();
    _initializeApp();
    
    // Set up wake word detection callback
    if (widget.wakeWordService != null) {
      widget.wakeWordService!.initialize(
        accessKey: "HbA+vB/MKtuMA2/trDIZ/ly37eRr/MGMgjW8gDl5re0ni0z5KbmEiA==", // Replace with your actual access key
        onWakeWordDetected: _onWakeWordDetected,
        onError: (error) {
          print("Wake word error: $error");
        },
      );
    }
  }

  Future<void> _initializeApp() async {
    // Load conversations from Hive
    _loadConversations();
    
    // Initialize model
    _initializeModel();
    
    setState(() {
      _isInitialized = true;
    });
  }

  Future<void> _loadConversations() async {
    try {
      final conversationsData = HiveService.getAllConversations();
      final loadedConversations = <Conversation>[];
      
      for (final data in conversationsData) {
        final conversation = await Conversation.fromMap(data);
        loadedConversations.add(conversation);
      }
      
      setState(() {
        _conversations = loadedConversations;
      if (_conversations.isEmpty) {
        _conversations.add(Conversation(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          messages: [],
          timestamp: DateTime.now(),
        ));
      }
        _currentConversationIndex = 0;
        _messages.clear();
      _messages.addAll(_conversations[_currentConversationIndex].messages);
    });
    } catch (e) {
      print('Error loading conversations: $e');
      // Create new conversation if loading fails
      setState(() {
        _conversations = [
          Conversation(
            id: DateTime.now().millisecondsSinceEpoch.toString(),
            messages: [],
            timestamp: DateTime.now(),
          )
        ];
        _currentConversationIndex = 0;
      });
    }
  }

  Future<void> _saveConversations() async {
    try {
      final List<Map<String, dynamic>> conversationsData = [];
      
      for (final conversation in _conversations) {
        conversationsData.add(await conversation.toMap());
      }
      
      await HiveService.saveAllConversations(conversationsData);
    } catch (e) {
      print('Error saving conversations: $e');
    }
  }

  void _initializeModel() {
    final List<FunctionDeclaration> enabledDeclarations = [
      if (_enabledTools.contains('getWeather')) getWeatherFunction,
      if (_enabledTools.contains('switchTheme')) switchThemeFunction,
    ];

    _model = GenerativeModel(
      model: _selectedModel.modelName,
      apiKey: 'AIzaSyDWoWeK67MtYlA9S6NUM8lzOwmJIpwMWDA',
      systemInstruction: Content.text(
        'You are Apsara-2.5, an AI assistant developed by Shubharthak. Your role is to be helpful and informative.'
      ),
      tools: enabledDeclarations.isEmpty ? [] : [Tool(functionDeclarations: enabledDeclarations)],
    );
    _startNewChat();
  }

  void _startNewChat() {
    // Get all previous messages including images
    List<Content> history = [];
    for (var msg in _messages) {
      if (msg.imageParts != null) {
        // If message has images, create multi-part content
        List<Part> parts = [TextPart(msg.text)];
        parts.addAll(msg.imageParts!);
        history.add(Content.multi(parts));
      } else {
        // Text-only message
        history.add(Content.text(msg.text));
      }
    }

    // Create a new chat session with history
    _chat = _model.startChat(
      history: history,
      safetySettings: [
        SafetySetting(HarmCategory.harassment, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.hateSpeech, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.sexuallyExplicit, HarmBlockThreshold.none),
        SafetySetting(HarmCategory.dangerousContent, HarmBlockThreshold.none),
      ],
    );
  }

  void _toggleTheme() async {
    await ThemeProvider.toggleTheme();
  }

  void _updateThemeMode(ThemeMode mode) async {
    await ThemeProvider.updateThemeMode(mode);
  }

  void _showToolsDialog() {
    Set<String> tempEnabledTools = Set.from(_enabledTools);
    
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Available Tools'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CheckboxListTile(
                title: const Text('Weather'),
                subtitle: const Text('Get current weather information'),
                value: tempEnabledTools.contains('getWeather'),
                onChanged: (bool? value) {
                  setState(() {
                    if (value ?? false) {
                      tempEnabledTools.add('getWeather');
                    } else {
                      tempEnabledTools.remove('getWeather');
                    }
                  });
                },
              ),
              CheckboxListTile(
                title: const Text('Theme Switcher'),
                subtitle: const Text('Control app theme'),
                value: tempEnabledTools.contains('switchTheme'),
                onChanged: (bool? value) {
                  setState(() {
                    if (value ?? false) {
                      tempEnabledTools.add('switchTheme');
                    } else {
                      tempEnabledTools.remove('switchTheme');
                    }
                  });
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                this.setState(() {
                  _enabledTools = Set.from(tempEnabledTools);
                });
                _initializeModel();
                Navigator.pop(context);
                
                final message = ChatMessage(
                  text: 'Tools configuration updated',
                  isUser: false,
                  timestamp: DateTime.now(),
                  isSystemMessage: true,
                );
                _addMessageToCurrentConversation(message);
              },
              child: const Text('Apply'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDarkTheme = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(
        title: Text(
          'Apsara 2.5',
          style: TextStyle(
            fontWeight: FontWeight.bold,
          ),
        ).animate()
          .fadeIn(duration: 600.ms)
          .moveX(begin: -10, end: 0, duration: 500.ms, curve: Curves.easeOutQuad),
        actions: _buildAppBarActions(),
        elevation: 0,
        leadingWidth: 40,
        leading: _conversations.length > 1
            ? IconButton(
                icon: const FaIcon(FontAwesomeIcons.bars, size: 20),
                onPressed: _showConversationsDrawer,
                tooltip: 'Conversations',
              ).animate().scale(duration: 300.ms, curve: Curves.easeOut)
            : null,
      ),
      drawer: _buildConversationsDrawer(),
      drawerEdgeDragWidth: MediaQuery.of(context).size.width * 0.5, // Enable wide edge drag area
      body: Stack(
        children: [
          GestureDetector(
            // Swipe from left anywhere to open drawer
            onHorizontalDragEnd: (details) {
              if (details.primaryVelocity! > 0) {
                _scaffoldKey.currentState?.openDrawer();
              }
            },
            // Tap animation for Android
            onTapDown: (details) {
              if (!kIsWeb && Theme.of(context).platform == TargetPlatform.android) {
                _showTapAnimation(details.globalPosition);
              }
            },
            child: _buildChatBody(),
          ),
          if (_messages.isNotEmpty && !_isLoading)
            Positioned(
              bottom: 80,
              right: 16,
              child: FloatingActionButton(
                onPressed: _scrollToBottom,
                mini: true,
                tooltip: 'Scroll to bottom',
                child: const FaIcon(FontAwesomeIcons.arrowDown, size: 18),
              )
                .animate(
                  autoPlay: false,
                  controller: _fabAnimationController,
                )
                .scale(),
            ),
          if (_showWakeWordPopup)
            WakeWordPopup(
              onSendMessage: _handleWakeWordMessage,
              onDismiss: _dismissWakeWordPopup,
              isDarkMode: isDarkTheme,
            ),
        ],
      ),
    );
  }

  // Tap cursor animation for Android
  void _showTapAnimation(Offset position) {
    final OverlayState overlayState = Overlay.of(context);
    final OverlayEntry entry = OverlayEntry(
      builder: (context) => Positioned.fill(
        child: Material(
          color: Colors.transparent,
          child: CustomPaint(
            painter: RippleAnimationPainter(
              center: position,
              color: Theme.of(context).colorScheme.primary.withOpacity(0.15),
              progress: 0.0,
            ),
            child: Container(),
          ),
        ),
      ),
    );
    
    overlayState.insert(entry);
    
    // Animate the ripple
    const duration = Duration(milliseconds: 600);
    Timer.periodic(const Duration(milliseconds: 16), (timer) {
      final progress = timer.tick * 16 / duration.inMilliseconds;
      if (progress >= 1.0) {
        timer.cancel();
        entry.remove();
      } else {
        entry.markNeedsBuild();
      }
    });
  }

  Widget _buildConversationsDrawer() {
    return Drawer(
      width: MediaQuery.of(context).size.width * 0.85,
      child: Column(
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
            ),
              child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                Row(
                  children: [
                    FaIcon(
                      FontAwesomeIcons.message,
                      color: Theme.of(context).colorScheme.primary,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                  Text(
                    'Conversations',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                  ),
                ],
              ),
                const Spacer(),
                ElevatedButton.icon(
                  onPressed: () {
                      setState(() {
                        _conversations.add(Conversation(
                          id: DateTime.now().millisecondsSinceEpoch.toString(),
                          messages: [],
                          timestamp: DateTime.now(),
                        ));
                        _currentConversationIndex = _conversations.length - 1;
                        _messages.clear();
                        _currentStreamResponse = '';
                        _selectedImages = null;
                      });
                      _saveConversations();
                      _startNewChat();
                      Navigator.pop(context);
                    },
                  icon: FaIcon(
                    FontAwesomeIcons.plus,
                    size: 16,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  label: Text('New Chat'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.surface,
                    foregroundColor: Theme.of(context).colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: _conversations.length,
              itemBuilder: (context, index) {
                final conversation = _conversations[index];
                final firstMessage = conversation.messages.isNotEmpty
                    ? conversation.messages.first.text
                    : 'New conversation';
                final isActive = index == _currentConversationIndex;
                
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isActive
                        ? Theme.of(context).colorScheme.primary
                        : Theme.of(context).colorScheme.surfaceVariant,
                    child: FaIcon(
                      FontAwesomeIcons.comments,
                      size: 16,
                      color: isActive
                          ? Theme.of(context).colorScheme.onPrimary
                          : Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  title: Text(
                    firstMessage,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                  subtitle: Text(
                    DateFormat('MMM d, y · HH:mm').format(conversation.timestamp),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  selected: isActive,
                  trailing: IconButton(
                    icon: FaIcon(
                      FontAwesomeIcons.trashCan,
                      size: 16,
                      color: Theme.of(context).colorScheme.error,
                    ),
                    onPressed: () => _showDeleteConversationDialog(index),
                  ),
                  onTap: () {
                    setState(() {
                      _currentConversationIndex = index;
                      _messages.clear();
                      _messages.addAll(conversation.messages);
                      _currentStreamResponse = '';
                      _selectedImages = null;
                    });
                    _startNewChat();
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChatBody() {
    return Stack(
      children: [
        Column(
          children: [
            Expanded(
              child: Stack(
                children: [
                  GestureDetector(
                    onTap: () => FocusScope.of(context).unfocus(),
                    child: _messages.isEmpty
                        ? _buildWelcomeView()
                        : Column(
                            children: [
                              Expanded(child: _buildMessageList()),
                              if (_currentStreamResponse.isNotEmpty)
                                _buildStreamingResponse(),
                            ],
                          ),
                  ),
                  if (_isLoading)
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: Container(
                        color: Theme.of(context).scaffoldBackgroundColor.withOpacity(0.7),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SpinKitThreeBounce(
                              color: Theme.of(context).colorScheme.primary,
                              size: 24,
                            ),
                            const SizedBox(width: 16),
                            TextButton.icon(
                              onPressed: _cancelGeneration,
                              icon: FaIcon(
                                FontAwesomeIcons.stop,
                                size: 18,
                                color: Theme.of(context).colorScheme.error,
                              ),
                              label: Text(
                                'Stop generating',
                                style: TextStyle(
                                  color: Theme.of(context).colorScheme.error,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              style: TextButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.errorContainer.withOpacity(0.3),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            _buildInputArea(),
          ],
        ),
      ],
    );
  }
  
  Widget _buildWelcomeView() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
              child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircleAvatar(
              radius: 60,
              backgroundColor: Theme.of(context).colorScheme.primaryContainer,
              child: FaIcon(
                FontAwesomeIcons.robot,
                size: 50,
                color: Theme.of(context).colorScheme.primary,
              ),
            ).animate().scale(duration: 600.ms, curve: Curves.elasticOut),
            const SizedBox(height: 24),
            Text(
              'Welcome to Apsara 2.5',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                      ),
            ).animate().fadeIn(duration: 800.ms).moveY(begin: 10, end: 0),
            const SizedBox(height: 16),
                  Text(
              'Powered by Gemini',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
                  ),
            ).animate().fadeIn(delay: 200.ms, duration: 800.ms),
            const SizedBox(height: 32),
            Text(
              'Ask me anything or try these examples:',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ).animate().fadeIn(delay: 400.ms, duration: 800.ms),
            const SizedBox(height: 24),
            _buildSuggestionChips().animate().fadeIn(delay: 600.ms, duration: 800.ms),
                ],
              ),
            ),
    );
  }
  
  Widget _buildSuggestionChips() {
    final suggestions = [
      'What can you help me with?',
      'Generate an image of...',
      'Tell me a joke',
      'Explain quantum computing',
      'Write a short story',
      'Recommend a book',
    ];
    
    return Wrap(
      alignment: WrapAlignment.center,
      spacing: 8,
      runSpacing: 8,
      children: suggestions.map((suggestion) {
        return ActionChip(
          avatar: FaIcon(
            FontAwesomeIcons.lightbulb,
            size: 14,
            color: Theme.of(context).colorScheme.onSurfaceVariant,
          ),
          label: Text(suggestion),
                    onPressed: () {
            _textController.text = suggestion;
            _handleSubmit(suggestion);
          },
          backgroundColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.7),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        );
      }).toList(),
    );
  }

  Widget _buildMessageList() {
    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.only(bottom: 16, top: 16),
      itemCount: _messages.length,
      itemBuilder: (context, index) {
        final message = _messages[index];
        if (_editingMessageIndex == index) {
          return _buildMessageEditItem(message, index);
        }
        return _buildMessageItem(message, index)
          .animate()
          .fadeIn(duration: 350.ms, delay: 50.ms * index.clamp(0, 10))
          .slideY(begin: 0.1, end: 0, duration: 300.ms, curve: Curves.easeOutQuad);
      },
    );
  }

  // Add shimmer effect to streaming responses
  Widget _buildStreamingResponse() {
    if (_currentStreamResponse.isEmpty) return const SizedBox.shrink();
    
    return Container(
      width: double.infinity,
      color: Theme.of(context).colorScheme.secondaryContainer,
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Shimmer.fromColors(
            baseColor: Theme.of(context).colorScheme.onSecondaryContainer,
            highlightColor: Theme.of(context).colorScheme.onSecondaryContainer.withOpacity(0.7),
            period: const Duration(milliseconds: 2000),
            direction: ShimmerDirection.ttb, // Top to bottom shimmer
            child: EnhancedMessageContent(
              text: _currentStreamResponse,
              textStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSecondaryContainer,
                fontSize: 15,
              ),
              isStreaming: true,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'typing...',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                ),
              ),
              const SizedBox(width: 6),
              SpinKitThreeBounce(
                color: Theme.of(context).colorScheme.primary,
                size: 10,
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  Widget _buildMessageEditItem(ChatMessage message, int index) {
    final TextEditingController editController = TextEditingController(text: message.text);
    final List<XFile>? editImages = message.images != null ? List.from(message.images!) : null;
    
    // Use the dedicated FocusNode and request focus after a delay
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_editFocusNode.canRequestFocus) {
          _editFocusNode.requestFocus();
        }
      });
    });
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Theme.of(context).colorScheme.primary,
          width: 2,
        ),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Edit message',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: editController,
            focusNode: _editFocusNode, // Use the persistent focus node
            decoration: InputDecoration(
              filled: true,
              fillColor: Theme.of(context).colorScheme.surface,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 15,
            ),
            maxLines: null,
            keyboardType: TextInputType.multiline,
            autofocus: true, // Add autofocus to help with keyboard
          ),
          
          // Show image editing UI if message has images
          if (message.images != null && message.images!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Image attachments:',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Container(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: message.images!.length,
                itemBuilder: (context, imageIndex) {
                  return Stack(
                    children: [
                      Container(
                        width: 100,
                        height: 100,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: Theme.of(context).colorScheme.outline.withOpacity(0.5),
                          ),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: kIsWeb
                              ? FutureBuilder<Uint8List>(
                                  future: message.images![imageIndex].readAsBytes(),
                                  builder: (context, snapshot) {
                                    if (snapshot.connectionState == ConnectionState.waiting) {
                                      return Center(
                                        child: SpinKitPulse(
                                          color: Theme.of(context).colorScheme.primary,
                                          size: 30,
                                        ),
                                      );
                                    } else if (snapshot.hasData) {
                                      return Image.memory(
                                        snapshot.data!,
                                        fit: BoxFit.cover,
                                      );
                                    } else {
                                      return Center(
                                        child: FaIcon(
                                          FontAwesomeIcons.circleExclamation,
                                          color: Theme.of(context).colorScheme.error,
                                        ),
                                      );
                                    }
                                  },
                                )
                              : Image.file(
                                  File(message.images![imageIndex].path),
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, _, __) => Center(
                                    child: FaIcon(
                                      FontAwesomeIcons.circleExclamation,
                                      color: Theme.of(context).colorScheme.error,
                                    ),
                                  ),
                                ),
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 12,
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              final newImages = List<XFile>.from(message.images!);
                              newImages.removeAt(imageIndex);
                              if (newImages.isEmpty) {
                                // Create a new message with the updated image list
                                _messages[index] = ChatMessage(
                                  text: message.text,
                                  isUser: message.isUser,
                                  timestamp: message.timestamp,
                                  isSystemMessage: message.isSystemMessage,
                                  isStreaming: message.isStreaming,
                                  images: null,
                                  imageParts: null,
                                );
                              } else {
                                // Create a new message with the updated image list
                                _messages[index] = ChatMessage(
                                  text: message.text,
                                  isUser: message.isUser,
                                  timestamp: message.timestamp,
                                  isSystemMessage: message.isSystemMessage,
                                  isStreaming: message.isStreaming,
                                  images: newImages,
                                  imageParts: message.imageParts,
                                );
                              }
                            });
                          },
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.7),
                              shape: BoxShape.circle,
                            ),
                            child: const FaIcon(
                              FontAwesomeIcons.xmark,
                              size: 12,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
          
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
                            TextButton(
                              onPressed: () {
                                setState(() {
                    _editingMessageIndex = null;
                  });
                },
                child: Text('Cancel'),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () {
                  _saveEditedMessage(editController.text, index);
                },
                child: Text('Save & Regenerate'),
              ),
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  void _saveEditedMessage(String newText, int index) {
    if (newText.trim().isEmpty) {
      return;
    }
    
    if (_messages[index].isUser) {
      setState(() {
        // Keep track of existing images and imageParts
        List<XFile>? editedImages = _messages[index].images;
        List<DataPart>? editedImageParts = _messages[index].imageParts;
        
        // If we need to regenerate the imageParts (e.g., if images were modified)
        if (editedImages != null && editedImages.isNotEmpty && 
            (_messages[index].imageParts == null || 
             _messages[index].imageParts!.length != editedImages.length)) {
          // We'll regenerate the image parts asynchronously after setting state
          _regenerateImageParts(editedImages, newText, index);
          return;
        }
        
        final editedMessage = ChatMessage(
          text: newText,
          isUser: true,
          timestamp: DateTime.now(),
          images: editedImages,
          imageParts: editedImageParts,
        );
        
        while (_messages.length > index + 1) {
          _messages.removeLast();
        }
        
        _messages[index] = editedMessage;
        
        _conversations[_currentConversationIndex].messages = List.from(_messages);
        _saveConversations();
        
        _editingMessageIndex = null;
        
        _startNewChat();
        
        // Add haptic feedback for message edit submission
        _triggerHapticFeedback();
        // Start continuous feedback
        _startContinuousHapticFeedback();
        
        if (editedMessage.imageParts != null) {
          _handleEditedMessageWithImages(editedMessage);
        } else {
          _generateResponseForEditedMessage(editedMessage);
        }
      });
    }
  }

  // Helper method to regenerate imageParts after image edits
  Future<void> _regenerateImageParts(List<XFile> images, String text, int index) async {
    List<DataPart> imageParts = [];
    
    // Show loading state
    setState(() {
      _isLoading = true;
      _currentStreamResponse = 'Processing image data...';
    });
    
    // Add haptic feedback when regenerating images
    _triggerHapticFeedback();
    // Start continuous feedback
    _startContinuousHapticFeedback();
    
    try {
      // Convert each image to DataPart
      for (var image in images) {
        final bytes = await image.readAsBytes();
        final mime = image.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        imageParts.add(DataPart(mime, bytes));
      }
      
      // Create the edited message with fresh imageParts
      final editedMessage = ChatMessage(
        text: text,
        isUser: true,
        timestamp: DateTime.now(),
        images: images,
        imageParts: imageParts,
      );
      
      // Update the message list
      setState(() {
        while (_messages.length > index + 1) {
          _messages.removeLast();
        }
        
        _messages[index] = editedMessage;
        
        _conversations[_currentConversationIndex].messages = List.from(_messages);
        _saveConversations();
        
        _editingMessageIndex = null;
        _currentStreamResponse = '';
      });
      
      _startNewChat();
      
      // Now handle the edited message with images
      _handleEditedMessageWithImages(editedMessage);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _currentStreamResponse = '';
        
        final errorMessage = ChatMessage(
          text: 'Error processing image data: $e',
          isUser: false,
          timestamp: DateTime.now(),
          isSystemMessage: true,
        );
        _addMessageToCurrentConversation(errorMessage);
      });
      
      // Stop haptic feedback on error
      _stopContinuousHapticFeedback();
    }
  }
  
  Future<void> _handleEditedMessageWithImages(ChatMessage editedMessage) async {
    setState(() {
      _isLoading = true;
      _currentStreamResponse = 'Processing request with images...';
    });
    _scrollToBottom();
    
    try {
      // Make sure we have valid imageParts
      if (editedMessage.imageParts == null || editedMessage.imageParts!.isEmpty) {
        throw Exception("Image data is missing or invalid");
      }
      
      final parts = <Part>[TextPart(editedMessage.text.isEmpty ? 'Analyze this image' : editedMessage.text)];
      parts.addAll(editedMessage.imageParts!);
      
      final content = Content.multi(parts);
      
      // Ensure we have a valid chat session
      if (_chat == null) {
        _startNewChat();
      }
      
      final response = await _chat?.sendMessage(content);
      final responseText = response?.text ?? 'No response';
      
      setState(() {
        _currentStreamResponse = '';
      });
      
      final botMessage = ChatMessage(
        text: responseText,
        isUser: false,
        timestamp: DateTime.now(),
      );
      _addMessageToCurrentConversation(botMessage);
    } catch (e) {
      final errorMessage = ChatMessage(
        text: 'Error: $e',
        isUser: false,
        timestamp: DateTime.now(),
        isSystemMessage: true,
      );
      _addMessageToCurrentConversation(errorMessage);
    } finally {
      setState(() {
        _isLoading = false;
        _currentStreamResponse = '';
      });
      
      // Stop haptic feedback when response is complete
      _stopContinuousHapticFeedback();
    }
  }

  Widget _buildMessageItem(ChatMessage message, int index) {
    final timeStr = DateFormat('HH:mm').format(message.timestamp);
    
    // For user messages, keep the bubble layout
    if (message.isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: TweenAnimationBuilder<double>(
          duration: const Duration(milliseconds: 300),
          tween: Tween(begin: 0.0, end: 1.0),
          builder: (context, value, child) {
            return Transform.scale(
              scale: value,
              child: child,
            );
          },
          child: InkWell(
            onLongPress: () {
              final scaffold = ScaffoldMessenger.of(context);
              Clipboard.setData(ClipboardData(text: message.text));
              scaffold.showSnackBar(
                SnackBar(
                  content: const Text('Message copied to clipboard'),
                  behavior: SnackBarBehavior.floating,
                  width: 200,
                  duration: const Duration(seconds: 2),
                ),
              );
            },
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: message.isSystemMessage
                    ? Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.8)
                    : Theme.of(context).colorScheme.primaryContainer.withOpacity(0.9),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(4),
                ),
                border: message.isStreaming
                    ? Border.all(
                        color: Theme.of(context).colorScheme.primary,
                        width: 2,
                      )
                    : null,
                boxShadow: [
                  BoxShadow(
                    color: Theme.of(context).shadowColor.withOpacity(0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.75,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  EnhancedMessageContent(
                    text: message.text,
                    textStyle: TextStyle(
                      color: message.isSystemMessage
                          ? Theme.of(context).colorScheme.onSurfaceVariant
                          : Theme.of(context).colorScheme.onPrimaryContainer,
                      fontStyle: message.isSystemMessage ? FontStyle.italic : null,
                      fontSize: 15,
                    ),
                    isStreaming: message.isStreaming,
                    images: message.images,
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              timeStr,
                              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                                color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                              ),
                            ),
                            if (!message.isSystemMessage) ...[
                              const SizedBox(width: 4),
                              Icon(
                                Icons.person_rounded,
                                size: 12,
                                color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                              ),
                            ],
                          ],
                        ),
                      ),
                      InkWell(
                        onTap: () {
                          setState(() {
                            _editingMessageIndex = index;
                          });
                        },
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(4.0),
                          child: FaIcon(
                            FontAwesomeIcons.penToSquare,
                            size: 14,
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.7),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    } 
    
    // For Apsara's responses, use a full-width layout similar to ChatGPT
    return Container(
      width: double.infinity,
      color: message.isSystemMessage 
          ? Theme.of(context).scaffoldBackgroundColor 
          : Theme.of(context).colorScheme.secondaryContainer,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          EnhancedMessageContent(
            text: message.text,
            textStyle: TextStyle(
              color: message.isSystemMessage
                  ? Theme.of(context).colorScheme.onSurfaceVariant
                  : Theme.of(context).colorScheme.onSecondaryContainer,
              fontStyle: message.isSystemMessage ? FontStyle.italic : null,
              fontSize: 15,
            ),
            isStreaming: message.isStreaming,
            images: message.images,
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                timeStr,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                ),
              ),
              if (!message.isSystemMessage) ...[
                const SizedBox(width: 4),
                Icon(
                  Icons.smart_toy_rounded,
                  size: 12,
                  color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                ),
              ],
            ],
          ),
        ],
      ),
    ).animate().fadeIn(duration: 350.ms, delay: 50.ms * index.clamp(0, 10))
      .slideY(begin: 0.05, end: 0, duration: 300.ms, curve: Curves.easeOutQuad);
  }

  Widget _buildInputArea() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).shadowColor.withOpacity(0.1),
            offset: const Offset(0, -1),
            blurRadius: 5,
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_selectedImages != null && _selectedImages!.isNotEmpty)
              _buildSelectedImagesPreview(),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                IconButton(
                  icon: FaIcon(
                    FontAwesomeIcons.image,
                    size: 20,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  onPressed: _getImage,
                  tooltip: 'Add Image',
                ),
                Expanded(
                  child: KeyboardVisibilityBuilder(
                    builder: (context, isKeyboardVisible) {
                      return RawKeyboardListener(
                        focusNode: FocusNode(),
                        onKey: (RawKeyEvent event) {
                          if (event is RawKeyDownEvent) {
                            if (event.logicalKey == LogicalKeyboardKey.enter) {
                              if (event.isShiftPressed) {
                                // Shift+Enter: add a new line
                                _textController.text += '\n';
                                _textController.selection = TextSelection.fromPosition(
                                  TextPosition(offset: _textController.text.length),
                                );
                              } else if (!_isLoading && _textController.text.trim().isNotEmpty) {
                                // Enter: send message
                                _handleSubmit(_textController.text);
                              }
                            }
                          }
                        },
                        child: TextField(
                          controller: _textController,
                          decoration: InputDecoration(
                            hintText: 'Ask Apsara 2.5...',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                            filled: true,
                            fillColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            isDense: true,
                          ),
                          minLines: 1,
                          maxLines: 5,
                          textCapitalization: TextCapitalization.sentences,
                          keyboardType: TextInputType.multiline,
                          textInputAction: TextInputAction.newline,
                          onSubmitted: (text) {
                            // When Enter is pressed without Shift, send the message
                            if (!_isLoading && text.trim().isNotEmpty) {
                              _handleSubmit(text);
                            }
                    },
                  ),
                );
                    }
                  ),
                ),
                IconButton(
                  icon: _isLoading
                      ? SpinKitThreeBounce(
                          color: Theme.of(context).colorScheme.primary,
                          size: 18,
                        )
                      : FaIcon(
                          FontAwesomeIcons.paperPlane,
                          size: 20,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                  onPressed: _isLoading
                      ? _cancelGeneration
                      : () => _handleSubmit(_textController.text),
                  tooltip: _isLoading ? 'Cancel' : 'Send',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedImagesPreview() {
    return Container(
      height: 100,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _selectedImages!.length,
        itemBuilder: (context, index) {
          return Stack(
            children: [
              Container(
                width: 100,
                height: 100,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outline.withOpacity(0.5),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: kIsWeb
                      ? FutureBuilder<Uint8List>(
                          future: _selectedImages![index].readAsBytes(),
                          builder: (context, snapshot) {
                            if (snapshot.connectionState == ConnectionState.waiting) {
                              return Center(
                                child: SpinKitPulse(
                                  color: Theme.of(context).colorScheme.primary,
                                  size: 30,
                                ),
                              );
                            } else if (snapshot.hasData) {
                              return Image.memory(
                                snapshot.data!,
                                fit: BoxFit.cover,
                              );
                            } else {
                              return Center(
                                child: FaIcon(
                                  FontAwesomeIcons.circleExclamation,
                                  color: Theme.of(context).colorScheme.error,
                                ),
                              );
                            }
                          },
                        )
                      : Image.file(
                          File(_selectedImages![index].path),
                          fit: BoxFit.cover,
                          errorBuilder: (context, _, __) => Center(
                            child: FaIcon(
                              FontAwesomeIcons.circleExclamation,
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                        ),
                ),
              ),
              Positioned(
                top: 4,
                right: 12,
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedImages!.removeAt(index);
                      if (_selectedImages!.isEmpty) {
                        _selectedImages = null;
                      }
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.7),
                      shape: BoxShape.circle,
                    ),
                    child: const FaIcon(
                      FontAwesomeIcons.xmark,
                      size: 12,
                      color: Colors.white,
                    ),
                  ),
            ),
          ),
        ],
          ).animate().fadeIn(duration: 300.ms);
        },
      ),
    );
  }

  List<Widget> _buildAppBarActions() {
    return [
      IconButton(
        icon: const FaIcon(FontAwesomeIcons.message, size: 20),
        onPressed: _showConversationsDrawer,
        tooltip: 'All Conversations',
      ),
      IconButton(
        icon: const FaIcon(FontAwesomeIcons.circleInfo, size: 20),
        onPressed: () {
          showDialog(
            context: context,
            builder: (context) => const AboutSection(),
          );
        },
        tooltip: 'About',
      ),
      IconButton(
        icon: const FaIcon(FontAwesomeIcons.trash, size: 20),
        onPressed: () {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Clear Chat'),
              content: Text('Are you sure you want to clear all messages?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('Cancel'),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _messages.clear();
                      _currentStreamResponse = '';
                      _conversations[_currentConversationIndex].messages.clear();
                      _selectedImages = null;
                      _saveConversations();
                      _startNewChat();
                    });
                    Navigator.pop(context);
                  },
                  child: Text('Clear'),
                ),
              ],
            ),
          );
        },
        tooltip: 'Clear Chat',
      ),
      IconButton(
        icon: const FaIcon(FontAwesomeIcons.gear, size: 20),
        onPressed: _showSystemPromptDialog,
        tooltip: 'System Prompt',
      ),
      IconButton(
        icon: FaIcon(
          Theme.of(context).brightness == Brightness.dark
              ? FontAwesomeIcons.sun
              : FontAwesomeIcons.moon,
          size: 20,
        ),
        onPressed: () {
          final platform = Theme.of(context).platform;
          switch (platform) {
            case TargetPlatform.android:
            case TargetPlatform.iOS:
              showModalBottomSheet(
                context: context,
                builder: (context) => SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      ListTile(
                        leading: const FaIcon(FontAwesomeIcons.circleHalfStroke),
                        title: const Text('System'),
                        onTap: () {
                          _updateThemeMode(ThemeMode.system);
                          Navigator.pop(context);
                        },
                      ),
                      ListTile(
                        leading: const FaIcon(FontAwesomeIcons.sun),
                        title: const Text('Light'),
                        onTap: () {
                          _updateThemeMode(ThemeMode.light);
                          Navigator.pop(context);
                        },
                      ),
                      ListTile(
                        leading: const FaIcon(FontAwesomeIcons.moon),
                        title: const Text('Dark'),
                        onTap: () {
                          _updateThemeMode(ThemeMode.dark);
                          Navigator.pop(context);
                        },
                      ),
                    ],
                  ),
                ),
              );
            default:
              _toggleTheme();
          }
        },
        tooltip: 'Toggle Theme',
      ),
      IconButton(
        icon: const FaIcon(FontAwesomeIcons.screwdriverWrench, size: 20),
        onPressed: _showToolsDialog,
        tooltip: 'Configure Tools',
      ),
      PopupMenuButton<GeminiModel>(
        icon: const FaIcon(FontAwesomeIcons.microchip, size: 20),
        tooltip: 'Select Model',
        onSelected: (GeminiModel model) {
          setState(() {
            _selectedModel = model;
            _initializeModel();
          });
          _messages.add(ChatMessage(
            text: 'Switched to ${model.displayName}',
            isUser: false,
            timestamp: DateTime.now(),
            isSystemMessage: true,
          ));
          _scrollToBottom();
        },
        itemBuilder: (BuildContext context) {
          return [
            const PopupMenuItem(
              enabled: false,
              child: Text(
                'Flash Series',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            ...GeminiModel.values
                .where((m) => m.modelName.contains('flash'))
                .map((model) => PopupMenuItem(
                      value: model,
                      child: Row(
                        children: [
                          FaIcon(
                            FontAwesomeIcons.check,
                            color: _selectedModel == model
                                ? Theme.of(context).colorScheme.primary
                                : Colors.transparent,
                            size: 14,
                          ),
                          const SizedBox(width: 8),
                          Text(model.displayName),
                        ],
                      ),
                    )),
            const PopupMenuDivider(),
            const PopupMenuItem(
              enabled: false,
              child: Text(
                'Pro Series',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            ...GeminiModel.values
                .where((m) => m.modelName.contains('pro'))
                .map((model) => PopupMenuItem(
                      value: model,
                      child: Row(
                        children: [
                          FaIcon(
                            FontAwesomeIcons.check,
                            color: _selectedModel == model
                                ? Theme.of(context).colorScheme.primary
                                : Colors.transparent,
                            size: 14,
                          ),
                          const SizedBox(width: 8),
                          Text(model.displayName),
                        ],
                      ),
                    )),
          ];
        },
      ),
    ];
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _textController.dispose();
    _scrollController.dispose();
    _hapticTimer?.cancel();
    _systemPromptController.dispose();
    _streamSubscription?.cancel();
    _fabAnimationController.dispose();
    _editFocusNode.dispose();
    super.dispose();
  }

  void _showConversationsDrawer() {
    _scaffoldKey.currentState?.openDrawer();
  }

  void _showDeleteConversationDialog(int index) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Conversation'),
        content: Text('Are you sure you want to delete this conversation?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                _conversations.removeAt(index);
                if (_currentConversationIndex >= _conversations.length) {
                  _currentConversationIndex = _conversations.length - 1;
                }
                if (_conversations.isEmpty) {
                  _conversations.add(Conversation(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    messages: [],
                    timestamp: DateTime.now(),
                  ));
                  _currentConversationIndex = 0;
                }
                _messages.clear();
                _messages.addAll(_conversations[_currentConversationIndex].messages);
              });
              _saveConversations();
              Navigator.pop(context);
            },
            child: Text('Delete'),
                ),
              ],
            ),
    );
  }

  Future<void> _getImage() async {
    showModalBottomSheet(
      context: context,
      builder: (BuildContext context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
          children: <Widget>[
              ListTile(
                leading: FaIcon(FontAwesomeIcons.camera),
                title: Text('Take a Photo'),
                onTap: () async {
                  Navigator.pop(context);
        final XFile? image = await _picker.pickImage(source: ImageSource.camera);
        if (image != null) {
          setState(() {
            _selectedImages ??= [];
            _selectedImages!.add(image);
          });
        }
                },
              ),
              ListTile(
                leading: FaIcon(FontAwesomeIcons.image),
                title: Text('Choose from Gallery'),
                onTap: () async {
                  Navigator.pop(context);
    try {
      final List<XFile> images = await _picker.pickMultiImage();
      if (images.isNotEmpty) {
        setState(() {
                        _selectedImages ??= [];
                        _selectedImages!.addAll(images);
        });
      }
    } catch (e) {
      print('Error picking image: $e');
    }
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _addMessageToCurrentConversation(ChatMessage message) {
    setState(() {
      _messages.add(message);
      _conversations[_currentConversationIndex].messages.add(message);
    });
    _saveConversations();
  }

  Future<void> _handleSubmit(String text) async {
    if (text.isEmpty && (_selectedImages == null || _selectedImages!.isEmpty)) return;

    List<DataPart>? imageParts;
    if (_selectedImages != null && _selectedImages!.isNotEmpty) {
      imageParts = [];
      for (var image in _selectedImages!) {
        final bytes = await image.readAsBytes();
        final mime = image.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        imageParts.add(DataPart(mime, bytes));
      }
    }

    final userMessage = ChatMessage(
      text: text,
      isUser: true,
      timestamp: DateTime.now(),
      images: _selectedImages != null ? List.from(_selectedImages!) : null,
      imageParts: imageParts,
    );

    _addMessageToCurrentConversation(userMessage);
                    setState(() {
      _isLoading = true;
      _currentStreamResponse = '';
                        _selectedImages = null;
    });

    _textController.clear();
    _scrollToBottom();
    
    // Initial haptic feedback when AI starts responding
    _triggerHapticFeedback();
    
    // Start continuous haptic feedback
    _startContinuousHapticFeedback();

    try {
      if (userMessage.imageParts != null) {
        // Handle image + text input using chat history
        setState(() {
          _currentStreamResponse = 'Processing request...';
        });
        _scrollToBottom();

        // Create content with text and images
        final parts = <Part>[TextPart(text.isEmpty ? 'Analyze this image' : text)];
        parts.addAll(userMessage.imageParts!);
        
        final content = Content.multi(parts);
        
        // Get response using the current chat session
        final response = await _chat?.sendMessage(content);
        final responseText = response?.text ?? 'No response';
        
        setState(() {
          _currentStreamResponse = '';
        });
        
        final botMessage = ChatMessage(
          text: responseText,
          isUser: false,
          timestamp: DateTime.now(),
        );
        _addMessageToCurrentConversation(botMessage);
                      } else {
        // Handle text-only streaming response
        final responses = _chat?.sendMessageStream(Content.text(text));
        if (responses != null) {
          String fullResponse = '';
          setState(() {
            _currentStreamResponse = '';
          });
          
          // Store the subscription to be able to cancel it later
          _streamSubscription = responses.listen(
            (response) {
              if (response.functionCalls.isNotEmpty) {
                for (final functionCall in response.functionCalls) {
                  Future.microtask(() async {
                    final functionResponse = await dispatchFunctionCall(functionCall, context);
                    setState(() {
                      fullResponse += '\n[Tool Response: ${functionCall.name}]\n';
                      fullResponse += '${functionResponse.response}\n';
                      _currentStreamResponse = fullResponse;
                    });
                    _scrollToBottom();
                  });
                }
              }
              
              final newText = response.text ?? '';
              setState(() {
                fullResponse += newText;
                _currentStreamResponse = fullResponse;
              });
              _scrollToBottom();
            },
            onDone: () {
              if (fullResponse.isNotEmpty) {
                final botMessage = ChatMessage(
                  text: fullResponse,
                  isUser: false,
                  timestamp: DateTime.now(),
                );
                _addMessageToCurrentConversation(botMessage);
              }
              setState(() {
                _isLoading = false;
                _currentStreamResponse = '';
                _streamSubscription = null;
              });
              
              // Stop haptic feedback when response is complete
              _stopContinuousHapticFeedback();
            },
            onError: (e) {
              final errorMessage = ChatMessage(
                text: 'Error: $e',
                isUser: false,
                timestamp: DateTime.now(),
                isSystemMessage: true,
              );
              _addMessageToCurrentConversation(errorMessage);
              setState(() {
                _isLoading = false;
                _currentStreamResponse = '';
                _streamSubscription = null;
              });
              
              // Stop haptic feedback on error
              _stopContinuousHapticFeedback();
            },
          );
          return; // Return early as we're handling completion in the listeners
        }
      }
    } catch (e) {
      final errorMessage = ChatMessage(
        text: 'Error: $e',
        isUser: false,
        timestamp: DateTime.now(),
        isSystemMessage: true,
      );
      _addMessageToCurrentConversation(errorMessage);
    } finally {
      if (_streamSubscription == null) { // Only set if not using the stream
        setState(() {
          _isLoading = false;
          _currentStreamResponse = '';
        });
        
        // Make sure to stop haptic feedback
        _stopContinuousHapticFeedback();
      }
    }

    _scrollToBottom();
  }
  
  // Single haptic feedback pulse
  Future<void> _triggerHapticFeedback() async {
    if (kIsWeb) return;
    
    try {
      if (await Vibration.hasVibrator() ?? false) {
        Vibration.vibrate(duration: 70, amplitude: 80);
      }
    } catch (e) {
      print('Vibration error: $e');
      // Silently ignore vibration errors
    }
  }
  
  Timer? _hapticTimer;
  
  // Start continuous haptic feedback at a gentle pace
  void _startContinuousHapticFeedback() {
    if (kIsWeb) return;
    
    // Cancel any existing timer
    _stopContinuousHapticFeedback();
    
    // Create a new timer that sends gentle pulses every 1.5 seconds
    _hapticTimer = Timer.periodic(const Duration(milliseconds: 1500), (timer) {
      _triggerGentleHapticPulse();
    });
  }
  
  // Stop continuous haptic feedback
  void _stopContinuousHapticFeedback() {
    _hapticTimer?.cancel();
    _hapticTimer = null;
  }
  
  // Gentle haptic pulse (weaker than initial notification)
  Future<void> _triggerGentleHapticPulse() async {
    if (kIsWeb) return;
    
    try {
      if (await Vibration.hasVibrator() ?? false) {
        if (await Vibration.hasAmplitudeControl() ?? false) {
          // Stronger gentle vibration for better tactile feedback
          Vibration.vibrate(duration: 30, amplitude: 50);
        } else {
          // Otherwise use a short duration
          Vibration.vibrate(duration: 20);
        }
      }
    } catch (e) {
      print('Gentle vibration error: $e');
      // Silently ignore vibration errors
    }
  }
  

  void _cancelGeneration() {
    // Cancel active stream subscription first
    _streamSubscription?.cancel();
    _streamSubscription = null;
    
    // Cancel the timer too
    _streamTimer?.cancel();
    
    // Stop haptic feedback
    _stopContinuousHapticFeedback();
    
    setState(() {
      _isLoading = false;
      if (_currentStreamResponse.isNotEmpty) {
        final botMessage = ChatMessage(
          text: _currentStreamResponse,
          isUser: false,
          timestamp: DateTime.now(),
        );
        _addMessageToCurrentConversation(botMessage);
        _currentStreamResponse = '';
      }
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Generation stopped'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Theme.of(context).colorScheme.secondary,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _showSystemPromptDialog() async {
    return showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('Set System Prompt'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: _systemPromptController,
                decoration: InputDecoration(
                  hintText: 'Enter system prompt...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  filled: true,
                  fillColor: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.5),
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 8),
              Text(
                'Define the AI assistant\'s personality and behavior',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel'),
            ),
            FilledButton(
              onPressed: () async {
                if (_systemPromptController.text.isNotEmpty) {
                  Navigator.pop(context);
                  
                  final message = ChatMessage(
                    text: 'Updating system prompt...',
                    isUser: false,
                    timestamp: DateTime.now(),
                    isSystemMessage: true,
                    isStreaming: true,
                  );
                  _addMessageToCurrentConversation(message);
                  
                  await Future.delayed(const Duration(milliseconds: 500));
                  
                  _model = GenerativeModel(
                    model: _selectedModel.modelName,
                    apiKey: 'AIzaSyDWoWeK67MtYlA9S6NUM8lzOwmJIpwMWDA',
                    systemInstruction: Content.text(_systemPromptController.text),
                  );
                  _startNewChat();
                  
                  setState(() {
                    _messages.removeLast();
                    _conversations[_currentConversationIndex].messages.removeLast();
                  });
                  
                  final confirmMessage = ChatMessage(
                    text: 'System prompt updated successfully',
                    isUser: false,
                    timestamp: DateTime.now(),
                    isSystemMessage: true,
                  );
                  _addMessageToCurrentConversation(confirmMessage);
                }
              },
              child: Text('Apply'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildToolCard({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            FaIcon(icon, size: 24, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    description,
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _generateResponseForEditedMessage(ChatMessage editedMessage) async {
    setState(() {
      _isLoading = true;
      _currentStreamResponse = '';
    });
    
    try {
      final responses = await _chat?.sendMessageStream(Content.text(editedMessage.text));
      if (responses != null) {
        String fullResponse = '';
        
        await for (final response in responses) {
          if (response.functionCalls.isNotEmpty) {
            for (final functionCall in response.functionCalls) {
              final functionResponse = await dispatchFunctionCall(functionCall, context);
              fullResponse += '\n[Tool Response: ${functionCall.name}]\n';
              fullResponse += '${functionResponse.response}\n';
            }
          }
          
          final newText = response.text ?? '';
          fullResponse += newText;
          setState(() {
            _currentStreamResponse = fullResponse;
          });
          _scrollToBottom();
        }
        
        if (fullResponse.isNotEmpty) {
          final botMessage = ChatMessage(
            text: fullResponse,
            isUser: false,
            timestamp: DateTime.now(),
          );
          _addMessageToCurrentConversation(botMessage);
        }
      }
    } catch (e) {
      final errorMessage = ChatMessage(
        text: 'Error: $e',
        isUser: false,
        timestamp: DateTime.now(),
        isSystemMessage: true,
      );
      _addMessageToCurrentConversation(errorMessage);
    } finally {
      setState(() {
        _isLoading = false;
        _currentStreamResponse = '';
      });
      
      // Stop haptic feedback when response is complete
      _stopContinuousHapticFeedback();
    }
  }

  void _onWakeWordDetected() {
    // Show wake word popup
    setState(() {
      _showWakeWordPopup = true;
    });
    
    // Trigger haptic feedback
    _triggerHapticFeedback();
  }

  void _dismissWakeWordPopup() {
    setState(() {
      _showWakeWordPopup = false;
    });
  }

  void _handleWakeWordMessage(String message) {
    // Add the message to the chat and send it to Gemini
    _handleSubmit(message);
    
    // Dismiss the popup
    _dismissWakeWordPopup();
  }
}

class ChatMessage {
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final bool isSystemMessage;
  final bool isStreaming;
  final List<XFile>? images;
  final List<DataPart>? imageParts;

  ChatMessage({
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.isSystemMessage = false,
    this.isStreaming = false,
    this.images,
    this.imageParts,
  });

  // Convert to Map for Hive storage
  Future<Map<String, dynamic>> toMap() async {
    List<Map<String, dynamic>>? serializedImages;
    
    if (images != null && images!.isNotEmpty) {
      serializedImages = [];
      for (final image in images!) {
        final imageData = await HiveService.serializeImage(image);
        serializedImages.add(imageData);
      }
    }
    
    return {
      'text': text,
      'isUser': isUser,
      'timestamp': timestamp.millisecondsSinceEpoch,
      'isSystemMessage': isSystemMessage,
      'isStreaming': isStreaming,
      'images': serializedImages,
    };
  }

  // Create ChatMessage from Map (from Hive)
  static Future<ChatMessage?> fromMap(Map<dynamic, dynamic> map) async {
    List<XFile>? deserializedImages;
    
    if (map['images'] != null) {
      deserializedImages = [];
      final imagesList = map['images'] as List;
      for (final imageData in imagesList) {
        if (imageData is Map) {
          final image = await HiveService.deserializeImage(Map<dynamic, dynamic>.from(imageData));
          if (image != null) {
            deserializedImages.add(image);
          }
        }
      }
    }
    
    return ChatMessage(
      text: map['text']?.toString() ?? '',
      isUser: map['isUser'] as bool? ?? false,
      timestamp: DateTime.fromMillisecondsSinceEpoch(
        (map['timestamp'] as int?) ?? DateTime.now().millisecondsSinceEpoch
      ),
      isSystemMessage: map['isSystemMessage'] as bool? ?? false,
      isStreaming: map['isStreaming'] as bool? ?? false,
      images: deserializedImages,
    );
  }
}

class ChatBubble extends StatelessWidget {
  final ChatMessage message;
  final Function(int)? onEdit;
  final int index;

  const ChatBubble({
    super.key, 
    required this.message, 
    required this.index,
    this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final timeStr = DateFormat('HH:mm').format(message.timestamp);
    
    return Align(
      alignment: message.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: TweenAnimationBuilder<double>(
        duration: const Duration(milliseconds: 300),
        tween: Tween(begin: 0.0, end: 1.0),
        builder: (context, value, child) {
          return Transform.scale(
            scale: value,
            child: child,
          );
        },
      child: InkWell(
        onLongPress: () {
          final scaffold = ScaffoldMessenger.of(context);
          Clipboard.setData(ClipboardData(text: message.text));
          scaffold.showSnackBar(
            SnackBar(
              content: const Text('Message copied to clipboard'),
              behavior: SnackBarBehavior.floating,
              width: 200,
              duration: const Duration(seconds: 2),
            ),
          );
        },
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: message.isSystemMessage
                ? Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.8)
                : message.isUser 
                    ? Theme.of(context).colorScheme.primaryContainer.withOpacity(0.9)
                    : Theme.of(context).colorScheme.secondaryContainer.withOpacity(0.9),
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(message.isUser ? 16 : 4),
              bottomRight: Radius.circular(message.isUser ? 4 : 16),
            ),
            border: message.isStreaming
                ? Border.all(
                    color: Theme.of(context).colorScheme.primary,
                    width: 2,
                  )
                : null,
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).shadowColor.withOpacity(0.1),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
                EnhancedMessageContent(
                  text: message.text,
                  textStyle: TextStyle(
                    color: message.isSystemMessage
                        ? Theme.of(context).colorScheme.onSurfaceVariant
                        : message.isUser
                            ? Theme.of(context).colorScheme.onPrimaryContainer
                            : Theme.of(context).colorScheme.onSecondaryContainer,
                    fontStyle: message.isSystemMessage ? FontStyle.italic : null,
                    fontSize: 15,
                  ),
                  isStreaming: message.isStreaming,
                  images: message.images,
                ),
              const SizedBox(height: 6),
              Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    timeStr,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                    ),
                  ),
                  if (!message.isSystemMessage) ...[
                    const SizedBox(width: 4),
                    Icon(
                              message.isUser ? Icons.person_rounded : Icons.smart_toy_rounded,
                      size: 12,
                      color: Theme.of(context).textTheme.bodySmall?.color?.withOpacity(0.7),
                    ),
                  ],
                ],
              ),
                    ),
                    if (message.isUser && !message.isSystemMessage && onEdit != null)
                      InkWell(
                        onTap: () => onEdit!(index),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.all(4.0),
                          child: FaIcon(
                            FontAwesomeIcons.penToSquare,
                            size: 14,
                            color: Theme.of(context).colorScheme.primary.withOpacity(0.7),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MessageWidget extends StatelessWidget {
  final String text;
  final bool isUser;
  final bool isStreaming;

  const _MessageWidget({
    required this.text,
    required this.isUser,
    this.isStreaming = false,
  });

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: EdgeInsets.symmetric(vertical: 4.0, horizontal: 8.0),
        padding: EdgeInsets.all(12.0),
        decoration: BoxDecoration(
          color: isUser ? Colors.purple[700] : Colors.purple[900],
          borderRadius: BorderRadius.circular(16.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 5,
              offset: Offset(0, 2),
            ),
          ],
        ),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: isStreaming 
          ? DefaultTextStyle(
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
              ),
              child: AnimatedTextKit(
                animatedTexts: [
                  FadeAnimatedText(
                    text,
                    duration: Duration(milliseconds: 500),
                    fadeOutBegin: 0.9,
                    fadeInEnd: 0.1,
                  ),
                ],
                isRepeatingAnimation: false,
                totalRepeatCount: 1,
              ),
            )
          : AnimatedSize(
              duration: Duration(milliseconds: 200),
              child: Text(
                text,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                ),
              ),
            ),
      ),
    );
  }
}

// Custom Ripple Animation Widget
class RippleAnimation extends StatefulWidget {
  final Widget? child;
  final Color color;
  final Duration duration;
  final double minRadius;
  final double maxRadius;

  const RippleAnimation({
    Key? key,
    this.child,
    required this.color,
    this.duration = const Duration(milliseconds: 500),
    this.minRadius = 0.0,
    this.maxRadius = 40.0,
  }) : super(key: key);

  @override
  _RippleAnimationState createState() => _RippleAnimationState();
}

class _RippleAnimationState extends State<RippleAnimation> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _animation = Tween<double>(
      begin: widget.minRadius,
      end: widget.maxRadius,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOut,
      ),
    )..addListener(() {
      setState(() {});
    });
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _RipplePainter(
        color: widget.color,
        animationValue: _animation.value,
      ),
      child: widget.child,
    );
  }
}

class _RipplePainter extends CustomPainter {
  final Color color;
  final double animationValue;

  _RipplePainter({
    required this.color,
    required this.animationValue,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..color = color.withOpacity(1.0 - (animationValue / 40.0).clamp(0.0, 1.0))
      ..style = PaintingStyle.fill;
    
    canvas.drawCircle(center, animationValue, paint);
  }

  @override
  bool shouldRepaint(_RipplePainter oldDelegate) => true;
} 

class RippleAnimationPainter extends CustomPainter {
  final Offset center;
  final Color color;
  final double progress;

  RippleAnimationPainter({
    required this.center,
    required this.color,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Use a smoother curve for better visual effect
    final animationProgress = Curves.easeOutExpo.transform(progress.clamp(0.0, 1.0));
    
    // Calculate the max radius to cover the entire screen diagonally
    final maxRadius = sqrt(pow(size.width, 2) + pow(size.height, 2));
    final currentRadius = maxRadius * animationProgress;
    
    // Create a more subtle gradient effect for the ripple
    final gradient = RadialGradient(
      colors: [
        color.withOpacity(0.4 * (1.0 - animationProgress)),
        color.withOpacity(0.1 * (1.0 - animationProgress)),
        Colors.transparent,
      ],
      stops: const [0.0, 0.7, 1.0],
      radius: 1.0,
    );
    
    final rect = Rect.fromCircle(center: center, radius: currentRadius);
    final paint = Paint()
      ..shader = gradient.createShader(rect)
      ..style = PaintingStyle.fill
      ..strokeWidth = 0;
    
    canvas.drawCircle(center, currentRadius, paint);
  }

  @override
  bool shouldRepaint(RippleAnimationPainter oldDelegate) => 
    oldDelegate.progress != progress ||
    oldDelegate.center != center ||
    oldDelegate.color != color;
} 