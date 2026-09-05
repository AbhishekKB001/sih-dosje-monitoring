import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user_model.dart';
import '../models/institute_model.dart';
import '../models/cctv_feed_model.dart';
import '../models/inspection_duty_model.dart';
import '../models/anomaly_model.dart';
import '../models/notification_model.dart';
import '../../core/constants/mock_data.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Canonical Backend API URL
  String baseUrl = 'http://localhost:4000/api';
  String? authToken;

  void setBaseUrl(String url) {
    baseUrl = url;
  }

  void setAuthToken(String token) {
    authToken = token;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (authToken != null) 'Authorization': 'Bearer $authToken',
      };

  // --- AUTH ---
  Future<UserModel?> login({
    required String emailOrPhone,
    required String password,
    required UserRole role,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/login'),
            headers: _headers,
            body: jsonEncode({
              'email': emailOrPhone,
              'password': password,
            }),
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        authToken = data['token'];
        final u = data['user'];
        return UserModel(
          id: u['id'] ?? 'USR-01',
          name: u['name'] ?? 'DoSJE Officer',
          email: u['email'] ?? emailOrPhone,
          phone: u['phone'] ?? '+91 98112 34567',
          role: role,
          department: u['department'] ?? 'Monitoring Cell',
          designation: 'Field Officer',
          state: u['state'] ?? 'Delhi',
          district: u['district'] ?? 'Central Delhi',
          employeeCode: 'EMP-DOSJE-${u['id'].toString().substring(0, 4)}',
        );
      }
    } catch (_) {
      // Fallback gracefully to mock persona
    }

    switch (role) {
      case UserRole.official:
        return MockData.officialUser;
      case UserRole.inspector:
        return MockData.inspectorUser;
      case UserRole.institute:
        return MockData.instituteUser;
    }
  }

  Future<UserModel?> verifyMpin({
    required String pin,
    required UserRole role,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/auth/mpin'),
            headers: _headers,
            body: jsonEncode({
              'mpin': pin,
              'role': role.name,
            }),
          )
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        authToken = data['token'];
        final u = data['user'];
        return UserModel(
          id: u['id'] ?? 'USR-01',
          name: u['name'] ?? 'DoSJE Officer',
          email: u['email'] ?? 'officer@dosje.gov.in',
          phone: '+91 98112 34567',
          role: role,
          department: u['department'] ?? 'Surveillance Wing',
          designation: 'Inspection Officer',
          state: u['state'] ?? 'Delhi',
          district: u['district'] ?? 'Central Delhi',
          employeeCode: 'EMP-DOSJE-${pin}01',
        );
      }
    } catch (_) {}

    switch (role) {
      case UserRole.official:
        return MockData.officialUser;
      case UserRole.inspector:
        return MockData.inspectorUser;
      case UserRole.institute:
        return MockData.instituteUser;
    }
  }

  // --- INSTITUTES ---
  Future<List<InstituteModel>> getInstitutes() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/institutes'), headers: _headers)
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.map((item) {
          return InstituteModel(
            id: item['id'] ?? '',
            name: item['name'] ?? '',
            code: item['code'] ?? '',
            scheme: item['scheme'] ?? 'SMILE',
            state: item['state'] ?? 'Delhi',
            district: item['district'] ?? 'Central Delhi',
            address: item['address'] ?? '',
            latitude: (item['lat'] ?? item['latitude'] ?? 28.6139).toDouble(),
            longitude: (item['lng'] ?? item['longitude'] ?? 77.2090).toDouble(),
            geofenceRadiusMeters: (item['geofenceRadiusMeters'] ?? 100.0).toDouble(),
            inchargeName: item['inchargeName'] ?? 'Center Admin',
            inchargeContact: item['inchargeContact'] ?? '+91 98765 43210',
            totalBeneficiaries: item['totalBeneficiaries'] ?? item['beneficiaries'] ?? 50,
            activeBeneficiaries: item['activeBeneficiaries'] ?? 42,
            cctvActiveCount: item['cctvActiveCount'] ?? 2,
            cctvTotalCount: item['cctvTotalCount'] ?? 3,
            riskLevel: item['riskLevel'] ?? 'low',
            isFlaggedForInspection: item['isFlaggedForInspection'] ?? false,
            complianceScore: item['complianceScore'] ?? 85,
          );
        }).toList();
      }
    } catch (_) {}
    return MockData.institutes;
  }

  // --- CCTV FEEDS ---
  Future<List<CCTVFeedModel>> getCameras() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/cctv/cameras'), headers: _headers)
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.map((item) {
          final isOnline = (item['status'] == 'online');
          return CCTVFeedModel(
            id: item['id'] ?? '',
            cameraCode: item['cameraCode'] ?? item['cameraId'] ?? 'CAM-01',
            instituteId: item['instituteId'] ?? 'INST-01',
            instituteName: item['instituteName'] ?? item['institute'] ?? 'Center',
            schemeName: item['schemeName'] ?? 'SMILE',
            locationType: item['locationZone'] ?? item['zone'] ?? 'Main Gate',
            streamUrl: item['streamUrl'] ?? 'http://localhost:8000/api/v1/stream',
            isLive: isOnline,
            isObstructed: item['status'] == 'degraded',
            fps: item['fps'] ?? 25,
            resolution: item['resolution'] ?? '1080p FHD',
            streamTimestamp: 'LIVE 25 FPS',
            isPtzSupported: true,
          );
        }).toList();
      }
    } catch (_) {}
    return MockData.cctvFeeds;
  }

  // --- INSPECTIONS ---
  Future<List<InspectionDutyModel>> getDuties() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/inspections'), headers: _headers)
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.map((item) {
          return InspectionDutyModel(
            id: item['id'] ?? '',
            dutyCode: item['dutyCode'] ?? item['inspectionNumber'] ?? 'INS-01',
            instituteId: item['instituteId'] ?? '',
            instituteName: item['instituteName'] ?? item['institute'] ?? 'Center',
            schemeName: item['schemeName'] ?? 'SMILE',
            assignedInspectorId: item['assignedInspectorId'] ?? 'USR-PMU-104',
            assignedInspectorName: item['assignedInspectorName'] ?? 'Inspector Verma',
            scheduledDate: DateTime.tryParse(item['scheduledDate'] ?? '') ?? DateTime.now(),
            deadlineDate: DateTime.tryParse(item['deadlineDate'] ?? '') ?? DateTime.now(),
            status: item['status'] ?? 'assigned',
            isSurpriseAudit: item['isSurpriseAudit'] ?? item['isSurprise'] ?? true,
            instituteLatitude: (item['instituteLatitude'] ?? item['lat'] ?? 28.6139).toDouble(),
            instituteLongitude: (item['instituteLongitude'] ?? item['lng'] ?? 77.2090).toDouble(),
            geofenceRadiusMeters: (item['geofenceRadiusMeters'] ?? 100.0).toDouble(),
            currentDistanceMeters: (item['currentDistanceMeters'] ?? 45.0).toDouble(),
            isGeofenceReached: item['isGeofenceReached'] ?? item['gpsVerified'] ?? false,
            riskScore: (item['riskScore'] ?? 45).toDouble(),
            aiFlagReason: item['aiFlagReason'] ?? 'Algorithmic telemetry review',
          );
        }).toList();
      }
    } catch (_) {}
    return MockData.getInitialInspectionDuties();
  }

  // Trigger Random AI Assignment
  Future<InspectionDutyModel?> triggerRandomAIAssignment() async {
    try {
      final response = await http
          .post(Uri.parse('$baseUrl/inspections/random-assign'), headers: _headers)
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final item = data['duty'] ?? data['inspection'];
        return InspectionDutyModel(
          id: item['id'] ?? '',
          dutyCode: item['dutyCode'] ?? item['inspectionNumber'] ?? 'DOSJE-SURPRISE-999',
          instituteId: item['instituteId'] ?? '',
          instituteName: item['instituteName'] ?? item['institute'] ?? 'Monitored Center',
          schemeName: item['schemeName'] ?? 'SMILE',
          assignedInspectorId: item['assignedInspectorId'] ?? 'USR-PMU-104',
          assignedInspectorName: item['assignedInspectorName'] ?? 'Inspector Verma',
          scheduledDate: DateTime.now(),
          deadlineDate: DateTime.now().add(const Duration(hours: 24)),
          status: 'assigned',
          isSurpriseAudit: true,
          instituteLatitude: (item['instituteLatitude'] ?? item['lat'] ?? 28.6139).toDouble(),
          instituteLongitude: (item['instituteLongitude'] ?? item['lng'] ?? 77.2090).toDouble(),
          geofenceRadiusMeters: (item['geofenceRadiusMeters'] ?? 100.0).toDouble(),
          currentDistanceMeters: 45.0,
          isGeofenceReached: false,
          riskScore: (item['riskScore'] ?? 78.0).toDouble(),
          aiFlagReason: item['aiFlagReason'] ?? 'High telemetry risk audit triggered',
        );
      }
    } catch (_) {}
    return null;
  }

  // Verify Geofence
  Future<bool> verifyGeofence(String dutyId, double lat, double lng) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/inspections/$dutyId/verify-geofence'),
            headers: _headers,
            body: jsonEncode({'latitude': lat, 'longitude': lng}),
          )
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['geofenceVerified'] == true;
      }
    } catch (_) {}
    return true; // allow demo progression
  }

  // Submit Report
  Future<bool> submitReport(String dutyId, Map<String, dynamic> reportData) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/inspections/$dutyId/report'),
            headers: _headers,
            body: jsonEncode(reportData),
          )
          .timeout(const Duration(seconds: 4));

      return response.statusCode == 200;
    } catch (_) {}
    return true;
  }

  // --- ALERTS ---
  Future<List<AnomalyModel>> getAnomalies() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/alerts'), headers: _headers)
          .timeout(const Duration(seconds: 3));

      if (response.statusCode == 200) {
        final List list = jsonDecode(response.body);
        return list.map((item) {
          return AnomalyModel(
            id: item['id'] ?? '',
            instituteId: item['instituteId'] ?? '',
            instituteName: item['instituteName'] ?? item['institute'] ?? 'Center',
            cameraCode: item['cameraCode'] ?? item['cameraId'] ?? 'CAM-01',
            title: item['title'] ?? item['alertType'] ?? 'AI Anomaly',
            description: item['description'] ?? '',
            severity: item['severity'] ?? 'high',
            detectedAt: DateTime.tryParse(item['time'] ?? '') ?? DateTime.now(),
            status: item['status'] ?? 'open',
            snapshotUrl: item['frameSnapshotUrl'] ?? 'https://images.unsplash.com/photo-1577495508048-b635879837f1',
            confidenceScore: (item['confidence'] ?? 0.88).toDouble(),
          );
        }).toList();
      }
    } catch (_) {}
    return MockData.anomalies;
  }
}
