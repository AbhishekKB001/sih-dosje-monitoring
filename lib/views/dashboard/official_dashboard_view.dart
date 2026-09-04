import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../viewmodels/dashboard_viewmodel.dart';
import '../../viewmodels/cctv_viewmodel.dart';
import '../../viewmodels/inspection_viewmodel.dart';
import '../../widgets/stat_metric_card.dart';
import '../../widgets/live_cctv_card.dart';
import '../cctv/cctv_player_view.dart';
import '../video_call/random_vc_screen.dart';

class OfficialDashboardView extends StatelessWidget {
  final Function(int) onNavigateTab;

  const OfficialDashboardView({super.key, required this.onNavigateTab});

  @override
  Widget build(BuildContext context) {
    final dashVM = context.watch<DashboardViewModel>();
    final cctvVM = context.watch<CCTVViewModel>();
    final inspVM = context.watch<InspectionViewModel>();

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Scheme Filter Horizontal Chips
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: AppStrings.schemes.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final scheme = AppStrings.schemes[index];
                final isSelected = dashVM.selectedScheme == scheme;
                return ChoiceChip(
                  label: Text(scheme),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  ),
                  backgroundColor: Colors.white,
                  side: BorderSide(
                    color: isSelected ? AppColors.primary : AppColors.borderLight,
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      dashVM.setSelectedScheme(scheme);
                    }
                  },
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // National / State Metric KPI Grid
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.35,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            children: [
              StatMetricCard(
                title: 'Total Institutes',
                value: '${dashVM.totalInstitutes}',
                subtitle: '${dashVM.totalBeneficiaries} Beneficiaries',
                icon: Icons.apartment,
                color: AppColors.primary,
                onTap: () {},
              ),
              StatMetricCard(
                title: 'Active CCTVs',
                value: '${dashVM.activeCCTVCount}/${dashVM.totalCCTVCount}',
                subtitle: '${dashVM.totalCCTVCount - dashVM.activeCCTVCount} Offline/Tampered',
                icon: Icons.videocam,
                color: AppColors.emeraldGreen,
                onTap: () => onNavigateTab(1), // Switch to CCTV Tab
              ),
              StatMetricCard(
                title: 'Surprise Audits',
                value: '${dashVM.pendingInspectionsCount}',
                subtitle: '${dashVM.completedInspectionsCount} Completed this week',
                icon: Icons.fact_check,
                color: AppColors.saffron,
                onTap: () => onNavigateTab(2), // Switch to Inspections Tab
              ),
              StatMetricCard(
                title: 'AI Anomaly Flags',
                value: '${dashVM.activeAnomalies.length}',
                subtitle: '${dashVM.criticalAnomaliesCount} Critical alerts',
                icon: Icons.warning_amber_rounded,
                color: AppColors.alertRed,
                isAlert: dashVM.criticalAnomaliesCount > 0,
                onTap: () => onNavigateTab(3), // Switch to Anomalies Tab
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Quick Action Hub for Ministry Officials
          const Text(
            'Quick Governance Actions',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimaryLight,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              // Random AI Inspection Trigger Button
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () async {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('AI Engine is evaluating risk factors across institutes...'),
                        duration: Duration(milliseconds: 1000),
                      ),
                    );
                    final newDuty = await inspVM.triggerAIAssignment();
                    if (context.mounted) {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Row(
                            children: [
                              Icon(Icons.auto_awesome, color: AppColors.saffron),
                              SizedBox(width: 8),
                              Text('Surprise Duty Assigned!'),
                            ],
                          ),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Duty Code: ${newDuty.dutyCode}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              const SizedBox(height: 6),
                              Text('Target: ${newDuty.instituteName}'),
                              const SizedBox(height: 4),
                              Text('Assigned To: ${newDuty.inspectorName}'),
                              const SizedBox(height: 6),
                              Text('Reason: ${newDuty.riskReason}', style: const TextStyle(color: AppColors.alertRed, fontSize: 12)),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () {
                                Navigator.pop(ctx);
                                onNavigateTab(2); // View in Inspections tab
                              },
                              child: const Text('View in Inspections'),
                            ),
                            ElevatedButton(
                              onPressed: () => Navigator.pop(ctx),
                              child: const Text('Dismiss'),
                            ),
                          ],
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.auto_awesome, size: 18, color: AppColors.saffron),
                  label: const Text('Assign Surprise Duty'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Random VC Dialer Button
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const RandomVcScreen(),
                      ),
                    );
                  },
                  icon: const Icon(Icons.video_call, color: AppColors.emeraldGreen, size: 20),
                  label: const Text('Random VC Audit'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: AppColors.emeraldGreen, width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Live CCTV Surveillance Strip
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.camera_indoor, color: AppColors.primary, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Surveillance Wall Preview',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimaryLight,
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: () => onNavigateTab(1),
                child: const Text('View All (7)'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SizedBox(
            height: 170,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: cctvVM.feeds.take(4).length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final feed = cctvVM.feeds[index];
                return SizedBox(
                  width: 240,
                  child: LiveCCTVCard(
                    feed: feed,
                    onTap: () {
                      cctvVM.setActiveFeed(feed);
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => CCTVPlayerView(feed: feed),
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 24),

          // Real-time AI Anomaly Activity Feed
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.crisis_alert, color: AppColors.alertRed, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'Real-time Anomaly Stream',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimaryLight,
                    ),
                  ),
                ],
              ),
              TextButton(
                onPressed: () => onNavigateTab(3),
                child: const Text('All Alerts'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: dashVM.activeAnomalies.take(3).length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final anom = dashVM.activeAnomalies[index];
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: anom.severity == 'critical' ? AppColors.alertRed.withValues(alpha: 0.3) : AppColors.borderLight,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: anom.severity == 'critical'
                            ? AppColors.alertRed.withValues(alpha: 0.12)
                            : AppColors.alertAmber.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(
                        anom.severity == 'critical' ? Icons.error : Icons.warning_amber_rounded,
                        color: anom.severity == 'critical' ? AppColors.alertRed : AppColors.alertAmber,
                        size: 20,
                      ),
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
                                  anom.title,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              Text(
                                anom.timestamp.split('(').first.trim(),
                                style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            anom.instituteName,
                            style: const TextStyle(
                              fontSize: 11,
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            anom.description,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.textSecondaryLight,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}
