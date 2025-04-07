import 'package:flutter/material.dart';
import 'package:flutter_highlight/flutter_highlight.dart';
import 'package:flutter_highlight/themes/github.dart';
import 'package:flutter_highlight/themes/monokai.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:flutter_math_fork/flutter_math.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:shimmer/shimmer.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:linkify/linkify.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'package:file_saver/file_saver.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import 'animated_shimmer.dart';

class EnhancedMessageContent extends StatelessWidget {
  final String text;
  final TextStyle? textStyle;
  final bool isStreaming;
  final List<XFile>? images;

  const EnhancedMessageContent({
    super.key,
    required this.text,
    this.textStyle,
    this.isStreaming = false,
    this.images,
  });

  String _parseMarkdown(String text) {
    // Handle bold text with both ** and __ syntax
    text = text.replaceAllMapped(RegExp(r'\*\*(.*?)\*\*|__(.*?)__'), (match) {
      final content = match[1] ?? match[2];
      return '<strong>$content</strong>';
    });
    
    // Handle italic text with both * and _ syntax
    text = text.replaceAllMapped(RegExp(r'\*(.*?)\*|_(.*?)_'), (match) {
      final content = match[1] ?? match[2];
      return '<em>$content</em>';
    });
    
    // Handle inline code with backticks
    text = text.replaceAllMapped(RegExp(r'`(.*?)`'), (match) {
      return '<code>${match[1]}</code>';
    });
    
    // Convert URLs to links
    text = text.replaceAllMapped(
      RegExp(r'https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)'),
      (match) => '<a href="${match[0]}">${match[0]}</a>'
    );
    
    return text;
  }

  @override
  Widget build(BuildContext context) {
    if (isStreaming) {
      return _buildStreamingContent(context);
    }
    return _buildRichContent(context);
  }

  Widget _buildStreamingContent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Show images in shimmer effect if present
        if (images != null && images!.isNotEmpty)
          _buildShimmeringImages(context),
          
