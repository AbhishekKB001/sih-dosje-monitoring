import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../widgets/stat_metric_card.dart';
import '../video_call/random_vc_screen.dart';

class InstituteDashboardView extends StatelessWidget {
  final Function(int) onNavigateTab;

  const InstituteDashboardView({super.key, required this.onNavigateTab});

  @override
  Widget build(BuildContext context) {
    final authVM = context.watch<AuthViewModel>();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // NGO Header Profile
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0D47A1), Color(0xFF1976D2)],
              ),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'DoSJE Registered NGO • NGO-REG-9914',
                        style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const Icon(Icons.verified, color: Colors.white, size: 20),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  'Asha Welfare Rehabilitation Center',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 2),
                const Text(
                  'Scheme: Nasha Mukt Bharat Abhiyaan (De-addiction)',
                  style: TextStyle(fontSize: 12, color: Colors.white70),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.person, size: 14, color: Colors.white70),
                    const SizedBox(width: 4),
                    Text(
                      'Incharge: ${authVM.currentUser?.name ?? "Ramesh Gupta"}',
                      style: const TextStyle(fontSize: 11, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
                    const Icon(Icons.location_on, size: 14, color: Colors.white70),
                    const SizedBox(width: 4),
                    const Text(
                      'Bhopal, MP',
                      style: TextStyle(fontSize: 11, color: Colors.white),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Compliance & Health KPIs
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.35,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              const StatMetricCard(
                title: 'Biometric Attendance',
                value: '65 / 65',
                subtitle: '100% Punched Today',
                icon: Icons.fingerprint,
                color: AppColors.emeraldGreen,
              ),
              StatMetricCard(
                title: 'CCTV Feeds Active',
                value: '6 / 6',
                subtitle: 'All Cameras Streaming',
                icon: Icons.videocam,
                color: AppColors.primary,
                onTap: () => onNavigateTab(1),
              ),
              const StatMetricCard(
                title: 'Surprise Audit Score',
                value: '78.5%',
                subtitle: 'Grade B+ (Satisfactory)',
                icon: Icons.grade,
                color: AppColors.saffron,
              ),
              const StatMetricCard(
                title: 'Open Grievances',
                value: '0',
                subtitle: 'All Resolved',
                icon: Icons.check_circle_outline,
                color: AppColors.emeraldGreen,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Ministry Surprise Audit Standby Banner
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.saffron, width: 1.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.saffron.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.ring_volume, color: AppColors.saffron, size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Surprise VC & Physical Audit Standby',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Central PMU may initiate a random video call or surprise inspection at any time.',
                            style: TextStyle(fontSize: 11, color: AppColors.textSecondaryLight),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const RandomVcScreen(),
                        ),
                      );
                    },
                    icon: const Icon(Icons.video_call, size: 18),
                    label: const Text('Test Video Call Hardware'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Mandatory Daily Compliance Checklist
          const Text(
            'Daily Statutory Checklist',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          _buildCheckItem(title: 'Morning Biometric Attendance Logged for All Staff & Beneficiaries', isDone: true),
          _buildCheckItem(title: 'All 6 CCTV cameras cleared of physical lens obstruction', isDone: true),
          _buildCheckItem(title: 'Kitchen sanitation & nutrition meal log updated', isDone: true),
          _buildCheckItem(title: 'Medical dispensary register signed by Visiting Doctor', isDone: false),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildCheckItem({required String title, required bool isDone}) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.borderLight),
      ),
      child: Row(
        children: [
          Icon(
            isDone ? Icons.check_circle : Icons.radio_button_unchecked,
            color: isDone ? AppColors.emeraldGreen : Colors.grey,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              title,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: isDone ? AppColors.textPrimaryLight : AppColors.textSecondaryLight,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
