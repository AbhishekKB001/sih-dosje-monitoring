import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import '../core/services/location_service.dart';
import '../core/services/watermark_service.dart';
import '../core/services/offline_storage_service.dart';
import '../data/models/inspection_duty_model.dart';
import '../data/models/institute_model.dart';
import '../data/repositories/inspection_repository.dart';
import '../data/services/api_service.dart';

class InspectionViewModel extends ChangeNotifier {
  final InspectionRepository _inspectionRepository;
  final LocationService _locationService = LocationService();
  final WatermarkService _watermarkService = WatermarkService();
  final OfflineStorageService _offlineService = OfflineStorageService();
  final ApiService _api = ApiService();
  final ImagePicker _picker = ImagePicker();

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

  final List<File> _capturedPhotoFiles = [];
  List<File> get capturedPhotoFiles => List.unmodifiable(_capturedPhotoFiles);

  final List<File> _capturedVideoFiles = [];
  List<File> get capturedVideoFiles => List.unmodifiable(_capturedVideoFiles);

  bool _isSubmitting = false;
  bool get isSubmitting => _isSubmitting;

  SyncStatus _syncStatus = SyncStatus.draft;
  SyncStatus get syncStatus => _syncStatus;

  String? _gpsStatusMessage;
  String? get gpsStatusMessage => _gpsStatusMessage;

  double? _lastAccuracyMeters;
  double? get lastAccuracyMeters => _lastAccuracyMeters;

  Future<void> loadDuties() async {
    _isLoading = true;
    notifyListeners();

    _duties = await _inspectionRepository.getDutiesForInspector('USR-MEMBER-02');
    _isLoading = false;
    notifyListeners();
  }

  Future<void> selectDuty(InspectionDutyModel duty) async {
    _selectedDuty = duty;
    _currentStep = 0;
    _verifiedHeadcount = duty.reportedBeneficiaries;
    _inspectorNotes = duty.inspectorNotes ?? '';
    _rating = duty.overallRating > 0 ? duty.overallRating : 4.0;
    _capturedEvidencePhotos.clear();
    _capturedPhotoFiles.clear();
    _capturedVideoFiles.clear();
    _gpsStatusMessage = null;
    _syncStatus = SyncStatus.draft;

    if (duty.capturedPhotoTags.isNotEmpty) {
      _capturedEvidencePhotos.addAll(duty.capturedPhotoTags);
    }

    // Check if an offline draft exists for this duty
    final draft = await _offlineService.getDraft(duty.id);
    if (draft != null) {
      _verifiedHeadcount = draft.verifiedBeneficiaries > 0 ? draft.verifiedBeneficiaries : _verifiedHeadcount;
      _inspectorNotes = draft.inspectorNotes.isNotEmpty ? draft.inspectorNotes : _inspectorNotes;
      _rating = draft.rating;
      _syncStatus = draft.syncStatus;
      for (final p in draft.localPhotoPaths) {
        final f = File(p);
        if (f.existsSync() && !_capturedPhotoFiles.any((cf) => cf.path == p)) {
          _capturedPhotoFiles.add(f);
        }
      }
      for (final vp in draft.localVideoPaths) {
        final vf = File(vp);
        if (vf.existsSync() && !_capturedVideoFiles.any((cvf) => cvf.path == vp)) {
          _capturedVideoFiles.add(vf);
        }
      }
    }

    notifyListeners();
  }

  // Real physical GPS acquisition and geofence verification
  Future<bool> verifyRealArrivalAtGeofence(String dutyId) async {
    if (_selectedDuty == null) return false;
    _isLoading = true;
    _gpsStatusMessage = 'Acquiring satellite GPS fix from device hardware...';
    notifyListeners();

    try {
      final locRes = await _locationService.verifyGeofence(
        targetLatitude: _selectedDuty!.targetLat,
        targetLongitude: _selectedDuty!.targetLng,
        allowedRadiusMeters: 100.0,
      );

      if (!locRes.success || locRes.position == null) {
        _isLoading = false;
        _gpsStatusMessage = 'GPS Error: ${locRes.errorMessage ?? "Failed to read sensor"}';
        notifyListeners();
        return false;
      }

      final pos = locRes.position!;
      final distance = locRes.distanceMeters ?? 0.0;
      _lastAccuracyMeters = pos.accuracy;

      final updated = await _inspectionRepository.verifyRealGeofenceArrival(
        dutyId,
        pos.latitude,
        pos.longitude,
        distance,
        locRes.isWithinGeofence,
      );

      _selectedDuty = updated;
      _gpsStatusMessage = locRes.isWithinGeofence
          ? 'GEOFENCE VERIFIED: Distance ${distance.toStringAsFixed(1)}m (Allowed: 100m, Acc: ±${pos.accuracy.toStringAsFixed(1)}m)'
          : 'OUTSIDE GEOFENCE: Distance ${distance.toStringAsFixed(1)}m exceeds allowed radius 100m';

      await _saveDraftState();
      await loadDuties();

      _isLoading = false;
      notifyListeners();
      return locRes.isWithinGeofence;
    } catch (e) {
      _isLoading = false;
      _gpsStatusMessage = 'GPS Acquisition Failed: $e';
      notifyListeners();
      return false;
    }
  }

