import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/notification_model.dart';
import '../../viewmodels/notification_viewmodel.dart';
import '../../viewmodels/inspection_viewmodel.dart';
import '../inspection/inspection_detail_view.dart';

class NotificationCenterView extends StatelessWidget {
  const NotificationCenterView({super.key});

  @override
  Widget build(BuildContext context) {
    final notifVM = context.watch<NotificationViewModel>();
    final inspVM = context.read<InspectionViewModel>();
    final notifications = notifVM.filteredNotifications;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications Hub'),
        actions: [
          if (notifVM.unreadCount > 0)
            TextButton(
              onPressed: () => notifVM.markAllAsRead(),
              child: const Text(
                'Mark all read',
                style: TextStyle(color: Colors.white),
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Categories
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', 'Critical', 'Inspection', 'CCTV', 'Compliance'].map((cat) {
                  final isSelected = notifVM.selectedCategory == cat;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8.0),
                    child: ChoiceChip(
                      label: Text(cat),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      onSelected: (_) => notifVM.setCategory(cat),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const Divider(height: 1, color: AppColors.borderLight),

          // Notifications List
          Expanded(
            child: notifications.isEmpty
                ? const Center(
                    child: Text('No notifications in this category.'),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifications.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = notifications[index];
                      return _buildNotificationCard(context, item, notifVM, inspVM);
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotificationCard(
    BuildContext context,
    NotificationModel item,
    NotificationViewModel notifVM,
    InspectionViewModel inspVM,
  ) {
    Color iconColor;
    IconData icon;

    switch (item.category) {
      case 'critical':
        iconColor = AppColors.alertRed;
        icon = Icons.warning_amber_rounded;
        break;
      case 'inspection':
        iconColor = AppColors.saffron;
        icon = Icons.fact_check;
        break;
      case 'cctv':
        iconColor = AppColors.primary;
        icon = Icons.videocam;
        break;
      default:
        iconColor = AppColors.emeraldGreen;
        icon = Icons.verified;
    }

    return InkWell(
      onTap: () {
        notifVM.markAsRead(item.id);
        if (item.category == 'inspection' && item.relatedId != null) {
          final duty = inspVM.duties.where((d) => d.id == item.relatedId).firstOrNull;
          if (duty != null) {
            inspVM.selectDuty(duty);
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => InspectionDetailView(duty: duty)),
            );
          }
        }
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: item.isRead ? Colors.white : AppColors.primary.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: item.isRead ? AppColors.borderLight : AppColors.primary.withValues(alpha: 0.4),
            width: item.isRead ? 1 : 1.5,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          item.title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      if (!item.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    item.message,
                    style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, height: 1.35),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.timestamp,
                    style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
