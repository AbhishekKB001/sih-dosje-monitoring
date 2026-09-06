import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/anomaly_model.dart';
import '../../viewmodels/dashboard_viewmodel.dart';
import '../../viewmodels/inspection_viewmodel.dart';
import '../video_call/random_vc_screen.dart';

class AnomalyAlertsView extends StatefulWidget {
  const AnomalyAlertsView({super.key});

  @override
  State<AnomalyAlertsView> createState() => _AnomalyAlertsViewState();
}

class _AnomalyAlertsViewState extends State<AnomalyAlertsView> {
  String _severityFilter = 'All';

  @override
  Widget build(BuildContext context) {
    final dashVM = context.watch<DashboardViewModel>();
    final inspVM = context.watch<InspectionViewModel>();

    var anomalies = dashVM.activeAnomalies;
    if (_severityFilter != 'All') {
      anomalies = anomalies.where((a) => a.severity.toLowerCase() == _severityFilter.toLowerCase()).toList();
    }

    return Column(
      children: [
        // Filter Chips
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: [
              const Text('Severity:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(width: 8),
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: ['All', 'Critical', 'Warning', 'Info'].map((sev) {
                      final isSelected = _severityFilter == sev;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6.0),
                        child: ChoiceChip(
                          label: Text(sev),
                          selected: isSelected,
                          selectedColor: sev == 'Critical' ? AppColors.alertRed : AppColors.primary,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                          onSelected: (_) {
                            setState(() {
                              _severityFilter = sev;
                            });
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, color: AppColors.borderLight),

        // Anomaly List
        Expanded(
          child: anomalies.isEmpty
              ? const Center(
                  child: Text('No active anomalies detected in this category.'),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: anomalies.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 12),
                  itemBuilder: (context, index) {
                    final anom = anomalies[index];
                    return _buildAnomalyCard(context, anom, dashVM, inspVM);
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildAnomalyCard(
    BuildContext context,
    AnomalyModel anom,
    DashboardViewModel dashVM,
    InspectionViewModel inspVM,
  ) {
    Color sevColor;
    switch (anom.severity) {
      case 'critical':
        sevColor = AppColors.alertRed;
        break;
      case 'warning':
        sevColor = AppColors.alertAmber;
        break;
      default:
        sevColor = AppColors.infoBlue;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: sevColor.withValues(alpha: 0.4), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: sevColor.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 3),
          ),
        ],
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
                  color: sevColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      anom.severity == 'critical' ? Icons.error : Icons.warning_amber,
                      color: sevColor,
                      size: 14,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      anom.severity.toUpperCase(),
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: sevColor,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                anom.timestamp,
                style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            anom.title,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 2),
          Text(
            '${anom.instituteName} • ${anom.scheme}',
            style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            anom.description,
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, height: 1.35),
          ),
          if (anom.recommendedAction != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.psychology, size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'AI Recommendation: ${anom.recommendedAction}',
                      style: TextStyle(fontSize: 11, color: Colors.brown.shade900, fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 14),

          // Action Buttons
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    dashVM.resolveAnomaly(anom.id);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Anomaly marked as investigated and resolved.')),
                    );
                  },
                  icon: const Icon(Icons.check, size: 16),
                  label: const Text('Mark Resolved', style: TextStyle(fontSize: 11)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const RandomVcScreen()),
                    );
                  },
                  icon: const Icon(Icons.video_call, size: 16),
                  label: const Text('Surprise VC', style: TextStyle(fontSize: 11)),
                  style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
