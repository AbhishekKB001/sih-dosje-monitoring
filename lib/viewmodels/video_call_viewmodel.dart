import 'dart:async';
import 'package:flutter/foundation.dart';
import '../data/models/institute_model.dart';
import '../../core/constants/mock_data.dart';

class VideoCallViewModel extends ChangeNotifier {
  InstituteModel _targetInstitute = MockData.institutes.first;
  InstituteModel get targetInstitute => _targetInstitute;

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

  String? _lastEvidenceSnapshot;
  String? get lastEvidenceSnapshot => _lastEvidenceSnapshot;

  void setTargetInstitute(InstituteModel institute) {
    _targetInstitute = institute;
    notifyListeners();
  }

  void startRandomCall({InstituteModel? specificInstitute}) {
    if (specificInstitute != null) {
      _targetInstitute = specificInstitute;
    } else {
      // Pick random
      final list = MockData.institutes;
      _targetInstitute = list[DateTime.now().millisecond % list.length];
    }

    _isCalling = true;
    _isConnected = false;
    _callDurationSeconds = 0;
    _lastEvidenceSnapshot = null;
    notifyListeners();

    // Simulate connection after 1.8 seconds
    Timer(const Duration(milliseconds: 1800), () {
      _isCalling = false;
      _isConnected = true;
      _startTimer();
      notifyListeners();
    });
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
        'VC EVIDENCE RECORD [DoSJE-AUDIT]\nTarget: ${_targetInstitute.name}\nIncharge: ${_targetInstitute.inchargeName}\nTimestamp: ${now.toIso8601String()}\nDuration: $formattedDuration\nStatus: Verified On-Camera Session';
    notifyListeners();
    return _lastEvidenceSnapshot!;
  }

  void endCall() {
    _timer?.cancel();
    _isCalling = false;
    _isConnected = false;
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
    super.dispose();
  }
}
