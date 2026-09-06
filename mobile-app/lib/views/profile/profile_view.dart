import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../data/models/user_model.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../auth/role_selection_screen.dart';

class ProfileView extends StatefulWidget {
  const ProfileView({super.key});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  bool _biometricEnabled = true;
  bool _notificationsEnabled = true;
  String _language = 'English';

  @override
  Widget build(BuildContext context) {
    final authVM = context.watch<AuthViewModel>();
    final user = authVM.currentUser ??
        const UserModel(
          id: 'USR-DEFAULT',
          name: 'Official Officer',
          designation: 'Department Official',
          department: 'DoSJE',
          email: 'officer@gov.in',
          phone: '+91 99999 99999',
          role: UserRole.official,
          employeeCode: 'DOSJE-000',
        );

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Government Officer Digital ID Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.primaryDark, AppColors.primary, Color(0xFF283593)],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.account_balance, color: AppColors.saffron, size: 24),
                        SizedBox(width: 8),
                        Text(
                          'GOVERNMENT OF INDIA',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        user.role.badgeText,
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 30,
                      backgroundColor: Colors.white,
                      child: Text(
                        user.name.substring(0, 1),
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.name,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            user.designation,
                            style: const TextStyle(fontSize: 12, color: Colors.white70),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Code: ${user.employeeCode}',
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.saffron,
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1, color: Colors.white24),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      user.email,
                      style: const TextStyle(fontSize: 11, color: Colors.white70),
                    ),
                    Row(
                      children: [
                        const Icon(Icons.qr_code, color: Colors.white, size: 20),
                        const SizedBox(width: 4),
                        Text(
                          'ID VERIFIED',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Colors.green.shade300,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Demo Stakeholder Switcher
          const Text(
            'Demonstration Role Switcher',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Switch personas to inspect features from each stakeholder\'s perspective.',
            style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                _buildRoleOption(
                  title: 'DoSJE Official (HQ Monitoring)',
                  subtitle: 'Access full surveillance grid & AI analytics',
                  role: UserRole.official,
                  authVM: authVM,
                  icon: Icons.admin_panel_settings,
                ),
                const Divider(height: 1, color: AppColors.borderLight),
                _buildRoleOption(
                  title: 'PMU Inspection Officer (Field Audits)',
                  subtitle: 'Geofenced audits, checklist, live photo capture',
                  role: UserRole.inspector,
                  authVM: authVM,
                  icon: Icons.fact_check,
                ),
                const Divider(height: 1, color: AppColors.borderLight),
                _buildRoleOption(
                  title: 'Institute / NGO Incharge',
                  subtitle: 'CCTV streaming health, attendance logs, VC standby',
                  role: UserRole.institute,
                  authVM: authVM,
                  icon: Icons.school,
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Preferences & Settings
          const Text(
            'System & Security Settings',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.fingerprint, color: AppColors.primary),
                  title: const Text('Biometric Quick Access', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  trailing: Switch(
                    value: _biometricEnabled,
                    activeThumbColor: AppColors.primary,
                    onChanged: (val) => setState(() => _biometricEnabled = val),
                  ),
                ),
                const Divider(height: 1, color: AppColors.borderLight),
                ListTile(
                  leading: const Icon(Icons.notifications_active_outlined, color: AppColors.saffron),
                  title: const Text('Surprise Inspection Push Alerts', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  trailing: Switch(
                    value: _notificationsEnabled,
                    activeThumbColor: AppColors.saffron,
                    onChanged: (val) => setState(() => _notificationsEnabled = val),
                  ),
                ),
                const Divider(height: 1, color: AppColors.borderLight),
                ListTile(
                  leading: const Icon(Icons.language, color: AppColors.emeraldGreen),
                  title: const Text('App Language', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                  trailing: DropdownButton<String>(
                    value: _language,
                    underline: const SizedBox(),
                    items: const [
                      DropdownMenuItem(value: 'English', child: Text('English')),
                      DropdownMenuItem(value: 'Hindi', child: Text('हिन्दी')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _language = val);
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // Logout Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: OutlinedButton.icon(
              onPressed: () async {
                await authVM.logout();
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const RoleSelectionScreen()),
                    (route) => false,
                  );
                }
              },
              icon: const Icon(Icons.logout, color: AppColors.alertRed),
              label: const Text('Log Out / Switch User', style: TextStyle(color: AppColors.alertRed, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.alertRed),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // App Build Info Footer
          const Center(
            child: Text(
              '${AppStrings.appName} v1.0.0 (Build 2026.1)\nMinistry of Social Justice and Empowerment',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.4),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildRoleOption({
    required String title,
    required String subtitle,
    required UserRole role,
    required AuthViewModel authVM,
    required IconData icon,
  }) {
    final isSelected = authVM.selectedRole == role;

    return ListTile(
      leading: Icon(icon, color: isSelected ? AppColors.primary : Colors.grey),
      title: Text(title, style: TextStyle(fontSize: 13, fontWeight: isSelected ? FontWeight.bold : FontWeight.w500)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: AppColors.textSecondaryLight)),
      trailing: isSelected
          ? const Icon(Icons.check_circle, color: AppColors.primary)
          : const Icon(Icons.radio_button_unchecked, color: Colors.grey),
      onTap: () {
        authVM.switchDemoRole(role);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Switched view to ${role.displayName}'),
            backgroundColor: AppColors.primaryLight,
            duration: const Duration(seconds: 1),
          ),
        );
      },
    );
  }
}
