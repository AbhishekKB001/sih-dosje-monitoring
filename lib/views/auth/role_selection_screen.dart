import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../data/models/user_model.dart';
import '../../viewmodels/auth_viewmodel.dart';
import 'login_screen.dart';
import '../dashboard/main_navigation_screen.dart';

class RoleSelectionScreen extends StatelessWidget {
  const RoleSelectionScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authVM = context.watch<AuthViewModel>();

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.shield, color: AppColors.primary, size: 28),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppStrings.appName,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      Text(
                        'Select Your Stakeholder Role',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondaryLight,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 24),
              const Text(
                'Welcome to DoSJE Inspection Portal',
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimaryLight,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Please choose your access level to enter the centralized surveillance, surprise audit, and AI anomaly network.',
                style: TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondaryLight,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 24),

              // 1. DoSJE Official Card
              _buildRoleCard(
                context: context,
                role: UserRole.official,
                title: 'DoSJE Official (Central / State HQ)',
                subtitle: 'Real-time CCTV grid, AI anomaly heatmaps, random inspection triggers, and VC dialer.',
                icon: Icons.admin_panel_settings,
                color: AppColors.primary,
                isSelected: authVM.selectedRole == UserRole.official,
                onTap: () => authVM.selectRole(UserRole.official),
              ),
              const SizedBox(height: 16),

              // 2. PMU Inspection Officer Card
              _buildRoleCard(
                context: context,
                role: UserRole.inspector,
                title: 'PMU Inspection Officer (Field Audits)',
                subtitle: 'Surprise inspection duties, live GPS geofence unlock, watermarked photos, and digital sign-off.',
                icon: Icons.fact_check,
                color: AppColors.emeraldGreen,
                isSelected: authVM.selectedRole == UserRole.inspector,
                onTap: () => authVM.selectRole(UserRole.inspector),
              ),
              const SizedBox(height: 16),

              // 3. Institute / NGO Incharge Card
              _buildRoleCard(
                context: context,
                role: UserRole.institute,
                title: 'Institute / NGO Incharge',
                subtitle: 'CCTV streaming health, daily biometric attendance verification, and surprise VC response.',
                icon: Icons.school,
                color: AppColors.saffron,
                isSelected: authVM.selectedRole == UserRole.institute,
                onTap: () => authVM.selectRole(UserRole.institute),
              ),
              const SizedBox(height: 32),

              // Continue Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const LoginScreen(),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Proceed as ${authVM.selectedRole.badgeText}'),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward, size: 18),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Fast Demo Skip Button
              Center(
                child: TextButton.icon(
                  onPressed: () {
                    authVM.switchDemoRole(authVM.selectedRole);
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(
                        builder: (_) => const MainNavigationScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.bolt, size: 18, color: AppColors.saffron),
                  label: const Text(
                    'Instant Demo Access (Bypass Login)',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleCard({
    required BuildContext context,
    required UserRole role,
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.06) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? color : AppColors.borderLight,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? color : AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected ? color : Colors.grey.shade400,
                            width: 2,
                          ),
                        ),
                        child: isSelected
                            ? Center(
                                child: Container(
                                  width: 12,
                                  height: 12,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: color,
                                  ),
                                ),
                              )
                            : null,
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.textSecondaryLight,
                      height: 1.3,
                    ),
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
