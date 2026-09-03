class InspectionChecklistItem {
  final String id;
  final String title;
  final String category; // 'Infrastructure', 'Beneficiaries', 'CCTV & Records', 'Hygiene & Food'
  bool isCompliant;
  String? remarks;
  bool requiresPhoto;
  String? photoUrl;

  InspectionChecklistItem({
    required this.id,
    required this.title,
    required this.category,
    this.isCompliant = true,
    this.remarks,
    this.requiresPhoto = false,
    this.photoUrl,
  });

  InspectionChecklistItem copyWith({
    String? id,
    String? title,
    String? category,
    bool? isCompliant,
    String? remarks,
    bool? requiresPhoto,
    String? photoUrl,
  }) {
    return InspectionChecklistItem(
      id: id ?? this.id,
      title: title ?? this.title,
      category: category ?? this.category,
      isCompliant: isCompliant ?? this.isCompliant,
      remarks: remarks ?? this.remarks,
      requiresPhoto: requiresPhoto ?? this.requiresPhoto,
      photoUrl: photoUrl ?? this.photoUrl,
    );
  }
}

class InspectionDutyModel {
  final String id;
  final String dutyCode;
  final String instituteId;
  final String instituteName;
  final String schemeName;
  final String assignedInspectorId;
  final String inspectorName;
  final DateTime deadline;
  final String status; // 'assigned', 'geofence_unlocked', 'in_progress', 'completed', 'flagged'
  final String riskReason;
  final double targetLat;
  final double targetLng;
  final double currentDistanceMeters;
  final bool isGeofenceReached;
  final List<InspectionChecklistItem> checklist;
  final int reportedBeneficiaries;
  final int verifiedBeneficiaries;
  final String? inspectorNotes;
  final double overallRating; // 1 to 5
  final String? signedBy;
  final DateTime? completedAt;
  final List<String> capturedPhotoTags;

  const InspectionDutyModel({
    required this.id,
    required this.dutyCode,
    required this.instituteId,
    required this.instituteName,
    required this.schemeName,
    required this.assignedInspectorId,
    required this.inspectorName,
    required this.deadline,
    this.status = 'assigned',
    required this.riskReason,
    required this.targetLat,
    required this.targetLng,
    this.currentDistanceMeters = 350.0,
    this.isGeofenceReached = false,
    this.checklist = const [],
    this.reportedBeneficiaries = 45,
    this.verifiedBeneficiaries = 0,
    this.inspectorNotes,
    this.overallRating = 0.0,
    this.signedBy,
    this.completedAt,
    this.capturedPhotoTags = const [],
  });

  InspectionDutyModel copyWith({
    String? id,
    String? dutyCode,
    String? instituteId,
    String? instituteName,
    String? schemeName,
    String? assignedInspectorId,
    String? inspectorName,
    DateTime? deadline,
    String? status,
    String? riskReason,
    double? targetLat,
    double? targetLng,
    double? currentDistanceMeters,
    bool? isGeofenceReached,
    List<InspectionChecklistItem>? checklist,
    int? reportedBeneficiaries,
    int? verifiedBeneficiaries,
    String? inspectorNotes,
    double? overallRating,
    String? signedBy,
    DateTime? completedAt,
    List<String>? capturedPhotoTags,
  }) {
    return InspectionDutyModel(
      id: id ?? this.id,
      dutyCode: dutyCode ?? this.dutyCode,
      instituteId: instituteId ?? this.instituteId,
      instituteName: instituteName ?? this.instituteName,
      schemeName: schemeName ?? this.schemeName,
      assignedInspectorId: assignedInspectorId ?? this.assignedInspectorId,
      inspectorName: inspectorName ?? this.inspectorName,
      deadline: deadline ?? this.deadline,
      status: status ?? this.status,
      riskReason: riskReason ?? this.riskReason,
      targetLat: targetLat ?? this.targetLat,
      targetLng: targetLng ?? this.targetLng,
      currentDistanceMeters: currentDistanceMeters ?? this.currentDistanceMeters,
      isGeofenceReached: isGeofenceReached ?? this.isGeofenceReached,
      checklist: checklist ?? this.checklist,
      reportedBeneficiaries: reportedBeneficiaries ?? this.reportedBeneficiaries,
      verifiedBeneficiaries: verifiedBeneficiaries ?? this.verifiedBeneficiaries,
      inspectorNotes: inspectorNotes ?? this.inspectorNotes,
      overallRating: overallRating ?? this.overallRating,
      signedBy: signedBy ?? this.signedBy,
      completedAt: completedAt ?? this.completedAt,
      capturedPhotoTags: capturedPhotoTags ?? this.capturedPhotoTags,
    );
  }
}
