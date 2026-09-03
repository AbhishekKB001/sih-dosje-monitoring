import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../viewmodels/video_call_viewmodel.dart';

class RandomVcScreen extends StatefulWidget {
  const RandomVcScreen({super.key});

  @override
  State<RandomVcScreen> createState() => _RandomVcScreenState();
}

class _RandomVcScreenState extends State<RandomVcScreen> {
  @override
  void initState() {
    super.initState();
    // Auto-initiate call on screen open
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final vcVM = Provider.of<VideoCallViewModel>(context, listen: false);
      if (!vcVM.isConnected && !vcVM.isCalling) {
        vcVM.startRandomCall();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final vcVM = context.watch<VideoCallViewModel>();

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: vcVM.isCalling
            ? _buildCallingState(vcVM)
            : _buildConnectedState(vcVM),
      ),
    );
  }

  // Ringing / Dialing screen
  Widget _buildCallingState(VideoCallViewModel vcVM) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primary.withValues(alpha: 0.2),
              border: Border.all(color: AppColors.saffron, width: 2),
            ),
            child: const Icon(Icons.video_camera_front, size: 64, color: Colors.white),
          ),
          const SizedBox(height: 24),
          const Text(
            'CONNECTING SURPRISE VC AUDIT...',
            style: TextStyle(
              color: AppColors.saffron,
              fontSize: 13,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            vcVM.targetInstitute.name,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Incharge: ${vcVM.targetInstitute.inchargeName} (${vcVM.targetInstitute.inchargePhone})',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 32),
          const CircularProgressIndicator(color: AppColors.saffron),
          const SizedBox(height: 40),
          ElevatedButton.icon(
            onPressed: () {
              vcVM.endCall();
              Navigator.pop(context);
            },
            icon: const Icon(Icons.call_end),
            label: const Text('Cancel Request'),
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.alertRed),
          ),
        ],
      ),
    );
  }

  // Active in-call screen
  Widget _buildConnectedState(VideoCallViewModel vcVM) {
    return Stack(
      children: [
        // Main Video Feed (Institute Side)
        Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF1E3C72), Color(0xFF2A5298)],
            ),
          ),
          child: Stack(
            children: [
              // Simulated Classroom / Incharge office stream background
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 54,
                      backgroundColor: Colors.white.withValues(alpha: 0.15),
                      child: const Icon(Icons.person, size: 68, color: Colors.white),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '${vcVM.targetInstitute.inchargeName} (Live)',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${vcVM.targetInstitute.name} • Class Hall 1',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ),
              ),

              // Watermarked stamp on top
              Positioned(
                top: 16,
                left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: const BoxDecoration(
                              color: AppColors.cctvHudRed,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'DoSJE SURPRISE VC AUDIT',
                            style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'DURATION: ${vcVM.formattedDuration} | 1080p WebRTC',
                        style: const TextStyle(color: AppColors.saffron, fontSize: 10, fontFamily: 'monospace'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),

        // Picture-in-Picture (Caller Officer Feed)
        Positioned(
          top: 16,
          right: 16,
          width: 100,
          height: 140,
          child: Container(
            decoration: BoxDecoration(
              color: Colors.grey.shade900,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white38, width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.4),
                  blurRadius: 8,
                ),
              ],
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Container(
                  color: const Color(0xFF0F172A),
                  child: const Center(
                    child: Icon(Icons.person, color: Colors.white54, size: 36),
                  ),
                ),
                Positioned(
                  bottom: 4,
                  left: 4,
                  right: 4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    color: Colors.black54,
                    child: const Text(
                      'You (HQ)',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        // Bottom Controls Bar
        Positioned(
          bottom: 24,
          left: 16,
          right: 16,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: 0.75),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white24),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Mic Mute
                IconButton(
                  icon: Icon(vcVM.isMuted ? Icons.mic_off : Icons.mic),
                  color: vcVM.isMuted ? AppColors.alertRed : Colors.white,
                  onPressed: () => vcVM.toggleMute(),
                ),

                // Video Toggle
                IconButton(
                  icon: Icon(vcVM.isVideoEnabled ? Icons.videocam : Icons.videocam_off),
                  color: vcVM.isVideoEnabled ? Colors.white : AppColors.alertRed,
                  onPressed: () => vcVM.toggleVideo(),
                ),

                // Camera Switch
                IconButton(
                  icon: const Icon(Icons.flip_camera_ios),
                  color: Colors.white,
                  onPressed: () => vcVM.switchCamera(),
                ),

                // Evidence Snapshot Button
                IconButton(
                  icon: const Icon(Icons.camera_alt, color: AppColors.saffron),
                  tooltip: 'Capture VC Evidence',
                  onPressed: () {
                    vcVM.captureCallSnapshot();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('VC Session Evidence Screenshot Captured with Geotag!'),
                        backgroundColor: AppColors.emeraldGreen,
                      ),
                    );
                  },
                ),

                // End Call
                InkWell(
                  onTap: () {
                    vcVM.endCall();
                    Navigator.pop(context);
                  },
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: AppColors.alertRed,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.call_end, color: Colors.white, size: 24),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
