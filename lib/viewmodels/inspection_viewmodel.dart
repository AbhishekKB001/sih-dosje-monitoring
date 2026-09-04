import 'package:flutter/foundation.dart';
import '../data/models/inspection_duty_model.dart';
import '../data/models/institute_model.dart';
import '../data/repositories/inspection_repository.dart';

class InspectionViewModel extends ChangeNotifier {
  final InspectionRepository _inspectionRepository;

  InspectionViewModel({required this._inspectionRepository}) {
    loadDuties();
  }

  List<InspectionDutyModel> _duties = [];
  List<InspectionDutyModel> get duties => _duties;

  List<InstituteModel> get institutes => _inspectionRepository.institutes;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  InspectionDutyModel? _selectedDuty;
  InspectionDutyModel? get selectedDuty => _selectedDuty;

  // Active form wizard state
  int _currentStep = 0;
  int get currentStep => _currentStep;

  int _verifiedHeadcount = 0;
  int get verifiedHeadcount => _verifiedHeadcount;

  String _inspectorNotes = '';
  String get inspectorNotes => _inspectorNotes;

  double _rating = 4.0;
  double get rating => _rating;

  final List<String> _capturedEvidencePhotos = [];
  List<String> get capturedEvidencePhotos => List.unmodifiable(_capturedEvidencePhotos);

  bool _isSubmitting = false;
  bool get isSubmitting => _isSubmitting;

  Future<void> loadDuties() async {
    _isLoading = true;
    notifyListeners();

    _duties = await _inspectionRepository.getDutiesForInspector('USR-PMU-104');
    _isLoading = false;
    notifyListeners();
  }

  void selectDuty(InspectionDutyModel duty) {
    _selectedDuty = duty;
    _currentStep = 0;
    _verifiedHeadcount = duty.reportedBeneficiaries;
    _inspectorNotes = duty.inspectorNotes ?? '';
    _rating = duty.overallRating > 0 ? duty.overallRating : 4.0;
    _capturedEvidencePhotos.clear();
    if (duty.capturedPhotoTags.isNotEmpty) {
      _capturedEvidencePhotos.addAll(duty.capturedPhotoTags);
    }
    notifyListeners();
  }

  // Simulate inspector reaching geofence (< 100 meters)
  Future<void> simulateArrivalAtGeofence(String dutyId) async {
    _isLoading = true;
    notifyListeners();

    final updated = await _inspectionRepository.simulateGeofenceArrival(dutyId);
    _selectedDuty = updated;
    await loadDuties();

    _isLoading = false;
    notifyListeners();
  }

  // Trigger Random AI Assignment
  Future<InspectionDutyModel> triggerAIAssignment() async {
    _isLoading = true;
    notifyListeners();

    final duty = await _inspectionRepository.triggerRandomAIAssignment();
    await loadDuties();

    _isLoading = false;
    notifyListeners();
    return duty;
  }

  void setStep(int step) {
    _currentStep = step;
    notifyListeners();
  }

  void nextStep() {
    if (_currentStep < 4) {
      _currentStep++;
      notifyListeners();
    }
  }

  void previousStep() {
    if (_currentStep > 0) {
      _currentStep--;
      notifyListeners();
    }
  }

  void updateChecklistItem({
    required String itemId,
    required bool isCompliant,
    String? remarks,
  }) {
    if (_selectedDuty == null) return;
    _inspectionRepository.updateChecklistItem(
      _selectedDuty!.id,
      itemId,
      isCompliant,
      remarks,
      null,
    );
    notifyListeners();
  }

  void setVerifiedHeadcount(int count) {
    _verifiedHeadcount = count;
    notifyListeners();
  }

  void setInspectorNotes(String notes) {
    _inspectorNotes = notes;
    notifyListeners();
  }

  void setRating(double newRating) {
    _rating = newRating;
    notifyListeners();
  }

  // Simulate capturing a live geo-tagged & watermarked photo
  void captureLivePhotoEvidence(String description) {
    final now = DateTime.now();
    final lat = _selectedDuty?.targetLat.toStringAsFixed(4) ?? '23.2599';
    final lng = _selectedDuty?.targetLng.toStringAsFixed(4) ?? '77.4126';
    final tag = 'PHOTO EVIDENCE: $description\n[GEO: $lat° N, $lng° E | TIME: ${now.hour}:${now.minute}:${now.second} IST | HASH: SHA256-OK]';
    _capturedEvidencePhotos.add(tag);
    notifyListeners();
  }

  // Submit report
  Future<bool> submitInspectionReport(String signedBy) async {
    if (_selectedDuty == null) return false;
    _isSubmitting = true;
    notifyListeners();

    try {
      final completed = await _inspectionRepository.submitReport(
        dutyId: _selectedDuty!.id,
        verifiedBeneficiaries: _verifiedHeadcount,
        inspectorNotes: _inspectorNotes.isNotEmpty ? _inspectorNotes : 'All items verified on site as per DoSJE guidelines.',
        rating: _rating,
        signedBy: signedBy,
        photoTags: _capturedEvidencePhotos,
      );
      _selectedDuty = completed;
      await loadDuties();
      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (_) {
      _isSubmitting = false;
      notifyListeners();
      return false;
    }
  }
}
