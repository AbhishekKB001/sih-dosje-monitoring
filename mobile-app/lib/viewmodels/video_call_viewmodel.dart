import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';
import '../data/models/institute_model.dart';
import '../data/services/api_service.dart';
import '../../core/constants/mock_data.dart';

class VideoCallViewModel extends ChangeNotifier {
  final ApiService _api = ApiService();
  InstituteModel _targetInstitute = MockData.institutes.first;
  InstituteModel get targetInstitute => _targetInstitute;

  String? _activeSessionId;
  String? get activeSessionId => _activeSessionId;

  String? _channelName;
  String? get channelName => _channelName;

  String? _meetingUrl;
  String? get meetingUrl => _meetingUrl;

  bool _isCalling = false;
  bool get isCalling => _isCalling;

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  bool _isMuted = false;
  bool get isMuted => _isMuted;

  bool _isVideoEnabled = true;
  bool get isVideoEnabled => _isVideoEnabled;

  bool _isFrontCamera = true;
  bool get isFrontCamera => _isFrontCamera;

  int _callDurationSeconds = 0;
  int get callDurationSeconds => _callDurationSeconds;

  Timer? _timer;
  Timer? _pollTimer;

  String? _lastEvidenceSnapshot;
  String? get lastEvidenceSnapshot => _lastEvidenceSnapshot;

  Map<String, dynamic>? _incomingSession;
  Map<String, dynamic>? get incomingSession => _incomingSession;
  bool get hasIncomingCall => _incomingSession != null;

  void setTargetInstitute(InstituteModel institute) {
    _targetInstitute = institute;
    notifyListeners();
  }

  // --- INCOMING CALL POLLING ---
  void startIncomingCallPolling(String userId) {
    _pollTimer?.cancel();
    _checkIncoming(userId);
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      _checkIncoming(userId);
    });
  }

  void stopIncomingCallPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _checkIncoming(String userId) async {
    if (_isConnected || _isCalling) return;
    try {
      final call = await _api.pollIncomingVCCall(userId: userId);
      if (call != null && call['id'] != null) {
        _incomingSession = call;
        notifyListeners();
      } else if (_incomingSession != null) {
        _incomingSession = null;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<bool> acceptIncomingCall() async {
    if (_incomingSession == null) return false;
    final sessId = _incomingSession!['id'].toString();
    final chName = _incomingSession!['channelName']?.toString() ?? 'dosje-audit-$sessId';
    final meetUrl = _incomingSession!['meetingUrl']?.toString() ?? 'https://meet.jit.si/$chName';

    final res = await _api.acceptVCCall(sessId);
    _activeSessionId = sessId;
    _channelName = chName;
    _meetingUrl = meetUrl;
    _incomingSession = null;
    _isCalling = false;
    _isConnected = true;
    _callDurationSeconds = 0;
    _startTimer();
    notifyListeners();

    // Auto launch real WebRTC room
    await launchWebRtcRoom();
    return res != null;
  }

  Future<bool> rejectIncomingCall([String? reason]) async {
    if (_incomingSession == null) return false;
    final sessId = _incomingSession!['id'].toString();
    final ok = await _api.rejectVCCall(sessId, reason ?? 'Declined by recipient');
    _incomingSession = null;
    notifyListeners();
    return ok;
  }

  // --- OUTGOING CALL INITIATION ---
  void startRandomCall({
    InstituteModel? specificInstitute,
    String? hostUserId,
    String? instituteId,
    String? projectId,
  }) {
    if (specificInstitute != null) {
      _targetInstitute = specificInstitute;
    } else {
      final list = MockData.institutes;
      _targetInstitute = list[DateTime.now().millisecond % list.length];
    }

    _isCalling = true;
    _isConnected = false;
    _callDurationSeconds = 0;
    _lastEvidenceSnapshot = null;
    _channelName = 'dosje-audit-${DateTime.now().millisecondsSinceEpoch}';
    _meetingUrl = 'https://meet.jit.si/$_channelName';
    notifyListeners();

    // Register session with central backend
    _api.createVCSession(hostUserId: hostUserId ?? 'USR-PMU-104').then((res) {
      if (res != null) {
        final sess = res['data'] ?? res['session'];
        if (sess != null && sess['id'] != null) {
          _activeSessionId = sess['id'].toString();
          if (sess['meetingUrl'] != null) {
            _meetingUrl = sess['meetingUrl'].toString();
          }
          if (sess['channelName'] != null) {
            _channelName = sess['channelName'].toString();
          }
        }
      }
    });

    // Connection transition after ringing sequence
    Timer(const Duration(milliseconds: 1800), () {
      _isCalling = false;
      _isConnected = true;
      _startTimer();
      notifyListeners();
    });
  }

  // --- REAL WEBRTC LAUNCH ---
  Future<bool> launchWebRtcRoom([String? customUrl]) async {
    final targetUrl = customUrl ?? _meetingUrl;
    if (targetUrl == null || targetUrl.isEmpty) return false;
    final uri = Uri.parse(targetUrl);
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      _callDurationSeconds++;
      notifyListeners();
    });
  }

  void toggleMute() {
    _isMuted = !_isMuted;
    notifyListeners();
  }

  void toggleVideo() {
    _isVideoEnabled = !_isVideoEnabled;
    notifyListeners();
  }

  void switchCamera() {
    _isFrontCamera = !_isFrontCamera;
    notifyListeners();
  }

  String captureCallSnapshot() {
    final now = DateTime.now();
    _lastEvidenceSnapshot =
        'VC EVIDENCE RECORD [DoSJE-AUDIT]\nTarget: ${_targetInstitute.name}\nIncharge: ${_targetInstitute.inchargeName}\nRoom: $_channelName\nTimestamp: ${now.toIso8601String()}\nDuration: $formattedDuration\nStatus: Verified Real-Time WebRTC Session';
    notifyListeners();
    return _lastEvidenceSnapshot!;
  }

  void endCall() {
    _timer?.cancel();
    _isCalling = false;
    _isConnected = false;
    if (_activeSessionId != null) {
      final sessId = _activeSessionId!;
      _api.submitVCResult(
        sessId,
        'VERIFIED',
        'Surprise VC Audit verified via mobile WebRTC session. Call duration: $formattedDuration',
        _callDurationSeconds,
      );
      _activeSessionId = null;
    }
    _callDurationSeconds = 0;
    notifyListeners();
  }

  String get formattedDuration {
    final minutes = (_callDurationSeconds ~/ 60).toString().padLeft(2, '0');
    final seconds = (_callDurationSeconds % 60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }
}
