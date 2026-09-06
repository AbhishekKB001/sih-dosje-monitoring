import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../viewmodels/video_call_viewmodel.dart';
import '../../viewmodels/auth_viewmodel.dart';

class RandomVcScreen extends StatefulWidget {
  const RandomVcScreen({super.key});

  @override
  State<RandomVcScreen> createState() => _RandomVcScreenState();
}

class _RandomVcScreenState extends State<RandomVcScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authVM = Provider.of<AuthViewModel>(context, listen: false);
      final vcVM = Provider.of<VideoCallViewModel>(context, listen: false);
      final userId = authVM.currentUser?.id ?? 'USR-MEMBER-04';

      // Start listening for incoming surprise VC calls for this user
      vcVM.startIncomingCallPolling(userId);

      // If opened directly without active connection or incoming call, auto initiate
      if (!vcVM.isConnected && !vcVM.isCalling && !vcVM.hasIncomingCall) {
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
        child: vcVM.hasIncomingCall
            ? _buildIncomingCallState(vcVM)
            : vcVM.isCalling
                ? _buildCallingState(vcVM)
                : vcVM.isConnected
                    ? _buildConnectedState(vcVM)
                    : _buildIdleLobbyState(vcVM),
      ),
    );
  }

  // --- INCOMING CALL SCREEN ---
  Widget _buildIncomingCallState(VideoCallViewModel vcVM) {
    final session = vcVM.incomingSession!;
    final instituteName = session['institute']?['name'] ?? vcVM.targetInstitute.name;
    final projectName = session['project']?['name'] ?? 'DoSJE Monitored Scheme';
    final hostName = session['hostUser']?['name'] ?? 'Headquarter Inspection Cell';

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 28.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.alertRed.withValues(alpha: 0.15),
                border: Border.all(color: AppColors.alertRed, width: 2.5),
              ),
              child: const Icon(Icons.phone_in_talk, size: 68, color: Colors.white),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.alertRed,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'INCOMING SURPRISE VC AUDIT',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              instituteName,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 22,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Project: $projectName',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.saffron, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 4),
            Text(
              'Initiated By: $hostName (HQ PMU)',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
            ),
            const SizedBox(height: 48),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                // Reject Button
                Column(
                  children: [
                    InkWell(
                      onTap: () async {
                        await vcVM.rejectIncomingCall();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: const BoxDecoration(
                          color: AppColors.alertRed,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.call_end, color: Colors.white, size: 30),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Decline', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  ],
                ),
                // Accept Button
                Column(
                  children: [
                    InkWell(
                      onTap: () async {
                        await vcVM.acceptIncomingCall();
                      },
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: const BoxDecoration(
                          color: AppColors.emeraldGreen,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.videocam, color: Colors.white, size: 30),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('Accept & Join', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // --- RINGING / DIALING SCREEN ---
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

  // --- ACTIVE IN-CALL SCREEN WITH WEBRTC BRIDGE ---
  Widget _buildConnectedState(VideoCallViewModel vcVM) {
    return Stack(
      children: [
        // Main Video Canvas
        Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0xFF0D1B2A), Color(0xFF1B263B), Color(0xFF415A77)],
            ),
          ),
          child: Stack(
            children: [
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
                      '${vcVM.targetInstitute.inchargeName} (Live Verified)',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${vcVM.targetInstitute.name} • On-Camera Hall',
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 20),
                    // Action Pill to open real Jitsi WebRTC stream in device browser / app
                    ElevatedButton.icon(
                      onPressed: () async {
                        final ok = await vcVM.launchWebRtcRoom();
                        if (!mounted) return;
                        if (!ok) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Room URL: ${vcVM.meetingUrl ?? "https://meet.jit.si"}'),
                            ),
                          );
                        }
                      },
                      icon: const Icon(Icons.open_in_new, color: Colors.black, size: 18),
                      label: const Text(
                        'OPEN LIVE WEBRTC ROOM (JITSI)',
                        style: TextStyle(
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.saffron,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                      ),
                    ),
                  ],
                ),
              ),

              // Watermarked stamp on top left
              Positioned(
                top: 16,
                left: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.7),
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

        // Picture-in-Picture (Self Officer Feed)
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
              color: Colors.black.withValues(alpha: 0.85),
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
                        content: Text('VC Session Evidence Screenshot Captured with Geotag & Cryptographic Hash!'),
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

  // --- IDLE LOBBY SCREEN ---
  Widget _buildIdleLobbyState(VideoCallViewModel vcVM) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.video_call, size: 72, color: AppColors.saffron),
            const SizedBox(height: 16),
            const Text(
              'Surprise VC Audit Portal',
              style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Initiate random biometric video audits or stand by for incoming HQ audit calls.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () => vcVM.startRandomCall(),
              icon: const Icon(Icons.shuffle),
              label: const Text('Initiate Random VC Audit'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              ),
            ),
            const SizedBox(height: 16),
            OutlinedButton.icon(
              onPressed: () => Navigator.pop(context),
              icon: const Icon(Icons.arrow_back, color: Colors.white70),
              label: const Text('Back to Dashboard', style: TextStyle(color: Colors.white70)),
            ),
          ],
        ),
      ),
    );
  }
}

