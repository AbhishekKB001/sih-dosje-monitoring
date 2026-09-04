import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/inspection_duty_model.dart';
import '../../viewmodels/inspection_viewmodel.dart';
import '../../widgets/geofence_status_card.dart';
import 'inspection_form_wizard_view.dart';
import 'inspection_report_view.dart';

class InspectionDetailView extends StatelessWidget {
  final InspectionDutyModel duty;

  const InspectionDetailView({super.key, required this.duty});

  @override
  Widget build(BuildContext context) {
    final inspVM = context.watch<InspectionViewModel>();
    final activeDuty = inspVM.selectedDuty ?? duty;
    final isCompleted = activeDuty.status == 'completed';
    final isUnlocked = activeDuty.isGeofenceReached;

    return Scaffold(
      appBar: AppBar(
        title: Text(activeDuty.dutyCode),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Share Duty Memo',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Duty memo copied to clipboard.')),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Target Institute Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderLight),
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
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          activeDuty.schemeName,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isCompleted ? Colors.green.shade50 : Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isCompleted ? 'COMPLETED' : 'SURPRISE AUDIT',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isCompleted ? AppColors.emeraldGreen : AppColors.alertAmber,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    activeDuty.instituteName,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 16, color: AppColors.textSecondaryLight),
                      SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          'Plot 42, Hoshangabad Road, Industrial Area, Bhopal, MP',
                          style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.people_alt_outlined, size: 16, color: AppColors.textSecondaryLight),
                      const SizedBox(width: 4),
                      Text(
                        'Enrolled Strength: ${activeDuty.reportedBeneficiaries} Beneficiaries',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: AppColors.borderLight),
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Assigned Inspector', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                          Text(activeDuty.inspectorName, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('Audit Deadline', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                          const Text('Within 4 Hours', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.alertRed)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // AI Risk Reasoning Alert
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.red.shade200),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.crisis_alert, color: Colors.red.shade700, size: 22),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'AI Risk Flag & Reason for Surprise Audit',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          activeDuty.riskReason,
                          style: TextStyle(fontSize: 12, color: Colors.red.shade900, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Geofence Card
            if (!isCompleted)
              GeofenceStatusCard(
                targetLat: activeDuty.targetLat,
                targetLng: activeDuty.targetLng,
                currentDistanceMeters: activeDuty.currentDistanceMeters,
                isUnlocked: isUnlocked,
                onSimulateArrival: () {
                  inspVM.simulateArrivalAtGeofence(activeDuty.id);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('GPS Proximity Verified: You are 45m from site! Geofence Unlocked.'),
                      backgroundColor: AppColors.emeraldGreen,
                    ),
                  );
                },
              ),
            const SizedBox(height: 16),

            // Mandatory Audit Checkpoints Preview
            const Text(
              'Statutory Checkpoints',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: activeDuty.checklist.length,
              separatorBuilder: (_, _) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final item = activeDuty.checklist[index];
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        item.isCompliant ? Icons.check_circle : Icons.warning_amber,
                        color: item.isCompliant ? AppColors.emeraldGreen : AppColors.alertAmber,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          item.title,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ),
                      if (item.requiresPhoto)
                        const Icon(Icons.camera_alt_outlined, size: 16, color: AppColors.primary),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 24),

            // Action Button (Unlocked vs Locked vs Completed)
            SizedBox(
              width: double.infinity,
              height: 50,
              child: isCompleted
                  ? ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => InspectionReportView(duty: activeDuty),
                          ),
                        );
                      },
                      icon: const Icon(Icons.description),
                      label: const Text('View Signed Inspection Report'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.emeraldGreen,
                      ),
                    )
                  : ElevatedButton.icon(
                      onPressed: isUnlocked
                          ? () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (_) => const InspectionFormWizardView(),
                                ),
                              );
                            }
                          : null,
                      icon: Icon(isUnlocked ? Icons.play_arrow : Icons.lock),
                      label: Text(
                        isUnlocked ? 'Begin Field Audit Checklist' : 'Locked (Requires On-Site Geofence)',
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isUnlocked ? AppColors.primary : Colors.grey,
                      ),
                    ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }
}
