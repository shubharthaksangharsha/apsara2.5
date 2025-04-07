import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'package:http/http.dart' as http;

class HiveService {
  static const String _conversationsBoxName = 'conversations';
  static const String _settingsBoxName = 'settings';
  static const String _themeKey = 'theme_mode';
  static late Box _conversationsBox;
  static late Box _settingsBox;
  
  // Static cache for web images
  static final Map<String, Uint8List> _webImageCache = {};
  
  /// Initialize Hive
  static Future<void> init() async {
    await Hive.initFlutter();
    _conversationsBox = await Hive.openBox(_conversationsBoxName);
    _settingsBox = await Hive.openBox(_settingsBoxName);
  }
  
  /// THEME PERSISTENCE
  
  /// Get the saved theme mode (0: system, 1: light, 2: dark)
  static int getThemeMode() {
    return _settingsBox.get(_themeKey, defaultValue: 0);
  }
  
  /// Save the theme mode (0: system, 1: light, 2: dark)
  static Future<void> saveThemeMode(int themeMode) async {
    await _settingsBox.put(_themeKey, themeMode);
  }
  
  /// CONVERSATIONS & IMAGES
  
  /// Save a conversation to Hive
  static Future<void> saveConversation(Map<String, dynamic> conversationData, String id) async {
    await _conversationsBox.put(id, conversationData);
  }
  
  /// Save multiple conversations to Hive
  static Future<void> saveAllConversations(List<Map<String, dynamic>> conversations) async {
    // Clear existing data
    await _conversationsBox.clear();
    
    // Save each conversation
    for (final conversation in conversations) {
      if (conversation.containsKey('id')) {
        await _conversationsBox.put(conversation['id'], conversation);
      }
    }
  }
  
  /// Get all saved conversations
  static List<Map<dynamic, dynamic>> getAllConversations() {
    final List<Map<dynamic, dynamic>> conversations = [];
    for (final key in _conversationsBox.keys) {
      final dynamic data = _conversationsBox.get(key);
      if (data is Map) {
        conversations.add(Map<dynamic, dynamic>.from(data));
      }
    }
    return conversations;
  }
  
  /// Clear all saved conversations
  static Future<void> clearAllConversations() async {
    await _conversationsBox.clear();
  }
  
  /// IMAGE HANDLING
  
  /// Save an image to the app's document directory and return the path
  static Future<String> saveImage(XFile image) async {
    try {
      if (kIsWeb) {
        // For web, we can't save files locally, so just return the path
        return image.path;
      }
      
      try {
        // Get app document directory for persistent storage
        final appDir = await getApplicationDocumentsDirectory();
        final imagesDir = Directory('${appDir.path}/images');
        if (!await imagesDir.exists()) {
          await imagesDir.create(recursive: true);
        }
        
        // Generate unique filename with timestamp to avoid conflicts
        final timestamp = DateTime.now().millisecondsSinceEpoch;
        final filename = '${timestamp}_${path.basename(image.path)}';
        final newPath = path.join(imagesDir.path, filename);
        
        // Read and save image bytes
        final bytes = await image.readAsBytes();
        final file = File(newPath);
        await file.writeAsBytes(bytes);
        
        return newPath;
      } catch (e) {
        print('Error saving image to local storage: $e');
        // If we can't save to app directory for some reason, return original path
        return image.path;
      }
    } catch (e) {
      print('Error in saveImage: $e');
      return image.path; // Return original path in case of any error
    }
  }
  
