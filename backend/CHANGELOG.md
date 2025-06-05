# Changelog

All notable changes to the Apsara Backend will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.2] - 2025-06-05

### Fixed
- Notes functionality: Fixed Python indentation issues in `takeNotes` and `loadNotes` tools
- WebSocket handling: Added more robust connection state checks to prevent errors with closed connections
- Error handling: Improved error handling in WebSocket message processing and tool calls
- WebSocket refactoring: Split monolithic `liveHandler.js` into modular components for improved maintainability

### Added
- Advanced logging for WebSocket connections
- Connection state tracking to reduce console spam

## [2.5.1] - 2025-06-05

### Changed
- Complete architectural refactoring from monolithic to modular design
- Reorganized files into domain-driven directory structure
- Improved separation of concerns for better maintainability

### Added
- Proper module exports/imports
- Directory structure documentation
- Versioning guidelines

## [2.5.0] - 2025 (Initial Version)

### Added
- Initial release with monolithic architecture
- Google Gemini AI integration
- WebSocket support for live AI interactions
- Google API integrations (Gmail, Calendar, Maps)
- File upload and management
- Tool invocation system 