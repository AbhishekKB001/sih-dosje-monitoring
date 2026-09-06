import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';

enum SyncStatus {
  draft,
  pendingUpload,
  uploading,
  synced,
  syncFailed,
}

class OfflineDraftInspection {
  final String dutyId;
  final String dutyCode;
  final String instituteId;
  final String instituteName;
  final int verifiedBeneficiaries;
  final String inspectorNotes;
  final double rating;
  final String signedBy;
  final List<String> capturedPhotoTags;
  final List<String> localPhotoPaths;
  final List<String> localVideoPaths;
  final SyncStatus syncStatus;
  final DateTime lastModified;
  final String? errorMessage;

  OfflineDraftInspection({
    required this.dutyId,
    required this.dutyCode,
    required this.instituteId,
    required this.instituteName,
    this.verifiedBeneficiaries = 0,
    this.inspectorNotes = '',
    this.rating = 4.0,
    this.signedBy = '',
    this.capturedPhotoTags = const [],
    this.localPhotoPaths = const [],
    this.localVideoPaths = const [],
    this.syncStatus = SyncStatus.draft,
    DateTime? lastModified,
    this.errorMessage,
  }) : lastModified = lastModified ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'dutyId': dutyId,
        'dutyCode': dutyCode,
        'instituteId': instituteId,
        'instituteName': instituteName,
        'verifiedBeneficiaries': verifiedBeneficiaries,
        'inspectorNotes': inspectorNotes,
        'rating': rating,
        'signedBy': signedBy,
        'capturedPhotoTags': capturedPhotoTags,
        'localPhotoPaths': localPhotoPaths,
        'localVideoPaths': localVideoPaths,
        'syncStatus': syncStatus.name,
        'lastModified': lastModified.toIso8601String(),
        'errorMessage': errorMessage,
      };

  factory OfflineDraftInspection.fromJson(Map<String, dynamic> json) {
    return OfflineDraftInspection(
      dutyId: json['dutyId'] as String,
      dutyCode: json['dutyCode'] as String? ?? 'DUTY-OFFLINE',
      instituteId: json['instituteId'] as String? ?? '',
      instituteName: json['instituteName'] as String? ?? 'Institute',
      verifiedBeneficiaries: json['verifiedBeneficiaries'] as int? ?? 0,
      inspectorNotes: json['inspectorNotes'] as String? ?? '',
      rating: (json['rating'] as num?)?.toDouble() ?? 4.0,
      signedBy: json['signedBy'] as String? ?? '',
      capturedPhotoTags: (json['capturedPhotoTags'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      localPhotoPaths: (json['localPhotoPaths'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      localVideoPaths: (json['localVideoPaths'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      syncStatus: SyncStatus.values.firstWhere(
        (e) => e.name == json['syncStatus'],
        orElse: () => SyncStatus.draft,
      ),
      lastModified: json['lastModified'] != null ? DateTime.tryParse(json['lastModified']) : null,
      errorMessage: json['errorMessage'] as String?,
    );
  }

  OfflineDraftInspection copyWith({
    int? verifiedBeneficiaries,
    String? inspectorNotes,
    double? rating,
    String? signedBy,
    List<String>? capturedPhotoTags,
    List<String>? localPhotoPaths,
    List<String>? localVideoPaths,
    SyncStatus? syncStatus,
    String? errorMessage,
  }) {
    return OfflineDraftInspection(
      dutyId: dutyId,
      dutyCode: dutyCode,
      instituteId: instituteId,
      instituteName: instituteName,
      verifiedBeneficiaries: verifiedBeneficiaries ?? this.verifiedBeneficiaries,
      inspectorNotes: inspectorNotes ?? this.inspectorNotes,
      rating: rating ?? this.rating,
      signedBy: signedBy ?? this.signedBy,
      capturedPhotoTags: capturedPhotoTags ?? this.capturedPhotoTags,
      localPhotoPaths: localPhotoPaths ?? this.localPhotoPaths,
      localVideoPaths: localVideoPaths ?? this.localVideoPaths,
      syncStatus: syncStatus ?? this.syncStatus,
      lastModified: DateTime.now(),
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }
}

class OfflineStorageService {
  static final OfflineStorageService _instance = OfflineStorageService._internal();
  factory OfflineStorageService() => _instance;
  OfflineStorageService._internal();

  Future<Directory> _getDraftDir() async {
    final appDir = await getApplicationDocumentsDirectory();
    final dir = Directory('${appDir.path}/offline_inspections');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  Future<void> saveDraft(OfflineDraftInspection draft) async {
    final dir = await _getDraftDir();
    final file = File('${dir.path}/${draft.dutyId}.json');
    await file.writeAsString(jsonEncode(draft.toJson()));
  }

  Future<OfflineDraftInspection?> getDraft(String dutyId) async {
    try {
      final dir = await _getDraftDir();
      final file = File('${dir.path}/$dutyId.json');
      if (await file.exists()) {
        final content = await file.readAsString();
        return OfflineDraftInspection.fromJson(jsonDecode(content));
      }
    } catch (_) {}
    return null;
  }

  Future<List<OfflineDraftInspection>> getAllDrafts() async {
    final drafts = <OfflineDraftInspection>[];
    try {
      final dir = await _getDraftDir();
      final entities = dir.listSync();
      for (final entity in entities) {
        if (entity is File && entity.path.endsWith('.json')) {
          try {
            final content = entity.readAsStringSync();
            drafts.add(OfflineDraftInspection.fromJson(jsonDecode(content)));
          } catch (_) {}
        }
      }
    } catch (_) {}
    return drafts;
  }

  Future<void> deleteDraft(String dutyId) async {
    try {
      final dir = await _getDraftDir();
      final file = File('${dir.path}/$dutyId.json');
      if (await file.exists()) {
        await file.delete();
      }
    } catch (_) {}
  }
}
