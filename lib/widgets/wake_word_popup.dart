import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class WakeWordPopup extends StatefulWidget {
  final Function(String) onSendMessage;
  final Function() onDismiss;
  final bool isDarkMode;

  const WakeWordPopup({
    Key? key,
    required this.onSendMessage,
    required this.onDismiss,
    this.isDarkMode = true,
  }) : super(key: key);

  @override
  State<WakeWordPopup> createState() => _WakeWordPopupState();
}

class _WakeWordPopupState extends State<WakeWordPopup> {
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  bool _isListening = false;
  Timer? _autoCloseTimer;

  @override
  void initState() {
    super.initState();
    // Auto-focus the text field
    Future.delayed(const Duration(milliseconds: 100), () {
      _focusNode.requestFocus();
    });
    
    // Start auto-close timer
    _startAutoCloseTimer();
  }
  
  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    _autoCloseTimer?.cancel();
    super.dispose();
  }
  
  void _startAutoCloseTimer() {
    _autoCloseTimer?.cancel();
    _autoCloseTimer = Timer(const Duration(seconds: 10), () {
      if (mounted) {
        widget.onDismiss();
      }
    });
  }
  
  void _resetAutoCloseTimer() {
    if (_autoCloseTimer != null) {
      _startAutoCloseTimer();
    }
  }

  void _sendMessage() {
    final message = _textController.text.trim();
    if (message.isNotEmpty) {
      widget.onSendMessage(message);
      _textController.clear();
    }
  }

  void _toggleListening() {
    setState(() {
      _isListening = !_isListening;
    });
    
    if (_isListening) {
      // Would connect to speech recognition API
      // For now just a visual indication
      Future.delayed(const Duration(seconds: 3), () {
        if (mounted && _isListening) {
          setState(() {
            _isListening = false;
          });
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final backgroundColor = widget.isDarkMode ? const Color(0xFF444654) : Colors.white;
    final textColor = widget.isDarkMode ? Colors.white : Colors.black;
    final primaryColor = const Color(0xFF10A37F); // ChatGPT green
    
    return Material(
      color: Colors.transparent,
      child: GestureDetector(
        onTap: _resetAutoCloseTimer,
        child: Stack(
          children: [
            // Background dimming
            GestureDetector(
              onTap: widget.onDismiss,
              child: Container(
                width: double.infinity,
                height: double.infinity,
                color: Colors.black.withOpacity(0.5),
              ),
            ),
            // Popup container
            Align(
              alignment: Alignment.bottomCenter,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 600),
                  decoration: BoxDecoration(
                    color: backgroundColor,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.3),
                        blurRadius: 15,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Apsara logo and header
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                gradient: LinearGradient(
                                  colors: [primaryColor, primaryColor.withOpacity(0.7)],
                                ),
                              ),
                              child: const Center(
                                child: Icon(
                                  Icons.auto_awesome,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              'Apsara',
                              style: GoogleFonts.poppins(
                                color: textColor,
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const Spacer(),
                            IconButton(
                              onPressed: widget.onDismiss,
                              icon: Icon(
                                Icons.close,
                                color: textColor.withOpacity(0.6),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Input area
                      Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            Expanded(
                              child: Container(
                                height: 48,
                                decoration: BoxDecoration(
                                  color: widget.isDarkMode
                                      ? const Color(0xFF343541)
                                      : Colors.grey.shade200,
                                  borderRadius: BorderRadius.circular(24),
                                ),
                                child: Row(
                                  children: [
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: TextField(
                                        controller: _textController,
                                        focusNode: _focusNode,
                                        style: TextStyle(color: textColor),
                                        decoration: InputDecoration(
                                          hintText: 'Ask something...',
                                          hintStyle: TextStyle(
                                            color: textColor.withOpacity(0.6),
                                          ),
                                          border: InputBorder.none,
                                          contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 0),
                                          isDense: true,
                                        ),
                                        onSubmitted: (_) => _sendMessage(),
                                        onChanged: (_) => _resetAutoCloseTimer(),
                                      ),
                                    ),
                                    AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      width: 40,
                                      height: 40,
                                      decoration: BoxDecoration(
                                        shape: BoxShape.circle,
                                        color: _isListening
                                            ? primaryColor
                                            : Colors.transparent,
                                      ),
                                      child: IconButton(
                                        icon: Icon(
                                          _isListening
                                              ? Icons.mic
                                              : Icons.mic_none,
                                          color: _isListening
                                              ? Colors.white
                                              : textColor.withOpacity(0.6),
                                        ),
                                        onPressed: _toggleListening,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: primaryColor,
                              ),
                              child: IconButton(
                                icon: const Icon(
                                  Icons.send,
                                  color: Colors.white,
                                ),
                                onPressed: _sendMessage,
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Actions row
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            _buildActionButton(
                              'Ask about this screen',
                              FontAwesomeIcons.image,
                              () {
                                widget.onSendMessage('What can you tell me about what\'s currently on my screen?');
                              },
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(duration: 300.ms).slideY(
                begin: 0.2,
                end: 0,
                duration: 300.ms, 
                curve: Curves.easeOutCubic,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButton(String label, IconData icon, VoidCallback onTap) {
    final buttonColor = widget.isDarkMode ? const Color(0xFF343541) : Colors.grey.shade200;
    final textColor = widget.isDarkMode ? Colors.white : Colors.black87;
    
    return Material(
      color: buttonColor,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: textColor),
              const SizedBox(width: 8),
              Text(
                label,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: textColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
} 