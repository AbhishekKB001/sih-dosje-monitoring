import 'dart:math';
import '../models/inspection_duty_model.dart';
import '../models/institute_model.dart';
import '../models/anomaly_model.dart';
import '../services/api_service.dart';
import '../../core/constants/mock_data.dart';

class InspectionRepository {
  final List<InspectionDutyModel> _duties = MockData.getInitialInspectionDuties();
  final List<AnomalyModel> _anomalies = List.from(MockData.anomalies);
  final List<InstituteModel> _institutes = List.from(MockData.institutes);
  final ApiService _api = ApiService();

  List<InspectionDutyModel> get duties => List.unmodifiable(_duties);
  List<AnomalyModel> get anomalies => List.unmodifiable(_anomalies);
  List<InstituteModel> get institutes => List.unmodifiable(_institutes);

  Future<List<InspectionDutyModel>> getDutiesForInspector(String inspectorId) async {
    try {
      final liveDuties = await _api.getDuties();
      if (liveDuties.isNotEmpty) {
        for (final duty in liveDuties) {
          if (!_duties.any((d) => d.id == duty.id || d.dutyCode == duty.dutyCode)) {
            _duties.insert(0, duty);
          }
        }
      }
    } catch (_) {}

    await Future.delayed(const Duration(milliseconds: 150));
    return _duties.where((d) => d.assignedInspectorId == inspectorId || d.assignedInspectorId == 'USR-PMU-104').toList();
  }

  Future<InspectionDutyModel?> getDutyById(String id) async {
    await Future.delayed(const Duration(milliseconds: 100));
    try {
      return _duties.firstWhere((d) => d.id == id);
    } catch (_) {
      return null;
    }
  }

  // Simulate Geofence Distance update (e.g., inspector reached location within 50m)
  Future<InspectionDutyModel> simulateGeofenceArrival(String dutyId) async {
    final index = _duties.indexWhere((d) => d.id == dutyId);
    if (index != -1) {
      final duty = _duties[index];
      // Notify backend if online
      await _api.verifyGeofence(dutyId, duty.targetLat, duty.targetLng);

      final updated = duty.copyWith(
        currentDistanceMeters: 45.0, // Within 100m geofence radius
        isGeofenceReached: true,
        status: duty.status == 'assigned' ? 'geofence_unlocked' : duty.status,
      );
      _duties[index] = updated;
      return updated;
    }
    throw Exception('Duty not found');
  }

  // AI Random Inspection Assigner
  Future<InspectionDutyModel> triggerRandomAIAssignment() async {
    // 1. Attempt live trigger from Central Backend
    try {
      final liveDuty = await _api.triggerRandomAIAssignment();
      if (liveDuty != null) {
        _duties.insert(0, liveDuty);
        return liveDuty;
      }
    } catch (_) {}

    // 2. Fallback to local heuristic
    final eligible = _institutes.where((i) => i.riskLevel == 'high' || i.isFlaggedForInspection).toList();
    final target = eligible.isNotEmpty ? eligible[Random().nextInt(eligible.length)] : _institutes.first;

    final newDuty = InspectionDutyModel(
      id: 'DUTY-AI-${DateTime.now().millisecondsSinceEpoch % 10000}',
      dutyCode: 'DOSJE-SURPRISE-${Random().nextInt(899) + 100}',
      instituteId: target.id,
      instituteName: target.name,
      schemeName: target.scheme,
      assignedInspectorId: 'USR-PMU-104',
      inspectorName: 'Anjali Verma',
      deadline: DateTime.now().add(const Duration(hours: 3)),
      status: 'assigned',
      riskReason: 'Automated AI Trigger: Low compliance score (${target.complianceScore}%) & offline camera telemetry.',
      targetLat: target.latitude,
      targetLng: target.longitude,
      currentDistanceMeters: 420.0,
      isGeofenceReached: false,
      reportedBeneficiaries: target.totalEnrolledBeneficiaries,
      checklist: [
        InspectionChecklistItem(
          id: 'CHK-01',
          title: 'Physical gate attendance matches Biometric Logbook',
          category: 'Infrastructure',
          requiresPhoto: true,
        ),
        InspectionChecklistItem(
          id: 'CHK-02',
          title: 'Dormitory cleanliness, bedsheet hygiene, and ventilation',
          category: 'Hygiene & Food',
          requiresPhoto: true,
        ),
        InspectionChecklistItem(
          id: 'CHK-03',
          title: 'All CCTV cameras operational with min 30-day storage',
          category: 'CCTV & Records',
          requiresPhoto: true,
        ),
        InspectionChecklistItem(
          id: 'CHK-04',
          title: 'Direct beneficiary interaction & grievance verification',
          category: 'Beneficiaries',
          requiresPhoto: false,
        ),
      ],
    );

    _duties.insert(0, newDuty);
    return newDuty;
  }

  // Update Checklist item in active inspection
  void updateChecklistItem(String dutyId, String itemId, bool isCompliant, String? remarks, String? photoTag) {
    final index = _duties.indexWhere((d) => d.id == dutyId);
    if (index != -1) {
      final duty = _duties[index];
      final itemIndex = duty.checklist.indexWhere((i) => i.id == itemId);
      if (itemIndex != -1) {
        final item = duty.checklist[itemIndex];
        item.isCompliant = isCompliant;
        if (remarks != null) item.remarks = remarks;
        if (photoTag != null) item.photoUrl = photoTag;
      }
    }
  }

  // Submit Final Geotagged Report
  Future<InspectionDutyModel> submitReport({
    required String dutyId,
    required int verifiedBeneficiaries,
    required String inspectorNotes,
    required double rating,
    required String signedBy,
    required List<String> photoTags,
  }) async {
    // Notify central backend
    await _api.submitReport(dutyId, {
      'summary': inspectorNotes,
      'beneficiariesVerified': verifiedBeneficiaries,
      'infrastructureRating': rating.round(),
      'sanitationRating': rating.round(),
    });

    final index = _duties.indexWhere((d) => d.id == dutyId);
    if (index != -1) {
      final updated = _duties[index].copyWith(
        status: 'completed',
        verifiedBeneficiaries: verifiedBeneficiaries,
        inspectorNotes: inspectorNotes,
        overallRating: rating,
        signedBy: signedBy,
        completedAt: DateTime.now(),
        capturedPhotoTags: photoTags,
      );
      _duties[index] = updated;
      return updated;
    }
    throw Exception('Duty not found');
  }

  // Resolve an Anomaly
  void resolveAnomaly(String anomalyId) {
    final index = _anomalies.indexWhere((a) => a.id == anomalyId);
    if (index != -1) {
      _anomalies[index] = _anomalies[index].copyWith(isResolved: true);
    }
  }
}
