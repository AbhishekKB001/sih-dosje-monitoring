import '../models/notification_model.dart';
import '../../core/constants/mock_data.dart';

class NotificationRepository {
  List<NotificationModel> _notifications = List.from(MockData.notifications);

  List<NotificationModel> get notifications => List.unmodifiable(_notifications);

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<List<NotificationModel>> getNotifications() async {
    await Future.delayed(const Duration(milliseconds: 200));
    return _notifications;
  }

  void markAsRead(String id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1) {
      _notifications[index] = _notifications[index].copyWith(isRead: true);
    }
  }

  void markAllAsRead() {
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
  }

  void addNotification(NotificationModel notification) {
    _notifications.insert(0, notification);
  }
}
