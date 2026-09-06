class NotificationModel {
  final String id;
  final String title;
  final String message;
  final String timestamp;
  final String category; // 'critical', 'inspection', 'cctv', 'compliance'
  final bool isRead;
  final String? deepLinkRoute;
  final String? relatedId;

  const NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.category,
    this.isRead = false,
    this.deepLinkRoute,
    this.relatedId,
  });

  NotificationModel copyWith({
    String? id,
    String? title,
    String? message,
    String? timestamp,
    String? category,
    bool? isRead,
    String? deepLinkRoute,
    String? relatedId,
  }) {
    return NotificationModel(
      id: id ?? this.id,
      title: title ?? this.title,
      message: message ?? this.message,
      timestamp: timestamp ?? this.timestamp,
      category: category ?? this.category,
      isRead: isRead ?? this.isRead,
      deepLinkRoute: deepLinkRoute ?? this.deepLinkRoute,
      relatedId: relatedId ?? this.relatedId,
    );
  }
}