        // Enhanced typing animation
        AnimatedShimmer(
          text: text,
          textStyle: textStyle ?? TextStyle(
            color: Theme.of(context).colorScheme.onSecondaryContainer,
            fontSize: 15,
          ),
        ),
      ],
    );
  }
  
  Widget _buildShimmeringImages(BuildContext context) {
    return SizedBox(
      height: 150,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: images?.length ?? 0,
        itemBuilder: (context, index) {
          return Shimmer.fromColors(
            baseColor: Theme.of(context).colorScheme.primary.withOpacity(0.1),
            highlightColor: Theme.of(context).colorScheme.primary.withOpacity(0.3),
            child: Padding(
              padding: const EdgeInsets.only(right: 8, bottom: 8),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 150,
                  height: 150,
                  color: Theme.of(context).colorScheme.surfaceVariant,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRichContent(BuildContext context) {
    final List<Widget> contentWidgets = [];
    
    // Add images if present
    if (images != null && images!.isNotEmpty && !isStreaming) {
      contentWidgets.add(_buildImagesGallery(context));
    }
    
    final List<String> lines = text.split('\n');
    bool isInCodeBlock = false;
    String currentCodeBlock = '';
    String currentLanguage = '';

    for (int i = 0; i < lines.length; i++) {
      String line = lines[i];

      if (line.startsWith('```')) {
        if (!isInCodeBlock) {
          isInCodeBlock = true;
          currentLanguage = line.substring(3).trim();
          currentCodeBlock = '';
        } else {
          isInCodeBlock = false;
          contentWidgets.add(_buildCodeBlock(context, currentCodeBlock, currentLanguage));
          currentCodeBlock = '';
          currentLanguage = '';
        }
        continue;
      }

      if (line.startsWith('\$\$')) {
        if (!isInCodeBlock) {
          contentWidgets.add(_buildMathBlock(context, line.substring(2)));
        }
        continue;
      }

      if (line.contains('\$') && !isInCodeBlock) {
        final parts = line.split('\$');
        for (int j = 0; j < parts.length; j++) {
          if (j % 2 == 0) {
            if (parts[j].isNotEmpty) {
              contentWidgets.add(_buildTextWithLinks(context, parts[j]));
            }
          } else {
            contentWidgets.add(_buildInlineMath(context, parts[j]));
          }
        }
        continue;
      }

      if (isInCodeBlock) {
        currentCodeBlock += line + '\n';
      } else if (line.isNotEmpty) {
        contentWidgets.add(Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: _buildTextWithLinks(context, line),
        ));
      } else {
        contentWidgets.add(const SizedBox(height: 8));
      }
    }

    if (isInCodeBlock) {
      contentWidgets.add(_buildCodeBlock(context, currentCodeBlock, currentLanguage));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: contentWidgets,
    );
  }
  
  Widget _buildImagesGallery(BuildContext context) {
    return SizedBox(
      height: 150,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: images!.length,
        itemBuilder: (context, index) {
          return Padding(
            padding: const EdgeInsets.only(right: 8, bottom: 8),
            child: GestureDetector(
              onTap: () => _showImagePreview(
                context,
                images![index],
                kIsWeb,
              ),
              child: Hero(
                tag: 'image_${index}_${DateTime.now().millisecondsSinceEpoch}',
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildImageWidget(context, images![index]),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
  
  Widget _buildImageWidget(BuildContext context, XFile image) {
    if (kIsWeb) {
      return FutureBuilder<Uint8List>(
        future: image.readAsBytes(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Container(
              width: 150,
              height: 150,
              color: Theme.of(context).colorScheme.surfaceVariant,
              child: Center(
                child: CircularProgressIndicator(
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            );
          } else if (snapshot.hasError || !snapshot.hasData) {
            return Container(
              width: 150,
              height: 150,
              color: Theme.of(context).colorScheme.errorContainer,
              child: Center(
                child: Icon(
                  Icons.broken_image_rounded,
                  color: Theme.of(context).colorScheme.error,
                  size: 40,
                ),
              ),
            );
          } else {
            return Image.memory(
              snapshot.data!,
              height: 150,
              width: 150,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  width: 150,
                  height: 150,
                  color: Theme.of(context).colorScheme.errorContainer,
                  child: Center(
                    child: Icon(
                      Icons.broken_image_rounded,
                      color: Theme.of(context).colorScheme.error,
                      size: 40,
                    ),
                  ),
                );
              },
            );
          }
        },
      );
    } else {
      return Image.file(
        File(image.path),
        height: 150,
        width: 150,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: 150,
            height: 150,
            color: Theme.of(context).colorScheme.errorContainer,
            child: Center(
              child: Icon(
                Icons.broken_image_rounded,
                color: Theme.of(context).colorScheme.error,
                size: 40,
              ),
            ),
          );
        },
      );
    }
  }
  
  void _showImagePreview(BuildContext context, XFile image, bool isWebImage) {
    showGeneralDialog(
      context: context,
      pageBuilder: (context, animation, secondaryAnimation) {
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
                    tag: 'image_preview_${DateTime.now().millisecondsSinceEpoch}',
                    child: InteractiveViewer(
                      minScale: 0.5,
                      maxScale: 4.0,
                      child: FutureBuilder<Uint8List>(
                        future: image.readAsBytes(),
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.waiting) {
                            return const Center(
                              child: CircularProgressIndicator(
                                color: Colors.white,
                              ),
                            );
                          } else if (snapshot.hasError || !snapshot.hasData) {
                            return Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Icons.broken_image_rounded,
                                    color: Colors.white,
                                    size: 64,
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Failed to load image',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                    ),
                                  ),
                                ],
                              ),
                            );
                          } else {
                            return Image.memory(
                              snapshot.data!,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                return Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.broken_image_rounded,
                                        color: Colors.white,
                                        size: 64,
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'Failed to load image',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 18,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            );
                          }
                        },
                      ),
                    ),
                  ),
                ),
              ),
              // Top bar with controls
              Positioned(
                top: 16,
                right: 16,
                child: Row(
                  children: [
                    // Share button
                    _buildCircularButton(
                      context: context,
                      icon: Icons.share_rounded,
                      tooltip: 'Share Image',
                      onPressed: () async {
                        final bytes = await image.readAsBytes();
                        _shareImage(context, bytes, image.name);
                      },
                    ),
                    const SizedBox(width: 12),
                    // Download button - Web only
                    if (kIsWeb)
                      _buildCircularButton(
                        context: context,
                        icon: Icons.download_rounded,
                        tooltip: 'Download Image',
                        onPressed: () async {
                          final bytes = await image.readAsBytes();
                          _downloadImageWeb(context, bytes, image.name);
                        },
                      ),
                    const SizedBox(width: 12),
                    // Close button
                    _buildCircularButton(
                      context: context,
                      icon: Icons.close_rounded,
                      tooltip: 'Close',
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      transitionBuilder: (context, animation, secondaryAnimation, child) {
        return FadeTransition(
          opacity: animation,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.5, end: 1.0).animate(
              CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
              ),
            ),
            child: child,
          ),
        );
      },
      transitionDuration: const Duration(milliseconds: 300),
      barrierDismissible: true,
      barrierLabel: '',
      barrierColor: Colors.black87,
    );
  }

  Widget _buildCircularButton({
    required BuildContext context,
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.black54,
        shape: BoxShape.circle,
      ),
      child: IconButton(
        icon: Icon(icon, color: Colors.white),
        tooltip: tooltip,
        onPressed: onPressed,
      ),
    );
  }

  Future<void> _shareImage(BuildContext context, Uint8List bytes, String fileName) async {
    try {
      // Show loading indicator
      final scaffold = ScaffoldMessenger.of(context);
      
      if (kIsWeb) {
        // Web doesn't support direct sharing like mobile platforms
        scaffold.showSnackBar(
          const SnackBar(
            content: Text('Sharing is not supported on web. Try downloading instead.'),
            duration: Duration(seconds: 3),
          ),
        );
        return;
      }
      
      // Create a temporary file to share
      final tempDir = await getTemporaryDirectory();
      final tempFile = File('${tempDir.path}/$fileName');
      await tempFile.writeAsBytes(bytes);
      
      // Share the file
      await Share.shareXFiles(
        [XFile(tempFile.path)],
        text: 'Shared from Apsara 2.5',
      );
    } catch (e) {
      print('Error sharing image: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to share image: $e'),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _downloadImageWeb(BuildContext context, Uint8List bytes, String fileName) async {
    try {
      final scaffold = ScaffoldMessenger.of(context);
      
      // For web, use FileSaver
      await FileSaver.instance.saveFile(
        name: fileName.isEmpty ? 'image.jpg' : fileName,
        bytes: bytes,
        ext: 'jpg',
        mimeType: MimeType.jpeg,
      );
      scaffold.showSnackBar(
        const SnackBar(
          content: Text('Image downloaded successfully'),
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      print('Error downloading image: $e');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to download image: $e'),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Widget _buildCodeBlock(BuildContext context, String code, String language) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF1E1E1E)
            : const Color(0xFFF6F8FA),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isDark
              ? Colors.grey[800]!
              : Colors.grey[300]!,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (language.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.grey[900]
                    : Colors.grey[100],
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(8),
                  topRight: Radius.circular(8),
                ),
                border: Border(
                  bottom: BorderSide(
                    color: isDark
                        ? Colors.grey[800]!
                        : Colors.grey[300]!,
                  ),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    language,
                    style: TextStyle(
                      color: isDark
                          ? Colors.grey[400]
                          : Colors.grey[600],
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.copy,
                      size: 16,
                      color: isDark
                          ? Colors.grey[400]
                          : Colors.grey[600],
                    ),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: code.trim()));
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Code copied to clipboard'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                    },
                    tooltip: 'Copy code',
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(
                      minWidth: 32,
                      minHeight: 32,
                    ),
                  ),
                ],
              ),
            ),
          HighlightView(
            code.trim(),
            language: language.isEmpty ? 'plaintext' : language,
            theme: isDark ? monokaiTheme : githubTheme,
            padding: const EdgeInsets.all(16),
            textStyle: TextStyle(
              fontFamily: 'Consolas',
              fontSize: 14,
              height: 1.5,
              letterSpacing: 0.3,
              color: isDark
                  ? Colors.grey[300]
                  : Colors.grey[900],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMathBlock(BuildContext context, String math) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: Math.tex(
        math,
        textStyle: textStyle,
        textScaleFactor: 1.2,
      ),
    );
  }

  Widget _buildInlineMath(BuildContext context, String math) {
    return Math.tex(
      math,
      textStyle: textStyle,
      textScaleFactor: 1.1,
    );
  }

  Widget _buildTextWithLinks(BuildContext context, String text) {
    final parsedText = _parseMarkdown(text);
    
    return Html(
      data: parsedText,
      style: {
        'body': Style(
          margin: Margins.zero,
          padding: HtmlPaddings.zero,
          fontSize: FontSize(15),
          lineHeight: LineHeight.number(1.5),
          letterSpacing: 0.3,
          color: textStyle?.color ?? Theme.of(context).colorScheme.onSurface,
        ),
        'strong': Style(
          fontWeight: FontWeight.bold,
        ),
        'em': Style(
          fontStyle: FontStyle.italic,
        ),
        'code': Style(
          backgroundColor: Theme.of(context).colorScheme.surfaceVariant,
          padding: HtmlPaddings.symmetric(horizontal: 4),
          fontFamily: 'Consolas',
        ),
        'a': Style(
          color: Theme.of(context).colorScheme.primary,
          textDecoration: TextDecoration.underline,
        ),
      },
      onLinkTap: (url, _, __) {
        if (url != null) {
          _launchUrl(url);
        }
      },
    );
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
} 