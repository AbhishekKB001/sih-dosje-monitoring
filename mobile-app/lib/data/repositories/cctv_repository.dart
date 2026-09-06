import '../models/cctv_feed_model.dart';
import '../services/api_service.dart';
import '../../core/constants/mock_data.dart';

class CCTVRepository {
  final List<CCTVFeedModel> _feeds = List.from(MockData.cctvFeeds);
  final ApiService _api = ApiService();

  Future<List<CCTVFeedModel>> getFeeds({
    String? instituteId,
    String? locationType,
    bool? isLiveOnly,
  }) async {
    try {
      final liveCams = await _api.getCameras();
      if (liveCams.isNotEmpty) {
        for (final cam in liveCams) {
          final idx = _feeds.indexWhere((f) => f.cameraCode == cam.cameraCode || f.id == cam.id);
          if (idx != -1) {
            _feeds[idx] = cam;
          } else {
            _feeds.add(cam);
          }
        }
      }
    } catch (_) {}

    await Future.delayed(const Duration(milliseconds: 150));
    List<CCTVFeedModel> result = List.from(_feeds);

    if (instituteId != null && instituteId.isNotEmpty) {
      result = result.where((f) => f.instituteId == instituteId).toList();
    }
    if (locationType != null && locationType != 'All') {
      result = result.where((f) => f.locationType == locationType).toList();
    }
    if (isLiveOnly == true) {
      result = result.where((f) => f.isLive).toList();
    }
    return result;
  }

  Future<CCTVFeedModel?> getFeedById(String feedId) async {
    await Future.delayed(const Duration(milliseconds: 100));
    try {
      return _feeds.firstWhere((f) => f.id == feedId || f.cameraCode == feedId);
    } catch (_) {
      return null;
    }
  }

  Future<void> restartStream(String feedId) async {
    await Future.delayed(const Duration(milliseconds: 400));
    final index = _feeds.indexWhere((f) => f.id == feedId || f.cameraCode == feedId);
    if (index != -1) {
      final feed = _feeds[index];
      _feeds[index] = feed.copyWith(
        isLive: true,
        isObstructed: false,
        fps: 25,
        resolution: '1080p FHD',
        streamTimestamp: 'LIVE - Recovered',
      );
    }
  }
}
