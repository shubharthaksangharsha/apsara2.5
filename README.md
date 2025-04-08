# Apsara 2.5

A powerful Flutter application powered by Google's Gemini AI. Apsara 2.5 offers an intuitive chat interface with advanced AI capabilities.

## Features

- Interactive chat interface with Gemini AI
- Image recognition and processing
- Multiple conversation support
- Beautiful, responsive UI with ChatGPT-like interface
- Markdown rendering support
- Code syntax highlighting
- Map integration
- File sharing capabilities
- Dark/Light theme support
- **Wake word detection** - say "app-sara" to activate Apsara from anywhere in the app

## Tech Stack

- Flutter for cross-platform development
- Google Generative AI (Gemini) for AI capabilities
- Hive for local storage
- Porcupine for wake word detection
- Various Flutter plugins for enhanced functionality

## Requirements

- Flutter 3.2.3 or higher
- Dart 3.2.3 or higher
- Google Gemini API key
- Picovoice Porcupine API key (for wake word detection)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   flutter pub get
   ```
3. Add your Gemini API key (follow instructions in the services directory)
4. Set up wake word detection:
   - Create a Picovoice account and get an access key
   - Place your custom "app-sara.ppn" keyword file in the `assets/keywords/` directory
   - Update the access key in the `main.dart` file
5. Run the app:
   ```
   flutter run
   ```

## Project Structure

- `lib/`: Main source code
  - `main.dart`: Entry point of the application
  - `chat_screen.dart`: Primary chat interface
  - `widgets/`: UI components
    - `wake_word_popup.dart`: Popup UI that appears when wake word is detected
  - `services/`: API and data services
    - `wake_word_service.dart`: Service for managing wake word detection
  - `theme_provider.dart`: Theme management

## Wake Word Detection

Apsara 2.5 uses Porcupine Flutter SDK for wake word detection. When the wake word "app-sara" is detected, a popup interface appears allowing you to quickly interact with Apsara.

To customize or create your own wake word:
1. Visit the [Picovoice Console](https://console.picovoice.ai/)
2. Create a new wake word
3. Download the .ppn file and place it in `assets/keywords/`
4. Update the file path in `wake_word_service.dart`

## Credits

Created by Shubharthak

## License

This project is licensed under the MIT License - see the LICENSE file for details.
