import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/cctv_feed_model.dart';
import '../../viewmodels/cctv_viewmodel.dart';

class CCTVPlayerView extends StatefulWidget {
  final CCTVFeedModel feed;

  const CCTVPlayerView({super.key, required this.feed});

  @override
  State<CCTVPlayerView> createState() => _CCTVPlayerViewState();
}

class _CCTVPlayerViewState extends State<CCTVPlayerView> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cctvVM = context.watch<CCTVViewModel>();
    final activeFeed = cctvVM.currentActiveFeed ?? widget.feed;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              activeFeed.cameraName,
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            Text(
              activeFeed.instituteName,
              style: const TextStyle(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Restart / Ping Stream',
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () {
              cctvVM.restartStream(activeFeed.id);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Re-establishing RTSP handshake...')),
              );
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Interactive Video Feed Canvas
            Expanded(
              flex: 5,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Animated Stream / Pan / Zoom Canvas
                  ClipRect(
                    child: Transform.scale(
                      scale: cctvVM.zoomLevel,
                      origin: Offset(cctvVM.panX, cctvVM.panY),
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: activeFeed.isObstructed
                                ? [const Color(0xFF1F1F1F), const Color(0xFF0A0A0A)]
                                : [
                                    const Color(0xFF0F2027),
                                    const Color(0xFF203A43),
                                    const Color(0xFF2C5364),
                                  ],
                          ),
                        ),
                        child: activeFeed.isObstructed
                            ? Center(
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.videocam_off, color: AppColors.alertRed, size: 48),
                                    const SizedBox(height: 8),
                                    const Text(
                                      'SIGNAL LOST / TAMPERED',
                                      style: TextStyle(
                                        color: AppColors.alertRed,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 1.0,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    ElevatedButton.icon(
                                      onPressed: () => cctvVM.restartStream(activeFeed.id),
                                      icon: const Icon(Icons.restart_alt, size: 16),
                                      label: const Text('Attempt Signal Recovery'),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppColors.primaryLight,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : Stack(
                                children: [
                                  // Crosshairs and target grid
                                  Center(
                                    child: Container(
                                      width: 100,
                                      height: 100,
                                      decoration: BoxDecoration(
                                        border: Border.all(color: Colors.white12),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                  ),
                                  // Simulated AI Bounding Boxes
                                  Positioned(
                                    top: 60,
                                    left: 80,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: AppColors.emeraldGreen, width: 1.5),
                                        color: AppColors.emeraldGreen.withValues(alpha: 0.2),
                                      ),
                                      child: const Text(
                                        'PERSON [98%]',
                                        style: TextStyle(
                                          color: AppColors.emeraldGreen,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 70,
                                    right: 60,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                                      decoration: BoxDecoration(
                                        border: Border.all(color: AppColors.saffron, width: 1.5),
                                        color: AppColors.saffron.withValues(alpha: 0.2),
                                      ),
                                      child: const Text(
                                        'CLASSROOM [95%]',
                                        style: TextStyle(
                                          color: AppColors.saffron,
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),

                  // Top HUD: REC indicator + Timestamp + Bitrate
                  Positioned(
                    top: 12,
                    left: 14,
                    right: 14,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Row(
                            children: [
                              FadeTransition(
                                opacity: _pulseController,
                                child: Container(
                                  width: 10,
                                  height: 10,
                                  decoration: BoxDecoration(
                                    color: activeFeed.isLive ? AppColors.cctvHudRed : Colors.grey,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                activeFeed.isLive ? 'LIVE RECORDING' : 'OFFLINE',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            activeFeed.streamTimestamp,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Zoom factor indicator
                  Positioned(
                    bottom: 12,
                    left: 14,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'ZOOM: ${cctvVM.zoomLevel.toStringAsFixed(1)}x',
                        style: const TextStyle(
                          color: AppColors.saffron,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // AI Metadata Tags & Telemetry
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              color: const Color(0xFF1E293B),
              child: Row(
                children: [
                  const Icon(Icons.psychology, color: AppColors.saffron, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: activeFeed.aiTags.map((tag) {
                          return Container(
                            margin: const EdgeInsets.only(right: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              tag,
                              style: const TextStyle(color: Colors.white, fontSize: 11),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // PTZ (Pan, Tilt, Zoom) & Evidence Controls
            Expanded(
              flex: 4,
              child: Container(
                padding: const EdgeInsets.all(16),
                color: const Color(0xFF0F172A),
                child: Column(
                  children: [
                    // Control Action Buttons Row
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        // Audio Toggle
                        _buildControlButton(
                          icon: cctvVM.isAudioEnabled ? Icons.volume_up : Icons.volume_off,
                          label: cctvVM.isAudioEnabled ? 'Mute' : 'Audio',
                          color: cctvVM.isAudioEnabled ? AppColors.emeraldGreen : Colors.white70,
                          onTap: () => cctvVM.toggleAudio(),
                        ),

                        // Snapshot with Watermark
                        _buildControlButton(
                          icon: Icons.camera_alt,
                          label: 'Evidence Snap',
                          color: AppColors.saffron,
                          onTap: () async {
                            final watermark = await cctvVM.captureSnapshot();
                            if (context.mounted) {
                              showDialog(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  backgroundColor: const Color(0xFF1E293B),
                                  title: const Row(
                                    children: [
                                      Icon(Icons.verified, color: AppColors.emeraldGreen),
                                      SizedBox(width: 8),
                                      Text('Evidence Captured & Watermarked', style: TextStyle(color: Colors.white, fontSize: 14)),
                                    ],
                                  ),
                                  content: Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.black,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border.all(color: Colors.white24),
                                    ),
                                    child: Text(
                                      watermark,
                                      style: const TextStyle(color: Colors.white, fontFamily: 'monospace', fontSize: 11),
                                    ),
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.pop(ctx),
                                      child: const Text('Close'),
                                    ),
                                  ],
                                ),
                              );
                            }
                          },
                        ),

                        // Record Toggle
                        _buildControlButton(
                          icon: cctvVM.isRecording ? Icons.stop_circle : Icons.fiber_manual_record,
                          label: cctvVM.isRecording ? 'Stop REC' : 'Record Clip',
                          color: cctvVM.isRecording ? AppColors.alertRed : Colors.white70,
                          onTap: () => cctvVM.toggleRecording(),
                        ),

                        // Zoom In / Out
                        _buildControlButton(
                          icon: Icons.zoom_in,
                          label: 'Zoom +',
                          color: Colors.white70,
                          onTap: () => cctvVM.adjustZoom(0.5),
                        ),
                        _buildControlButton(
                          icon: Icons.zoom_out,
                          label: 'Zoom -',
                          color: Colors.white70,
                          onTap: () => cctvVM.adjustZoom(-0.5),
                        ),
                      ],
                    ),
                    const Spacer(),

                    // PTZ Directional Joystick Simulator
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_left, color: Colors.white, size: 36),
                          onPressed: () => cctvVM.adjustPan(-15, 0),
                        ),
                        Column(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_up, color: Colors.white, size: 36),
                              onPressed: () => cctvVM.adjustPan(0, -15),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white12,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'PTZ PAN',
                                style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.arrow_drop_down, color: Colors.white, size: 36),
                              onPressed: () => cctvVM.adjustPan(0, 15),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.arrow_right, color: Colors.white, size: 36),
                          onPressed: () => cctvVM.adjustPan(15, 0),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }
}
