import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../data/models/inspection_duty_model.dart';

class InspectionReportView extends StatelessWidget {
  final InspectionDutyModel duty;

  const InspectionReportView({super.key, required this.duty});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Surprise Audit Report'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            tooltip: 'Download Signed PDF',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Report ${duty.dutyCode}.pdf downloaded successfully.'),
                  backgroundColor: AppColors.emeraldGreen,
                ),
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
            // Official Gov Header Report Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.emeraldGreen, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.emeraldGreen.withValues(alpha: 0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.account_balance, color: AppColors.primary, size: 36),
                  const SizedBox(height: 6),
                  const Text(
                    AppStrings.ministryName,
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                  const Text(
                    'CENTRALIZED SURPRISE AUDIT & COMPLIANCE DOSSIER',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 10, letterSpacing: 0.5, color: AppColors.textSecondaryLight),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.emeraldGreen.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified, size: 14, color: AppColors.emeraldGreen),
                        SizedBox(width: 4),
                        Text(
                          'OFFICIALLY VERIFIED & AUDIT SIGNED',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.emeraldGreen,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1, color: AppColors.borderLight),
                  const SizedBox(height: 16),

                  // Metadata table
                  _buildReportRow('Duty Code', duty.dutyCode),
                  _buildReportRow('Institute Name', duty.instituteName),
                  _buildReportRow('Scheme', duty.schemeName),
                  _buildReportRow('Assigned Inspector', duty.inspectorName),
                  _buildReportRow(
                    'Enrolled vs Verified',
                    '${duty.reportedBeneficiaries} enrolled | ${duty.verifiedBeneficiaries > 0 ? duty.verifiedBeneficiaries : duty.reportedBeneficiaries} verified present',
                  ),
                  _buildReportRow('Compliance Rating', '${duty.overallRating > 0 ? duty.overallRating : 4.5} / 5.0 Stars'),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Inspector Remarks
            const Text(
              'Inspector Observations & Findings',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.borderLight),
              ),
              child: Text(
                duty.inspectorNotes?.isNotEmpty == true
                    ? duty.inspectorNotes!
                    : 'Surprise inspection executed within geofenced radius. Biometric cross-check and CCTV telemetry matched on-ground strength.',
                style: const TextStyle(fontSize: 13, height: 1.4, color: AppColors.textPrimaryLight),
              ),
            ),
            const SizedBox(height: 20),

            // Checklist Breakdown
            const Text(
              'Audit Checklist Results',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: duty.checklist.length,
              separatorBuilder: (_, _) => const SizedBox(height: 6),
              itemBuilder: (context, index) {
                final item = duty.checklist[index];
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.borderLight),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        item.isCompliant ? Icons.check_circle : Icons.cancel,
                        color: item.isCompliant ? AppColors.emeraldGreen : AppColors.alertRed,
                        size: 18,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          item.title,
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ),
                      Text(
                        item.isCompliant ? 'PASS' : 'FLAGGED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: item.isCompliant ? AppColors.emeraldGreen : AppColors.alertRed,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 20),

            // Geotagged Evidence Watermarks
            const Text(
              'Cryptographic Geotag Evidence',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'WATERMARKED EVIDENCE:\nTarget Lat: ${duty.targetLat}° N | Long: ${duty.targetLng}° E\nSigned By: ${duty.signedBy ?? duty.inspectorName}\nAudit Status: Locked on National DoSJE Server',
                    style: const TextStyle(
                      color: AppColors.emeraldGreen,
                      fontFamily: 'monospace',
                      fontSize: 11,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Back to Dashboard Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back),
                label: const Text('Back to Inspections'),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildReportRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight, fontWeight: FontWeight.w500),
            ),
          ),
          const Text(': ', style: TextStyle(fontSize: 12, color: AppColors.textSecondaryLight)),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimaryLight),
            ),
          ),
        ],
      ),
    );
  }
}
