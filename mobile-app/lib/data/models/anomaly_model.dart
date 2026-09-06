class AnomalyModel {
  final String id;
  final String title;
  final String instituteId;
  final String instituteName;
  final String scheme;
  final String type; // 'cctv_blackout', 'proxy_attendance', 'headcount_mismatch', 'geofence_breach', 'unauthorized_absence'
  final String severity; // 'critical', 'warning', 'info'
  final String timestamp;
  final String description;
  final bool isResolved;
  final String? recommendedAction;

  const AnomalyModel({
    required this.id,
    required this.title,
    required this.instituteId,
    required this.instituteName,
    required this.scheme,
    required this.type,
    required this.severity,
    required this.timestamp,
    required this.description,
    this.isResolved = false,
    this.recommendedAction,
  });

  AnomalyModel copyWith({
    String? id,
    String? title,
    String? instituteId,
    String? instituteName,
    String? scheme,
    String? type,
    String? severity,
    String? timestamp,
    String? description,
    bool? isResolved,
    String? recommendedAction,
  }) {
    return AnomalyModel(
      id: id ?? this.id,
      title: title ?? this.title,
      instituteId: instituteId ?? this.instituteId,
      instituteName: instituteName ?? this.instituteName,
      scheme: scheme ?? this.scheme,
      type: type ?? this.type,
      severity: severity ?? this.severity,
      timestamp: timestamp ?? this.timestamp,
      description: description ?? this.description,
      isResolved: isResolved ?? this.isResolved,
      recommendedAction: recommendedAction ?? this.recommendedAction,
    );
  }
}
