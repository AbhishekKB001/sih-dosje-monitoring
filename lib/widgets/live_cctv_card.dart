import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';
import '../data/models/cctv_feed_model.dart';

class LiveCCTVCard extends StatefulWidget {
  final CCTVFeedModel feed;
  final VoidCallback onTap;

  const LiveCCTVCard({
    super.key,
    required this.feed,
    required this.onTap,
  });

  @override
  State<LiveCCTVCard> createState() => _LiveCCTVCardState();
}

class _LiveCCTVCardState extends State<LiveCCTVCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 1),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final feed = widget.feed;

    return InkWell(
      onTap: widget.onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: feed.isObstructed ? AppColors.alertRed : Colors.grey.shade800,
            width: feed.isObstructed ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          children: [
            // Simulated Video stream background
            _buildStreamBackground(feed),

            // Top HUD: REC indicator + FPS / Resolution
            Positioned(
              top: 8,
              left: 8,
              right: 8,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (feed.isLive)
                          FadeTransition(
                            opacity: _controller,
                            child: Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: AppColors.cctvHudRed,
                                shape: BoxShape.circle,
                              ),
                            ),
                          )
                        else
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: Colors.grey,
                              shape: BoxShape.circle,
                            ),
                          ),
                        const SizedBox(width: 4),
                        Text(
                          feed.isLive ? 'REC' : 'OFFLINE',
                          style: TextStyle(
                            color: feed.isLive ? Colors.white : Colors.red.shade200,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.65),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${feed.fps} FPS | ${feed.resolution}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 9,
                        fontFamily: 'monospace',
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Center: Offline warning or simulated AI bounding box
            if (feed.isObstructed)
              Center(
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.alertRed.withValues(alpha: 0.85),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.videocam_off, color: Colors.white, size: 24),
                      SizedBox(height: 4),
                      Text(
                        'TAMPERED / OFFLINE',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Positioned(
                bottom: 40,
                left: 10,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight.withValues(alpha: 0.8),
                    borderRadius: BorderRadius.circular(4),
                    border: Border.all(color: Colors.white30),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.people_alt, size: 12, color: Colors.white),
                      const SizedBox(width: 4),
                      Text(
                        'Occupancy: ${feed.currentOccupancy}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Bottom Bar: Camera Name, Institute, and Timestamp
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [Colors.black, Colors.transparent],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      feed.cameraName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      feed.instituteName,
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.7),
                        fontSize: 10,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStreamBackground(CCTVFeedModel feed) {
    if (feed.isObstructed) {
      return Container(
        color: const Color(0xFF1A1A1A),
        child: CustomPaint(
          size: Size.infinite,
          painter: _StaticNoisePainter(),
        ),
      );
    }

    // Gradient background representing CCTV visual
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF0F2027),
            const Color(0xFF203A43),
            const Color(0xFF2C5364).withValues(alpha: 0.8),
          ],
        ),
      ),
      child: Stack(
        children: [
          // Surveillance grid crosshair
          Center(
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white.withValues(alpha: 0.12), width: 1),
                shape: BoxShape.circle,
              ),
            ),
          ),
          // Subtle room silhouette / simulation
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            child: Opacity(
              opacity: 0.15,
              child: Container(
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StaticNoisePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.04)
      ..strokeWidth = 1.0;

    for (double y = 0; y < size.height; y += 4) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
