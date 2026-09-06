import 'package:flutter/foundation.dart';
import '../data/models/institute_model.dart';
import '../data/models/anomaly_model.dart';
import '../data/repositories/inspection_repository.dart';
import '../data/repositories/cctv_repository.dart';

class DashboardViewModel extends ChangeNotifier {
  final InspectionRepository _inspectionRepository;
  final CCTVRepository _cctvRepository;

  DashboardViewModel({
    required this._inspectionRepository,
    required this._cctvRepository,
  });

  CCTVRepository get cctvRepository => _cctvRepository;

  String _selectedScheme = 'All Schemes';
  String get selectedScheme => _selectedScheme;

  bool _isAutoRefreshing = true;
  bool get isAutoRefreshing => _isAutoRefreshing;

  void setSelectedScheme(String scheme) {
    _selectedScheme = scheme;
    notifyListeners();
  }

  void toggleAutoRefresh() {
    _isAutoRefreshing = !_isAutoRefreshing;
    notifyListeners();
  }

  List<InstituteModel> get filteredInstitutes {
    final list = _inspectionRepository.institutes;
    if (_selectedScheme == 'All Schemes') return list;
    return list.where((i) => i.scheme == _selectedScheme).toList();
  }

  int get totalInstitutes => filteredInstitutes.length;

  int get activeCCTVCount {
    return filteredInstitutes.fold(0, (sum, i) => sum + i.activeCameras);
  }

  int get totalCCTVCount {
    return filteredInstitutes.fold(0, (sum, i) => sum + i.totalCameras);
  }

  int get totalBeneficiaries {
    return filteredInstitutes.fold(0, (sum, i) => sum + i.totalEnrolledBeneficiaries);
  }

  int get pendingInspectionsCount {
    return _inspectionRepository.duties.where((d) => d.status != 'completed').length;
  }

  int get completedInspectionsCount {
    return _inspectionRepository.duties.where((d) => d.status == 'completed').length;
  }

  List<AnomalyModel> get activeAnomalies {
    final list = _inspectionRepository.anomalies.where((a) => !a.isResolved).toList();
    if (_selectedScheme == 'All Schemes') return list;
    return list.where((a) => a.scheme == _selectedScheme).toList();
  }

  int get criticalAnomaliesCount {
    return activeAnomalies.where((a) => a.severity == 'critical').length;
  }

  void resolveAnomaly(String anomalyId) {
    _inspectionRepository.resolveAnomaly(anomalyId);
    notifyListeners();
  }
}
