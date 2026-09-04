import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/constants/app_colors.dart';
import '../data/models/user_model.dart';
import '../viewmodels/auth_viewmodel.dart';
import '../viewmodels/notification_viewmodel.dart';
import '../views/notifications/notification_center_view.dart';

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final bool showRoleSwitcher;
  final List<Widget>? actions;

  const CustomAppBar({
    super.key,
    required this.title,
    this.showRoleSwitcher = true,
    this.actions,
  });

  @override
  Size get preferredSize => const Size.fromHeight(64);

  @override
  Widget build(BuildContext context) {
    final authVM = context.watch<AuthViewModel>();
    final notifVM = context.watch<NotificationViewModel>();
    final currentRole = authVM.selectedRole;

    return AppBar(
      titleSpacing: 16,
      title: Row(
        children: [
          // Government Ashoka / Emblem Badge Simulation
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.saffron, width: 1.5),
            ),
            child: const Icon(
              Icons.account_balance,
              color: AppColors.primary,
              size: 20,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.2,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  'DoSJE Gov • ${currentRole.badgeText}',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w400,
                    color: Colors.white70,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        if (showRoleSwitcher)
          PopupMenuButton<UserRole>(
            tooltip: 'Switch Demo Persona',
            icon: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white24),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.swap_horiz, size: 16, color: Colors.white),
                  const SizedBox(width: 4),
                  Text(
                    currentRole.badgeText,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
            onSelected: (role) {
              authVM.switchDemoRole(role);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Switched view to: ${role.displayName}'),
                  duration: const Duration(seconds: 2),
                  behavior: SnackBarBehavior.floating,
                  backgroundColor: AppColors.primaryLight,
                ),
              );
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: UserRole.official,
                child: Row(
                  children: [
                    Icon(Icons.admin_panel_settings, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text('DoSJE Official (HQ)'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: UserRole.inspector,
                child: Row(
                  children: [
                    Icon(Icons.fact_check, color: AppColors.emeraldGreen),
                    SizedBox(width: 8),
                    Text('PMU Inspection Officer'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: UserRole.institute,
                child: Row(
                  children: [
                    Icon(Icons.school, color: AppColors.saffron),
                    SizedBox(width: 8),
                    Text('NGO / Institute Incharge'),
                  ],
                ),
              ),
            ],
          ),
        IconButton(
          tooltip: 'Notifications',
          icon: Stack(
            clipBehavior: Clip.none,
            children: [
              const Icon(Icons.notifications_outlined, color: Colors.white),
              if (notifVM.unreadCount > 0)
                Positioned(
                  top: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppColors.alertRed,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '${notifVM.unreadCount}',
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const NotificationCenterView()),
            );
          },
        ),
        ...?actions,
        const SizedBox(width: 4),
      ],
    );
  }
}
