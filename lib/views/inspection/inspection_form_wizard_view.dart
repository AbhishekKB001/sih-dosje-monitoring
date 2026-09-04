import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../viewmodels/inspection_viewmodel.dart';
import 'inspection_report_view.dart';

class InspectionFormWizardView extends StatefulWidget {
  const InspectionFormWizardView({super.key});

  @override
  State<InspectionFormWizardView> createState() => _InspectionFormWizardViewState();
}

class _InspectionFormWizardViewState extends State<InspectionFormWizardView> {
  final TextEditingController _notesController = TextEditingController();
  bool _isSignatureSigned = true;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inspVM = context.watch<InspectionViewModel>();
    final duty = inspVM.selectedDuty;

    if (duty == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Inspection Wizard')),
        body: const Center(child: Text('No active duty selected.')),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Audit: ${duty.dutyCode}'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: (inspVM.currentStep + 1) / 5,
            backgroundColor: Colors.white24,
            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.saffron),
          ),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Stepper Indicator
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStepCircle(0, 'Arrival', inspVM.currentStep),
                  _buildStepLine(inspVM.currentStep > 0),
                  _buildStepCircle(1, 'Infra', inspVM.currentStep),
                  _buildStepLine(inspVM.currentStep > 1),
                  _buildStepCircle(2, 'Beneficiaries', inspVM.currentStep),
                  _buildStepLine(inspVM.currentStep > 2),
                  _buildStepCircle(3, 'CCTV', inspVM.currentStep),
                  _buildStepLine(inspVM.currentStep > 3),
                  _buildStepCircle(4, 'Sign-off', inspVM.currentStep),
                ],
              ),
            ),
            const Divider(height: 1, color: AppColors.borderLight),

            // Step Content
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: _buildCurrentStepContent(inspVM),
              ),
            ),

            // Bottom Navigation Controls
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 6,
                    offset: const Offset(0, -3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  if (inspVM.currentStep > 0)
                    Expanded(
                      flex: 1,
                      child: OutlinedButton(
                        onPressed: () => inspVM.previousStep(),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text('Back'),
                      ),
                    ),
                  if (inspVM.currentStep > 0) const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () async {
                        if (inspVM.currentStep < 4) {
                          inspVM.nextStep();
                        } else {
                          // Final Submit
                          final navigator = Navigator.of(context);
                          final success = await inspVM.submitInspectionReport(
                            '${duty.inspectorName} (ID: ${duty.assignedInspectorId})',
                          );
                          if (success && mounted) {
                            navigator.pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => InspectionReportView(duty: inspVM.selectedDuty!),
                              ),
                            );
                          }
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: inspVM.currentStep == 4 ? AppColors.emeraldGreen : AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      child: inspVM.isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : Text(
                              inspVM.currentStep == 4 ? 'Complete & Sign Audit' : 'Proceed to Next Step',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
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

  Widget _buildStepCircle(int step, String label, int currentStep) {
    final isDone = currentStep > step;
    final isCurrent = currentStep == step;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: isDone
                ? AppColors.emeraldGreen
                : isCurrent
                    ? AppColors.primary
                    : Colors.grey.shade200,
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isDone
                ? const Icon(Icons.check, size: 16, color: Colors.white)
                : Text(
                    '${step + 1}',
                    style: TextStyle(
                      color: isCurrent ? Colors.white : Colors.grey.shade700,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
            color: isCurrent ? AppColors.primary : AppColors.textSecondaryLight,
          ),
        ),
      ],
    );
  }

  Widget _buildStepLine(bool isDone) {
    return Expanded(
      child: Container(
        height: 2,
        color: isDone ? AppColors.emeraldGreen : Colors.grey.shade300,
        margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
      ),
    );
  }

  Widget _buildCurrentStepContent(InspectionViewModel inspVM) {
    switch (inspVM.currentStep) {
      case 0:
        return _buildStep1Arrival(inspVM);
      case 1:
        return _buildStep2Infrastructure(inspVM);
      case 2:
        return _buildStep3Beneficiaries(inspVM);
      case 3:
        return _buildStep4CCTVAndRecords(inspVM);
      case 4:
        return _buildStep5SignOff(inspVM);
      default:
        return const SizedBox();
    }
  }

  // STEP 1: Arrival & Geotag Proof
  Widget _buildStep1Arrival(InspectionViewModel inspVM) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Step 1: On-Site Arrival & Geotag Proof',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Take mandatory live photo evidence at the institute entrance gate. The application will tamper-proof the photo with GPS coordinates, IST timestamp, and cryptographic hash.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight, height: 1.4),
        ),
        const SizedBox(height: 16),

        // Geotag Watermarked Photo Simulator
        Container(
          height: 190,
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.emeraldGreen, width: 1.5),
          ),
          clipBehavior: Clip.antiAlias,
          child: Stack(
            fit: StackFit.expand,
            children: [
              // Simulated gate photo
              Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF2C3E50), Color(0xFF4CA1AF)],
                  ),
                ),
                child: const Center(
                  child: Icon(Icons.apartment, size: 64, color: Colors.white24),
                ),
              ),

              // Official Geotag Watermark Overlay
              Positioned(
                bottom: 0,
                left: 0,
                right: 0,
                child: Container(
                  padding: const EdgeInsets.all(10),
                  color: Colors.black.withValues(alpha: 0.8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.verified, size: 14, color: AppColors.emeraldGreen),
                          SizedBox(width: 6),
                          Text(
                            'DoSJE OFFICIAL SURPRISE AUDIT STAMP',
                            style: TextStyle(
                              color: AppColors.emeraldGreen,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'LAT: 23.2599° N | LONG: 77.4126° E (Bhopal, MP)\nTIME: 2026-09-03 19:28:10 IST\nACCURACY: ±3.2m | SPOOF-PROTECTED',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 10,
                          fontFamily: 'monospace',
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Capture Evidence Button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () {
              inspVM.captureLivePhotoEvidence('Entrance Gate & Nameboard Inspection');
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Gate photo captured and embedded with GPS Watermark!'),
                  backgroundColor: AppColors.emeraldGreen,
                ),
              );
            },
            icon: const Icon(Icons.camera_alt),
            label: const Text('Capture Additional Evidence Photo'),
          ),
        ),
        const SizedBox(height: 12),

        // Captured list
        if (inspVM.capturedEvidencePhotos.isNotEmpty) ...[
          const Text('Evidence Captured for this Audit:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 6),
          ...inspVM.capturedEvidencePhotos.map((photo) => Container(
                margin: const EdgeInsets.only(bottom: 6),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Text(photo, style: const TextStyle(fontSize: 10, fontFamily: 'monospace')),
              )),
        ],
      ],
    );
  }

  // STEP 2: Infrastructure & Sanitation
  Widget _buildStep2Infrastructure(InspectionViewModel inspVM) {
    final items = inspVM.selectedDuty?.checklist.where((i) => i.category == 'Infrastructure' || i.category == 'Hygiene & Food').toList() ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Step 2: Infrastructure & Sanitation Audit',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Inspect living quarters, food quality, sanitation facilities, and fire safety systems.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
        ),
        const SizedBox(height: 16),

        ...items.map((item) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                    ),
                    Switch(
                      value: item.isCompliant,
                      activeThumbColor: AppColors.emeraldGreen,
                      onChanged: (val) {
                        inspVM.updateChecklistItem(itemId: item.id, isCompliant: val);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: item.isCompliant ? Colors.green.shade50 : Colors.red.shade50,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        item.isCompliant ? 'COMPLIANT (PASS)' : 'DEFICIENCY FLAGGED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: item.isCompliant ? AppColors.emeraldGreen : AppColors.alertRed,
                        ),
                      ),
                    ),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () {
                        inspVM.captureLivePhotoEvidence(item.title);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Attached photo proof for ${item.title}')),
                        );
                      },
                      icon: const Icon(Icons.add_a_photo, size: 14),
                      label: const Text('Add Proof', style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // STEP 3: Beneficiary Verification & Proxy Check
  Widget _buildStep3Beneficiaries(InspectionViewModel inspVM) {
    final reported = inspVM.selectedDuty?.reportedBeneficiaries ?? 65;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Step 3: Beneficiary Headcount & Anti-Proxy Audit',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Verify physical headcount against the DoSJE scheme portal records to curb proxy enrollments and ghost beneficiaries.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight, height: 1.4),
        ),
        const SizedBox(height: 16),

        // Headcount Comparison Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  Column(
                    children: [
                      const Text('Portal Enrolled', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Text(
                        '$reported',
                        style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ),
                    ],
                  ),
                  Container(width: 1, height: 45, color: AppColors.borderLight),
                  Column(
                    children: [
                      const Text('Physically Present', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      const SizedBox(height: 4),
                      Text(
                        '${inspVM.verifiedHeadcount}',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: (inspVM.verifiedHeadcount < reported - 5) ? AppColors.alertRed : AppColors.emeraldGreen,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              const Text('Adjust Verified On-Site Count:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              Slider(
                value: inspVM.verifiedHeadcount.toDouble(),
                min: 0,
                max: (reported + 10).toDouble(),
                divisions: (reported + 10),
                activeColor: AppColors.primary,
                label: '${inspVM.verifiedHeadcount}',
                onChanged: (val) {
                  inspVM.setVerifiedHeadcount(val.round());
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Anti-Proxy Detection Questions
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Anti-Proxy Safeguards Check',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              SizedBox(height: 8),
              Text('• Random biometric thumbprint cross-verification completed for 5 beneficiaries.'),
              SizedBox(height: 4),
              Text('• No duplicate Aadhaar credentials detected in local registers.'),
              SizedBox(height: 4),
              Text('• Direct 1-on-1 interaction conducted without NGO supervisor present.'),
            ],
          ),
        ),
      ],
    );
  }

  // STEP 4: CCTV & Logbook Audit
  Widget _buildStep4CCTVAndRecords(InspectionViewModel inspVM) {
    final items = inspVM.selectedDuty?.checklist.where((i) => i.category == 'CCTV & Records' || i.category == 'Beneficiaries').toList() ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Step 4: CCTV Surveillance & Register Audit',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Audit hardware NVR recording status, minimum 30-day retention storage, and physical registers.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
        ),
        const SizedBox(height: 16),

        ...items.map((item) {
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.borderLight),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    item.title,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ),
                Switch(
                  value: item.isCompliant,
                  activeThumbColor: AppColors.emeraldGreen,
                  onChanged: (val) {
                    inspVM.updateChecklistItem(itemId: item.id, isCompliant: val);
                  },
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // STEP 5: Final Rating, Notes & Digital Sign-off
  Widget _buildStep5SignOff(InspectionViewModel inspVM) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Step 5: Inspection Score & Digital Signature',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 6),
        const Text(
          'Provide overall compliance rating, inspector remarks, and sign the official audit ledger.',
          style: TextStyle(fontSize: 13, color: AppColors.textSecondaryLight),
        ),
        const SizedBox(height: 16),

        // Star Rating
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.borderLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Overall Institutional Compliance Rating:', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(5, (index) {
                  return IconButton(
                    icon: Icon(
                      index < inspVM.rating.round() ? Icons.star : Icons.star_border,
                      color: AppColors.saffron,
                      size: 36,
                    ),
                    onPressed: () {
                      inspVM.setRating((index + 1).toDouble());
                    },
                  );
                }),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Inspector Notes
        const Text('Inspector Remarks & Action Items:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
        const SizedBox(height: 6),
        TextField(
          controller: _notesController,
          maxLines: 3,
          onChanged: (val) => inspVM.setInspectorNotes(val),
          decoration: const InputDecoration(
            hintText: 'Enter observation remarks, minor deficiencies, or praise...',
          ),
        ),
        const SizedBox(height: 16),

        // Digital Signature Canvas Simulator
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.primaryLight),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Digital Signature of Inspecting Officer:', style: TextStyle(fontWeight: FontWeight.bold)),
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isSignatureSigned = !_isSignatureSigned;
                      });
                    },
                    child: Text(_isSignatureSigned ? 'Clear' : 'Sign'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                height: 80,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid),
                ),
                alignment: Alignment.center,
                child: _isSignatureSigned
                    ? Text(
                        'Anjali Verma\nDigitally Signed via Aadhaar eSign [DoSJE-PMU]',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'cursive',
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.blue.shade900,
                        ),
                      )
                    : const Text(
                        'Touch to sign with stylus / finger',
                        style: TextStyle(color: Colors.grey),
                      ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
