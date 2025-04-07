import 'package:flutter/material.dart';
import 'services/hive_service.dart';

class ThemeProvider {
  static final ValueNotifier<ThemeMode> themeMode = ValueNotifier(ThemeMode.system);
  
  static Future<void> init() async {
    // Load theme from Hive
    final int savedThemeMode = HiveService.getThemeMode();
    themeMode.value = _intToThemeMode(savedThemeMode);
  }
  
  /// Updates the app theme mode and saves it to Hive
  static Future<void> updateThemeMode(ThemeMode mode) async {
    themeMode.value = mode;
    await HiveService.saveThemeMode(_themeModeToInt(mode));
  }
  
  /// Toggles between light and dark mode (not system)
  static Future<void> toggleTheme() async {
    final mode = themeMode.value == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await updateThemeMode(mode);
  }
  
  // Converts ThemeMode to int for storage
  static int _themeModeToInt(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.system:
        return 0;
      case ThemeMode.light:
        return 1;
      case ThemeMode.dark:
        return 2;
    }
  }
  
  // Converts stored int to ThemeMode
  static ThemeMode _intToThemeMode(int value) {
    switch (value) {
      case 1:
        return ThemeMode.light;
      case 2:
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }
} 