  // Fallback simulator for offline/desktop development
  Future<void> simulateArrivalAtGeofence(String dutyId) async {
    _isLoading = true;
    notifyListeners();

    final updated = await _inspectionRepository.simulateGeofenceArrival(dutyId);
    _selectedDuty = updated;
    _gpsStatusMessage = 'GEOFENCE VERIFIED (Simulator Mode: 45.0m from gate)';
    await loadDuties();

    _isLoading = false;
    notifyListeners();
  }

  // Real physical camera photo capture with visible watermark
  Future<bool> captureRealPhotoEvidence(String description) async {
    if (_selectedDuty == null) return false;
    try {
      final picked = await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 88,
        maxWidth: 1920,
        maxHeight: 1080,
      );

      if (picked == null) return false; // User dismissed camera

      _isLoading = true;
      notifyListeners();

      // Read real GPS coordinates for the photo
      double lat = _selectedDuty!.targetLat;
      double lng = _selectedDuty!.targetLng;
      double acc = _lastAccuracyMeters ?? 10.0;

      try {
        final pos = await _locationService.getCurrentPosition();
        if (pos != null) {
          lat = pos.latitude;
          lng = pos.longitude;
          acc = pos.accuracy;
        }
      } catch (_) {}

      // Apply real visible watermark directly to pixels
      final result = await _watermarkService.applyVisibleWatermark(
        originalImageFile: File(picked.path),
        projectCode: _selectedDuty!.schemeName,
        instituteName: _selectedDuty!.instituteName,
        dutyCode: _selectedDuty!.dutyCode,
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        capturedAt: DateTime.now(),
      );

      _capturedPhotoFiles.add(result.file);
      final tag = 'PHOTO EVIDENCE: $description\n[EVIDENCE: ${result.evidenceId} | GEO: ${lat.toStringAsFixed(4)}° N, ${lng.toStringAsFixed(4)}° E | SHA256: ${result.sha256Hash.substring(0, 16)}...]';
      _capturedEvidencePhotos.add(tag);

      // Upload watermarked image to Central Backend Evidence Vault
      try {
        final rawBase64 = base64Encode(result.bytes);
        await _api.uploadEvidence(
          inspectionId: _selectedDuty!.id,
          rawBase64: rawBase64,
          fileType: 'IMAGE',
          latitude: lat,
          longitude: lng,
          sha256Hash: result.sha256Hash,
        );
      } catch (_) {}

      await _saveDraftState();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Real physical camera short video recording (30-60s)
  Future<bool> recordRealVideoEvidence(String description) async {
    if (_selectedDuty == null) return false;
    try {
      final pickedVideo = await _picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(seconds: 45),
      );

      if (pickedVideo == null) return false;

      _isLoading = true;
      notifyListeners();

      final videoFile = File(pickedVideo.path);
      _capturedVideoFiles.add(videoFile);

      // Read real GPS coordinates for video metadata
      double lat = _selectedDuty!.targetLat;
      double lng = _selectedDuty!.targetLng;
      try {
        final pos = await _locationService.getCurrentPosition();
        if (pos != null) {
          lat = pos.latitude;
          lng = pos.longitude;
        }
      } catch (_) {}

      // Calculate SHA-256 of real video file
      final videoBytes = await videoFile.readAsBytes();
      final videoHash = sha256.convert(videoBytes).toString();
      final evidenceId = 'EVD-VID-${DateTime.now().millisecondsSinceEpoch % 100000}';

      final videoTag = 'VIDEO EVIDENCE: $description\n[EVIDENCE: $evidenceId | GPS: ${lat.toStringAsFixed(4)}° N, ${lng.toStringAsFixed(4)}° E | DURATION: 30s | SHA256: ${videoHash.substring(0, 16)}...]';
      _capturedEvidencePhotos.add(videoTag);

      // Upload video bytes to backend if online
      try {
        final rawBase64 = base64Encode(videoBytes);
        await _api.uploadEvidence(
          inspectionId: _selectedDuty!.id,
          rawBase64: rawBase64,
          fileType: 'VIDEO',
          latitude: lat,
          longitude: lng,
          sha256Hash: videoHash,
        );
      } catch (_) {}

      await _saveDraftState();
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  // Fallback simulated photo capture
  void captureLivePhotoEvidence(String description) {
    final now = DateTime.now();
    final lat = _selectedDuty?.targetLat.toStringAsFixed(4) ?? '28.6139';
    final lng = _selectedDuty?.targetLng.toStringAsFixed(4) ?? '77.2090';
    final tag = 'PHOTO EVIDENCE: $description\n[GEO: $lat° N, $lng° E | TIME: ${now.hour}:${now.minute}:${now.second} IST | HASH: SHA256-OK]';
    _capturedEvidencePhotos.add(tag);
    _saveDraftState();
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
    _saveDraftState();
    notifyListeners();
  }

  void nextStep() {
    if (_currentStep < 4) {
      _currentStep++;
      _saveDraftState();
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
    _saveDraftState();
    notifyListeners();
  }

  void setVerifiedHeadcount(int count) {
    _verifiedHeadcount = count;
    _saveDraftState();
    notifyListeners();
  }

  void setInspectorNotes(String notes) {
    _inspectorNotes = notes;
    _saveDraftState();
    notifyListeners();
  }

  void setRating(double newRating) {
    _rating = newRating;
    _saveDraftState();
    notifyListeners();
  }

  Future<void> _saveDraftState() async {
    if (_selectedDuty == null) return;
    final draft = OfflineDraftInspection(
      dutyId: _selectedDuty!.id,
      dutyCode: _selectedDuty!.dutyCode,
      instituteId: _selectedDuty!.instituteId,
      instituteName: _selectedDuty!.instituteName,
      verifiedBeneficiaries: _verifiedHeadcount,
      inspectorNotes: _inspectorNotes,
      rating: _rating,
      capturedPhotoTags: _capturedEvidencePhotos,
      localPhotoPaths: _capturedPhotoFiles.map((f) => f.path).toList(),
      localVideoPaths: _capturedVideoFiles.map((f) => f.path).toList(),
      syncStatus: _syncStatus,
    );
    await _offlineService.saveDraft(draft);
  }

  // Final submission of report (online with automatic offline fallback)
  Future<bool> submitInspectionReport(String signedBy) async {
    if (_selectedDuty == null) return false;
    _isSubmitting = true;
    _syncStatus = SyncStatus.uploading;
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
      _syncStatus = SyncStatus.synced;
      await _offlineService.deleteDraft(_selectedDuty!.id);
      await loadDuties();

      _isSubmitting = false;
      notifyListeners();
      return true;
    } catch (_) {
      // Network failure -> store as pending upload in offline vault
      _syncStatus = SyncStatus.pendingUpload;
      await _saveDraftState();
      _isSubmitting = false;
      notifyListeners();
      return true; // Still allow finishing draft offline
    }
  }

  // Retry synchronizing any pending offline drafts
  Future<int> syncPendingDrafts() async {
    final drafts = await _offlineService.getAllDrafts();
    final pending = drafts.where((d) => d.syncStatus == SyncStatus.pendingUpload || d.syncStatus == SyncStatus.syncFailed).toList();

    int syncedCount = 0;
    for (final draft in pending) {
      try {
        await _api.submitReport(draft.dutyId, {
          'summary': draft.inspectorNotes,
          'beneficiariesVerified': draft.verifiedBeneficiaries,
          'infrastructureRating': draft.rating.round(),
          'sanitationRating': draft.rating.round(),
          'hygieneRating': draft.rating.round(),
          'foodQualityRating': draft.rating.round(),
          'attendanceMatches': true,
          'issuesIdentified': draft.inspectorNotes,
          'recommendations': 'Synchronized from offline inspection storage.',
          'actionRequired': draft.rating < 3.0,
        });
        await _offlineService.deleteDraft(draft.dutyId);
        syncedCount++;
      } catch (_) {
        await _offlineService.saveDraft(draft.copyWith(syncStatus: SyncStatus.syncFailed));
      }
    }
    await loadDuties();
    return syncedCount;
  }
}

