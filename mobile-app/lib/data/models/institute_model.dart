class InstituteModel {
  final String id;
  final String name;
  final String scheme;
  final String state;
  final String district;
  final String address;
  final double latitude;
  final double longitude;
  final String inchargeName;
  final String inchargePhone;
  final int totalEnrolledBeneficiaries;
  final int activeCameras;
  final int totalCameras;
  final double complianceScore; // 0 to 100
  final String riskLevel; // 'low', 'medium', 'high'
  final bool isFlaggedForInspection;
  final String lastInspectionDate;

  const InstituteModel({
    required this.id,
    required this.name,
    required this.scheme,
    required this.state,
    required this.district,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.inchargeName,
    required this.inchargePhone,
    required this.totalEnrolledBeneficiaries,
    required this.activeCameras,
    required this.totalCameras,
    required this.complianceScore,
    required this.riskLevel,
    this.isFlaggedForInspection = false,
    required this.lastInspectionDate,
  });

  InstituteModel copyWith({
    String? id,
    String? name,
    String? scheme,
    String? state,
    String? district,
    String? address,
    double? latitude,
    double? longitude,
    String? inchargeName,
    String? inchargePhone,
    int? totalEnrolledBeneficiaries,
    int? activeCameras,
    int? totalCameras,
    double? complianceScore,
    String? riskLevel,
    bool? isFlaggedForInspection,
    String? lastInspectionDate,
  }) {
    return InstituteModel(
      id: id ?? this.id,
      name: name ?? this.name,
      scheme: scheme ?? this.scheme,
      state: state ?? this.state,
      district: district ?? this.district,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      inchargeName: inchargeName ?? this.inchargeName,
      inchargePhone: inchargePhone ?? this.inchargePhone,
      totalEnrolledBeneficiaries: totalEnrolledBeneficiaries ?? this.totalEnrolledBeneficiaries,
      activeCameras: activeCameras ?? this.activeCameras,
      totalCameras: totalCameras ?? this.totalCameras,
      complianceScore: complianceScore ?? this.complianceScore,
      riskLevel: riskLevel ?? this.riskLevel,
      isFlaggedForInspection: isFlaggedForInspection ?? this.isFlaggedForInspection,
      lastInspectionDate: lastInspectionDate ?? this.lastInspectionDate,
    );
  }
}
