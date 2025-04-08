import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'chat_screen.dart';
import 'theme_provider.dart';
import 'services/hive_service.dart';
import 'services/wake_word_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Hive for persistent storage
  await HiveService.init();
  
  // Initialize theme settings
  await ThemeProvider.init();
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // Configure animations for the whole app
  Animate.restartOnHotReload = true;
  
  runApp(const MyApp());
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> with WidgetsBindingObserver {
  final WakeWordService _wakeWordService = WakeWordService();
  final String _accessKey = "HbA+vB/MKtuMA2/trDIZ/ly37eRr/MGMgjW8gDl5re0ni0z5KbmEiA=="; // Replace with your Picovoice access key
  
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    
    // Initialize wake word service
    _initializeWakeWordService();
  }
  
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _wakeWordService.dispose();
    super.dispose();
  }
  
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    
    // Manage wake word detection based on app lifecycle
    switch (state) {
      case AppLifecycleState.resumed:
        _wakeWordService.startListening();
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
        // Keep listening in background
        break;
      case AppLifecycleState.detached:
        _wakeWordService.dispose();
        break;
      default:
        break;
    }
  }
  
  Future<void> _initializeWakeWordService() async {
    try {
      await _wakeWordService.initialize(
        accessKey: _accessKey,
        onWakeWordDetected: () {
          print("Wake word detected: 'app-sara'");
          // The ChatScreen will handle showing the popup
        },
        onError: (error) {
          print("Wake word service error: $error");
        },
      );
      
      // Start listening for wake word
      await _wakeWordService.startListening();
    } catch (e) {
      print("Failed to initialize wake word service: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: ThemeProvider.themeMode,
      builder: (context, themeMode, child) {
        return MaterialApp(
          title: 'Apsara-2.5',
          theme: _buildLightTheme(),
          darkTheme: _buildDarkTheme(),
          themeMode: themeMode,
          home: ChatScreen(wakeWordService: _wakeWordService),
          debugShowCheckedModeBanner: false,
        );
      },
    );
  }
  
  ThemeData _buildLightTheme() {
    final baseTheme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF673AB7), // Deep Purple
        brightness: Brightness.light,
      ),
    );
    
    return baseTheme.copyWith(
      textTheme: GoogleFonts.poppinsTextTheme(baseTheme.textTheme),
      primaryTextTheme: GoogleFonts.poppinsTextTheme(baseTheme.primaryTextTheme),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        titleSpacing: 0,
        toolbarHeight: 60,
        backgroundColor: baseTheme.colorScheme.surface,
        foregroundColor: baseTheme.colorScheme.onSurface,
        systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
          statusBarColor: Colors.transparent,
        ),
        titleTextStyle: GoogleFonts.poppins(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: baseTheme.colorScheme.onSurface,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: baseTheme.colorScheme.surfaceVariant.withOpacity(0.5),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: baseTheme.colorScheme.primary,
            width: 2,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: GoogleFonts.poppins(
          fontSize: 16,
          color: baseTheme.colorScheme.onSurfaceVariant.withOpacity(0.7),
        ),
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        clipBehavior: Clip.antiAlias,
      ),
      iconTheme: IconThemeData(
        color: baseTheme.colorScheme.primary,
        size: 24,
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        side: BorderSide.none,
      ),
      dividerTheme: DividerThemeData(
        space: 16,
        thickness: 1,
        color: baseTheme.colorScheme.outline.withOpacity(0.2),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        elevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: baseTheme.colorScheme.surfaceVariant,
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: GoogleFonts.poppins(
          color: baseTheme.colorScheme.onSurfaceVariant,
          fontSize: 12,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        contentTextStyle: GoogleFonts.poppins(
          fontSize: 14,
        ),
      ),
    );
  }
  
  ThemeData _buildDarkTheme() {
    final baseTheme = ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFF10A37F), // ChatGPT green as seed color
        brightness: Brightness.dark,
      ),
    );
    
    return baseTheme.copyWith(
      textTheme: GoogleFonts.poppinsTextTheme(baseTheme.textTheme),
      primaryTextTheme: GoogleFonts.poppinsTextTheme(baseTheme.primaryTextTheme),
      appBarTheme: AppBarTheme(
        elevation: 0,
        centerTitle: false,
        titleSpacing: 0,
        toolbarHeight: 60,
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        systemOverlayStyle: SystemUiOverlayStyle.light.copyWith(
          statusBarColor: Colors.transparent,
        ),
        titleTextStyle: GoogleFonts.poppins(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: const Color(0xFF444654),
          foregroundColor: Colors.white,
          textStyle: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF444654),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(
            color: Color(0xFF10A37F),
            width: 1,
          ),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        hintStyle: GoogleFonts.poppins(
          fontSize: 16,
          color: Colors.grey.shade400,
        ),
      ),
      cardTheme: CardTheme(
        elevation: 0,
        color: const Color(0xFF444654),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
      ),
      iconTheme: const IconThemeData(
        color: Colors.white,
        size: 24,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFF444654),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        side: BorderSide.none,
      ),
      dividerTheme: const DividerThemeData(
        space: 16,
        thickness: 1,
        color: Color(0xFF555555),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: const Color(0xFF10A37F),
        foregroundColor: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: const Color(0xFF444654),
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: GoogleFonts.poppins(
          color: Colors.white,
          fontSize: 12,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF444654),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        contentTextStyle: GoogleFonts.poppins(
          fontSize: 14,
          color: Colors.white,
        ),
      ),
      scaffoldBackgroundColor: Colors.black, // Pure black background
      colorScheme: baseTheme.colorScheme.copyWith(
        background: Colors.black,
        surface: Colors.black,
        primary: const Color(0xFF10A37F), // ChatGPT green
        secondary: const Color(0xFF10A37F),
        tertiary: const Color(0xFF8E8EA0), // ChatGPT lighter text
        primaryContainer: const Color(0xFF343541), // User message bubble
        secondaryContainer: const Color(0xFF444654), // AI message background
        onPrimaryContainer: Colors.white,
        onSecondaryContainer: Colors.white,
        onSurface: Colors.white,
        onBackground: Colors.white,
      ),
    );
  }
} 