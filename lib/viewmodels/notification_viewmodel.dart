import 'package:flutter/foundation.dart';
import '../data/models/notification_model.dart';
import '../data/repositories/notification_repository.dart';

class NotificationViewModel extends ChangeNotifier {
  final NotificationRepository _notificationRepository;

  NotificationViewModel({required this._notificationRepository}) {
    loadNotifications();
  }

  List<NotificationModel> _notifications = [];
  List<NotificationModel> get notifications => _notifications;

  String _selectedCategory = 'All';
  String get selectedCategory => _selectedCategory;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  int get unreadCount => _notificationRepository.unreadCount;

  Future<void> loadNotifications() async {
    _isLoading = true;
    notifyListeners();

    _notifications = await _notificationRepository.getNotifications();
    _isLoading = false;
    notifyListeners();
  }

  void setCategory(String category) {
    _selectedCategory = category;
    notifyListeners();
  }

  List<NotificationModel> get filteredNotifications {
    if (_selectedCategory == 'All') return _notifications;
    return _notifications.where((n) => n.category.toLowerCase() == _selectedCategory.toLowerCase()).toList();
  }

  void markAsRead(String id) {
    _notificationRepository.markAsRead(id);
    _notifications = _notificationRepository.notifications;
    notifyListeners();
  }

  void markAllAsRead() {
    _notificationRepository.markAllAsRead();
    _notifications = _notificationRepository.notifications;
    notifyListeners();
  }
}
