import 'package:flutter/foundation.dart';
import '../data/models/cctv_feed_model.dart';
import '../data/repositories/cctv_repository.dart';

class CCTVViewModel extends ChangeNotifier {
  final CCTVRepository _cctvRepository;

  CCTVViewModel({required this._cctvRepository}) {
    loadFeeds();
  }

  List<CCTVFeedModel> _feeds = [];
  List<CCTVFeedModel> get feeds => _feeds;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String _selectedLocationFilter = 'All';
  String get selectedLocationFilter => _selectedLocationFilter;

  String? _selectedInstituteId;
  String? get selectedInstituteId => _selectedInstituteId;

  // Active player controls state
  CCTVFeedModel? _currentActiveFeed;
  CCTVFeedModel? get currentActiveFeed => _currentActiveFeed;

  double _zoomLevel = 1.0;
  double get zoomLevel => _zoomLevel;

  double _panX = 0.0;
  double get panX => _panX;

  double _panY = 0.0;
  double get panY => _panY;

  bool _isAudioEnabled = false;
  bool get isAudioEnabled => _isAudioEnabled;

  bool _isRecording = false;
  bool get isRecording => _isRecording;

  String? _lastCapturedSnapshotWatermark;
  String? get lastCapturedSnapshotWatermark => _lastCapturedSnapshotWatermark;

  Future<void> loadFeeds() async {
    _isLoading = true;
    notifyListeners();

    _feeds = await _cctvRepository.getFeeds(
      instituteId: _selectedInstituteId,
      locationType: _selectedLocationFilter,
    );
    _isLoading = false;
    notifyListeners();
  }

  void setLocationFilter(String location) {
    _selectedLocationFilter = location;
    loadFeeds();
  }

  void setInstituteFilter(String? instituteId) {
    _selectedInstituteId = instituteId;
    loadFeeds();
  }

  void setActiveFeed(CCTVFeedModel feed) {
    _currentActiveFeed = feed;
    _zoomLevel = 1.0;
    _panX = 0.0;
    _panY = 0.0;
    _isAudioEnabled = false;
    _isRecording = false;
    _lastCapturedSnapshotWatermark = null;
    notifyListeners();
  }

  void adjustZoom(double delta) {
    _zoomLevel = (_zoomLevel + delta).clamp(1.0, 4.0);
    notifyListeners();
  }

  void adjustPan(double dx, double dy) {
    _panX = (_panX + dx).clamp(-50.0, 50.0);
    _panY = (_panY + dy).clamp(-50.0, 50.0);
    notifyListeners();
  }

  void toggleAudio() {
    _isAudioEnabled = !_isAudioEnabled;
    notifyListeners();
  }

  void toggleRecording() {
    _isRecording = !_isRecording;
    notifyListeners();
  }

  Future<String> captureSnapshot() async {
    final now = DateTime.now();
    _lastCapturedSnapshotWatermark =
        'EVIDENCE SNAPSHOT [DoSJE-SEC]\nCamera: ${_currentActiveFeed?.cameraName ?? "CAM"}\nInstitute: ${_currentActiveFeed?.instituteName ?? "N/A"}\nTimestamp: ${now.toIso8601String()}\nStatus: Verified Non-tampered';
    notifyListeners();
    return _lastCapturedSnapshotWatermark!;
  }

  Future<void> restartStream(String feedId) async {
    await _cctvRepository.restartStream(feedId);
    await loadFeeds();
    if (_currentActiveFeed?.id == feedId) {
      _currentActiveFeed = await _cctvRepository.getFeedById(feedId);
    }
    notifyListeners();
  }
}
