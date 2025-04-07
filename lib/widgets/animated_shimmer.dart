import 'package:flutter/material.dart';
import 'dart:async';

class AnimatedShimmer extends StatefulWidget {
  final String text;
  final TextStyle? textStyle;
  final Duration typingSpeed;
  final Duration pauseDuration;

  const AnimatedShimmer({
    Key? key,
    required this.text,
    this.textStyle,
    this.typingSpeed = const Duration(milliseconds: 40),
    this.pauseDuration = const Duration(milliseconds: 300),
  }) : super(key: key);

  @override
  State<AnimatedShimmer> createState() => _AnimatedShimmerState();
}

class _AnimatedShimmerState extends State<AnimatedShimmer> with SingleTickerProviderStateMixin {
  late AnimationController _shimmerController;
  late Animation<double> _shimmerAnimation;
  
  final double _shimmerWidth = 60.0;
  final ScrollController _scrollController = ScrollController();
  bool _isScrolling = false;

  @override
  void initState() {
    super.initState();
    _shimmerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();
    
    _shimmerAnimation = Tween<double>(
      begin: -_shimmerWidth,
      end: 100.0 + _shimmerWidth,
    ).animate(CurvedAnimation(
      parent: _shimmerController,
      curve: Curves.easeInOut,
    ));
    
    // Scroll to bottom when text changes
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollToBottom();
    });
  }

  @override
  void didUpdateWidget(AnimatedShimmer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.text != oldWidget.text) {
      // Scroll to bottom when text changes
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    
    setState(() {
      _isScrolling = true;
    });
    
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeOut,
    ).then((_) {
      setState(() {
        _isScrolling = false;
      });
    });
  }

  @override
  void dispose() {
    _shimmerController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lines = widget.text.split('\n');
    final textColor = widget.textStyle?.color ?? Theme.of(context).textTheme.bodyLarge?.color;
    
    return SingleChildScrollView(
      controller: _scrollController,
      child: AnimatedBuilder(
        animation: _shimmerAnimation,
        builder: (context, child) {
          return ShaderMask(
            shaderCallback: (bounds) {
              return LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  textColor?.withOpacity(0.8) ?? Colors.black,
                  textColor?.withOpacity(1.0) ?? Colors.black,
                  textColor?.withOpacity(0.8) ?? Colors.black,
                ],
                stops: [
                  0.0,
                  (_shimmerAnimation.value / 100),
                  1.0,
                ],
              ).createShader(bounds);
            },
            child: child,
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: lines.map((line) {
            if (line.trim().isEmpty) {
              return const SizedBox(height: 12);
            }
            
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 2.0),
              child: Text(
                line,
                style: widget.textStyle?.copyWith(
                  color: Colors.white, // This will be masked by the shader
                ) ?? TextStyle(
                  fontSize: 16,
                  color: Colors.white,
                  height: 1.5,
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
} 