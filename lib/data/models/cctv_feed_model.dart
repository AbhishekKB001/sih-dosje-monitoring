class CCTVFeedModel {
  final String id;
  final String cameraName;
  final String instituteId;
  final String instituteName;
  final String locationType; // 'Main Gate', 'Dining Hall', 'Dormitory', 'Classroom', 'Office'
  final bool isLive;
  final int fps;
  final int currentOccupancy;
  final bool isObstructed;
  final String resolution;
  final List<String> aiTags;
  final String streamTimestamp;
  final bool motionDetected;

  const CCTVFeedModel({
    required this.id,
    required this.cameraName,
    required this.instituteId,
    required this.instituteName,
    required this.locationType,
    this.isLive = true,
    this.fps = 25,
    this.currentOccupancy = 0,
    this.isObstructed = false,
    this.resolution = '1080p FHD',
    this.aiTags = const [],
    required this.streamTimestamp,
    this.motionDetected = true,
  });

  CCTVFeedModel copyWith({
    String? id,
    String? cameraName,
    String? instituteId,
    String? instituteName,
    String? locationType,
    bool? isLive,
    int? fps,
    int? currentOccupancy,
    bool? isObstructed,
    String? resolution,
    List<String>? aiTags,
    String? streamTimestamp,
    bool? motionDetected,
  }) {
    return CCTVFeedModel(
      id: id ?? this.id,
      cameraName: cameraName ?? this.cameraName,
      instituteId: instituteId ?? this.instituteId,
      instituteName: instituteName ?? this.instituteName,
      locationType: locationType ?? this.locationType,
      isLive: isLive ?? this.isLive,
      fps: fps ?? this.fps,
      currentOccupancy: currentOccupancy ?? this.currentOccupancy,
      isObstructed: isObstructed ?? this.isObstructed,
      resolution: resolution ?? this.resolution,
      aiTags: aiTags ?? this.aiTags,
      streamTimestamp: streamTimestamp ?? this.streamTimestamp,
      motionDetected: motionDetected ?? this.motionDetected,
    );
  }
}