  /// Convert XFile to a serializable format for Hive storage
  static Future<Map<String, dynamic>> serializeImage(XFile image) async {
    try {
      if (kIsWeb) {
        try {
          // For web, immediately read the bytes to avoid blob URL issues later
          final Uint8List bytes = await image.readAsBytes();
          
          // Store in our cache with a unique ID
          final String cacheId = 'img_${DateTime.now().millisecondsSinceEpoch}_${image.name}';
          _webImageCache[cacheId] = bytes;
          
          return {
            'name': image.name,
            'cache_id': cacheId,
            'data': base64Encode(bytes),
            'is_web': true,
            'content_type': 'image/jpeg', // Default, might need refinement
          };
        } catch (e) {
          print('Error serializing web image: $e');
          // If we can't read the image bytes, create a placeholder
          return {
            'name': image.name,
            'is_web': true,
            'is_placeholder': true,
          };
        }
      } else {
        // For native platforms, save the image and store the path
        final savedPath = await saveImage(image);
        if (savedPath.isNotEmpty) {
          return {
            'name': path.basename(image.path),
            'path': savedPath,
            'is_web': false,
          };
        } else {
          // Fallback to storing the original path if saving failed
          return {
            'name': path.basename(image.path),
            'path': image.path,
            'is_web': false,
          };
        }
      }
    } catch (e) {
      print('Error in serializeImage: $e');
      // Last resort fallback
      return {
        'name': path.basename(image.path),
        'path': image.path,
        'is_web': kIsWeb,
      };
    }
  }
  
  /// Deserialize image data to XFile
  static Future<XFile?> deserializeImage(Map<dynamic, dynamic> imageData) async {
    try {
      if (imageData['is_web'] == true) {
        // Handle web images
        if (kIsWeb) {
          // Check for placeholder
          if (imageData['is_placeholder'] == true) {
            return null;
          }
          
          // First check our cache
          if (imageData.containsKey('cache_id')) {
            final cacheId = imageData['cache_id'] as String;
            if (_webImageCache.containsKey(cacheId)) {
              return XFile.fromData(
                _webImageCache[cacheId]!,
                name: imageData['name'] as String? ?? 'image.jpg',
                mimeType: imageData['content_type'] as String? ?? 'image/jpeg',
              );
            }
          }
          
          // If not in cache but we have base64 data
          if (imageData.containsKey('data')) {
            try {
              final bytes = base64Decode(imageData['data'] as String);
              // Also store in cache for future use
              if (imageData.containsKey('cache_id')) {
                _webImageCache[imageData['cache_id'] as String] = bytes;
              }
              return XFile.fromData(
                bytes,
                name: imageData['name'] as String? ?? 'image.jpg',
                mimeType: imageData['content_type'] as String? ?? 'image/jpeg',
              );
            } catch (e) {
              print('Error decoding base64 image data: $e');
            }
          }
          
          // Last resort: try the original path (likely won't work after restart)
          if (imageData.containsKey('original_path')) {
            try {
              return XFile(imageData['original_path'] as String);
            } catch (e) {
              print('Error loading from original path: $e');
              return null;
            }
          }
        } else {
          // On native platforms, convert the base64 data to a file
          if (imageData.containsKey('data')) {
            final bytes = base64Decode(imageData['data'] as String);
            final tempDir = await getTemporaryDirectory();
            final tempFile = File('${tempDir.path}/${imageData['name']}');
            await tempFile.writeAsBytes(bytes);
            return XFile(tempFile.path);
          }
        }
      } else if (imageData.containsKey('path')) {
        // For native platform images
        if (kIsWeb) {
          return null; // Native paths won't work on web
        } else {
          // For native platforms, check if file exists
          final file = File(imageData['path'] as String);
          if (await file.exists()) {
            return XFile(file.path);
          }
        }
      }
    } catch (e) {
      print('Error deserializing image: $e');
    }
    return null;
  }
  
  /// Clean up old images to manage storage
  static Future<void> cleanupOldImages({int daysToKeep = 7}) async {
    if (kIsWeb) return; // No cleanup needed for web
    
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final imagesDir = Directory('${appDir.path}/images');
      if (!await imagesDir.exists()) return;
      
      final now = DateTime.now();
      final cutoffDate = now.subtract(Duration(days: daysToKeep));
      
      await for (final entity in imagesDir.list()) {
        if (entity is File) {
          final stat = await entity.stat();
          final fileDate = stat.modified;
          if (fileDate.isBefore(cutoffDate)) {
            await entity.delete();
          }
        }
      }
    } catch (e) {
      print('Error cleaning up images: $e');
    }
  }
} 