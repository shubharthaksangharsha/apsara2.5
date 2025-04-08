import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:porcupine_flutter/porcupine_error.dart';
import 'package:porcupine_flutter/porcupine_manager.dart';
import 'package:permission_handler/permission_handler.dart';

class WakeWordService {
  static final WakeWordService _instance = WakeWordService._internal();
  factory WakeWordService() => _instance;
  WakeWordService._internal();

  PorcupineManager? _porcupineManager;
  bool _isInitialized = false;
  bool _isListening = false;
  String? _accessKey;
  
  // Callbacks
  Function? _onWakeWordDetected;
  Function? _onError;
  
  // Get initialization status
  bool get isInitialized => _isInitialized;
  bool get isListening => _isListening;

  // Initialize the wake word service
  Future<void> initialize({
    required String accessKey,
    Function? onWakeWordDetected,
    Function? onError,
  }) async {
    if (_isInitialized) return;
    
    _accessKey = accessKey;
    _onWakeWordDetected = onWakeWordDetected;
    _onError = onError;
    
    try {
      // Request microphone permission
      final status = await Permission.microphone.request();
      if (status != PermissionStatus.granted) {
        throw PorcupineException("Microphone permission denied");
      }
      
      _isInitialized = true;
    } catch (e) {
      _onError?.call(e.toString());
      rethrow;
    }
  }

  // Start listening for the wake word
  Future<bool> startListening() async {
    if (!_isInitialized) {
      throw PorcupineException("WakeWordService not initialized");
    }
    
    if (_isListening) return true; // Already listening
    
    try {
      // For custom keywords, we need to ensure the file path is correct
      final keywordPath = 'assets/keywords/app-sara.ppn';
      
      // Create a Porcupine manager with the custom keyword
      _porcupineManager = await PorcupineManager.fromKeywordPaths(
        _accessKey!,
        [keywordPath],
        _wakeWordCallback,
        errorCallback: _errorCallback,
      );
      
      // Start listening
      await _porcupineManager?.start();
      _isListening = true;
      
      return true;
    } catch (e) {
      _onError?.call(e.toString());
      return false;
    }
  }
  
  // Stop listening for the wake word
  Future<void> stopListening() async {
    if (!_isListening || _porcupineManager == null) return;
    
    try {
      await _porcupineManager?.stop();
      _isListening = false;
    } catch (e) {
      _onError?.call(e.toString());
    }
  }
  
  // Release resources
  Future<void> dispose() async {
    try {
      await stopListening();
      await _porcupineManager?.delete();
      _porcupineManager = null;
      _isInitialized = false;
    } catch (e) {
      _onError?.call(e.toString());
    }
  }
  
  // Wake word detection callback
  void _wakeWordCallback(int keywordIndex) {
    // The index corresponds to the keyword that was detected
    // In our case, we only have one keyword so it's always 0
    if (keywordIndex == 0) {
      _onWakeWordDetected?.call();
    }
  }
  
  // Error callback
  void _errorCallback(PorcupineException error) {
    _onError?.call(error.message);
  }
} 