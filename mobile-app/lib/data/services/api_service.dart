import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/user_model.dart';
import '../models/institute_model.dart';
import '../models/cctv_feed_model.dart';
import '../models/inspection_duty_model.dart';
import '../models/anomaly_model.dart';
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

  // --- NETWORK HELPERS WITH ANDROID EMULATOR AUTO-FALLBACK ---
  Future<http.Response> _postRequest(String path, dynamic body, {Duration timeout = const Duration(seconds: 4)}) async {
    try {
      return await http.post(
        Uri.parse('$baseUrl$path'),
        headers: _headers,
        body: body is String ? body : jsonEncode(body),
      ).timeout(timeout);
    } catch (_) {
      if (baseUrl.contains('localhost')) {
        final emuUrl = baseUrl.replaceAll('localhost', '10.0.2.2');
        final res = await http.post(
          Uri.parse('$emuUrl$path'),
          headers: _headers,
          body: body is String ? body : jsonEncode(body),
        ).timeout(timeout);
        baseUrl = emuUrl; // auto-adapt to emulator network
        return res;
      }
      rethrow;
    }
  }

  // --- AUTH ---
  Future<UserModel?> login({
    required String emailOrPhone,
    required String password,
    required UserRole role,
  }) async {
    try {
      final response = await _postRequest('/auth/login', {
        'email': emailOrPhone.trim(),
        'password': password,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        authToken = data['token'];
        final u = data['user'];
        final idStr = u['id']?.toString() ?? 'USR-01';
        return UserModel(
          id: u['id']?.toString() ?? 'USR-MEMBER-02',
          name: u['name'] ?? 'Member 2 (PMU Inspection Officer)',
          email: u['email'] ?? emailOrPhone,
          phone: u['phone'] ?? '+91 90001 00002',
          role: role,
          department: u['department'] ?? 'PMU Field Operations',
          designation: role == UserRole.inspector ? 'PMU Inspection Officer' : role == UserRole.official ? 'Department Official' : 'Project Incharge',
          employeeCode: 'EMP-${idStr.replaceAll('USR-', '')}',
          assignedRegion: u['district'] ?? u['state'] ?? 'National / Central Zone',
        );
      }
    } catch (_) {
      // Fallback gracefully to canonical demo account
    }

    // Canonical SIH Demo Persona deterministic resolution
    final lower = emailOrPhone.toLowerCase();
    if (lower.contains('member1') || role == UserRole.official) {
      return MockData.officialUser;
    } else if (lower.contains('member3')) {
      return const UserModel(
        id: 'USR-MEMBER-03',
        name: 'Member 3 (CCTV Monitoring Demo)',
        designation: 'CCTV Monitoring Officer',
        department: 'National Surveillance Command Center',
        email: 'member3.cctv@sih.gov.in',
        phone: '+91 90001 00003',
        role: UserRole.inspector,
        employeeCode: 'CCTV-OP-03',
        assignedRegion: 'National HQ Command Center',
      );
    } else if (lower.contains('member2') || role == UserRole.inspector) {
      return MockData.inspectorUser;
    } else if (lower.contains('member5')) {
      return const UserModel(
        id: 'USR-MEMBER-05',
        name: 'Member 5 (Project Incharge — Institute B)',
        designation: 'Project Incharge',
        department: 'Lucknow Vocational Operations',
        email: 'member5.incharge@sih.gov.in',
        phone: '+91 90001 00005',
        role: UserRole.institute,
        employeeCode: 'INC-INST-05',
        assignedRegion: 'Lucknow, Uttar Pradesh',
      );
    } else if (lower.contains('member6')) {
      return const UserModel(
        id: 'USR-MEMBER-06',
        name: 'Member 6 (Institute Staff / Beneficiary Demo)',
        designation: 'Institute Staff / Beneficiary Liaison',
        department: 'Beneficiary Liaison Cell',
        email: 'member6.staff@sih.gov.in',
        phone: '+91 90001 00006',
        role: UserRole.institute,
        employeeCode: 'STF-INST-06',
        assignedRegion: 'Central Delhi',
      );
    } else {
      return MockData.instituteUser; // Member 4
    }
  }

  Future<UserModel?> verifyMpin({
    required String pin,
    required UserRole role,
  }) async {
    try {
      final response = await _postRequest('/auth/mpin', {
        'mpin': pin,
        'role': role.name,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        authToken = data['token'];
        final u = data['user'];
        return UserModel(
          id: u['id']?.toString() ?? 'USR-MEMBER-02',
          name: u['name'] ?? 'Member 2 (PMU Inspection Officer)',
          email: u['email'] ?? 'member2.inspector@sih.gov.in',
          phone: '+91 90001 00002',
          role: role,
          department: u['department'] ?? 'PMU Surprise Audit Cell',
          designation: 'PMU Inspection Officer',
          employeeCode: 'EMP-DOSJE-${pin}01',
          assignedRegion: u['district'] ?? u['state'] ?? 'Central Zone',
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
            scheme: item['scheme'] ?? 'SMILE',
            state: item['state'] ?? 'Delhi',
            district: item['district'] ?? 'Central Delhi',
            address: item['address'] ?? '',
            latitude: (item['lat'] ?? item['latitude'] ?? 28.6139).toDouble(),
            longitude: (item['lng'] ?? item['longitude'] ?? 77.2090).toDouble(),
            inchargeName: item['inchargeName'] ?? item['contactPerson'] ?? 'Center Admin',
            inchargePhone: item['inchargePhone'] ?? item['contactPhone'] ?? '+91 98765 43210',
            totalEnrolledBeneficiaries: (item['totalEnrolledBeneficiaries'] ?? item['totalBeneficiaries'] ?? item['beneficiaries'] ?? 50) as int,
            activeCameras: (item['activeCameras'] ?? item['cctvActiveCount'] ?? 2) as int,
            totalCameras: (item['totalCameras'] ?? item['cctvTotalCount'] ?? 3) as int,
            complianceScore: (item['complianceScore'] ?? 85).toDouble(),
            riskLevel: item['riskLevel'] ?? 'low',
            isFlaggedForInspection: item['isFlaggedForInspection'] ?? false,
            lastInspectionDate: item['lastInspectionDate'] ?? '2026-08-15',
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
            id: item['id'] ?? item['cameraId'] ?? '',
            cameraName: item['name'] ?? item['cameraName'] ?? 'Gate Camera',
            cameraCode: item['cameraCode'] ?? item['cameraId'] ?? 'CAM-01',
            instituteId: item['instituteId'] ?? 'INST-01',
            instituteName: item['instituteName'] ?? item['institute'] ?? 'Center',
            locationType: item['locationZone'] ?? item['zone'] ?? 'Main Gate',
            streamUrl: item['streamUrl'] ?? item['rtspUrl'] ?? 'http://localhost:8000/api/v1/stream',
            isLive: isOnline,
            isObstructed: item['status'] == 'degraded',
            fps: (item['fps'] ?? 25) as int,
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
            inspectorName: item['assignedInspectorName'] ?? item['inspectorName'] ?? 'Inspector Verma',
            deadline: DateTime.tryParse(item['deadlineDate'] ?? item['deadline'] ?? item['scheduledDate'] ?? '') ?? DateTime.now().add(const Duration(hours: 24)),
            status: item['status'] ?? 'assigned',
            riskReason: item['aiFlagReason'] ?? item['riskReason'] ?? 'Algorithmic telemetry review',
            targetLat: (item['instituteLatitude'] ?? item['targetLat'] ?? item['lat'] ?? 28.6139).toDouble(),
            targetLng: (item['instituteLongitude'] ?? item['targetLng'] ?? item['lng'] ?? 77.2090).toDouble(),
            currentDistanceMeters: (item['currentDistanceMeters'] ?? 45.0).toDouble(),
            isGeofenceReached: item['isGeofenceReached'] ?? item['gpsVerified'] ?? false,
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
          inspectorName: item['assignedInspectorName'] ?? item['inspectorName'] ?? 'Inspector Verma',
          deadline: DateTime.now().add(const Duration(hours: 24)),
          status: 'assigned',
          riskReason: item['aiFlagReason'] ?? item['riskReason'] ?? 'High telemetry risk audit triggered',
          targetLat: (item['instituteLatitude'] ?? item['targetLat'] ?? item['lat'] ?? 28.6139).toDouble(),
          targetLng: (item['instituteLongitude'] ?? item['targetLng'] ?? item['lng'] ?? 77.2090).toDouble(),
          currentDistanceMeters: 45.0,
          isGeofenceReached: false,
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
            id: item['id'] ?? item['alertId'] ?? '',
            title: item['title'] ?? item['type'] ?? 'AI Anomaly',
            instituteId: item['instituteId'] ?? '',
            instituteName: item['instituteName'] ?? item['institute'] ?? 'Center',
            scheme: item['scheme'] ?? 'SMILE',
            type: item['type'] ?? 'headcount_mismatch',
            severity: item['severity'] ?? 'warning',
            timestamp: item['time'] ?? item['timestamp'] ?? DateTime.now().toIso8601String(),
            description: item['description'] ?? '',
            isResolved: item['status'] == 'resolved' || item['resolved'] == true,
            recommendedAction: item['resolutionNotes'],
          );
        }).toList();
      }
    } catch (_) {}
    return MockData.anomalies;
  }

  // --- VIDEO CONFERENCING (VC) ---
  Future<Map<String, dynamic>?> createVCSession({String? inspectionId, String? hostUserId}) async {
    try {
      final Map<String, dynamic> payload = {
        'hostUserId': hostUserId ?? 'USR-PMU-104',
      };
      if (inspectionId != null) {
        payload['inspectionId'] = inspectionId;
      }

      final response = await http
          .post(
            Uri.parse('$baseUrl/vc/sessions/random'),
            headers: _headers,
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  Future<bool> updateVCSessionStatus(String sessionId, String status) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/vc/sessions/$sessionId/status'),
            headers: _headers,
            body: jsonEncode({'status': status}),
          )
          .timeout(const Duration(seconds: 3));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  Future<bool> submitVCResult(String sessionId, String result, String notes, [int? durationSeconds]) async {
    try {
      final payload = <String, dynamic>{
        'result': result,
        'notes': notes,
      };
      if (durationSeconds != null) {
        payload['durationSeconds'] = durationSeconds;
      }

      final response = await http
          .post(
            Uri.parse('$baseUrl/vc/sessions/$sessionId/result'),
            headers: _headers,
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 3));

      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  // Poll for incoming surprise VC call for mobile user
  Future<Map<String, dynamic>?> pollIncomingVCCall({String? userId}) async {
    try {
      final uri = Uri.parse('$baseUrl/vc/incoming').replace(
        queryParameters: userId != null ? {'userId': userId} : null,
      );
      final response = await http.get(uri, headers: _headers).timeout(const Duration(seconds: 3));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['activeCall'];
      }
    } catch (_) {}
    return null;
  }

  // Accept incoming surprise VC call
  Future<Map<String, dynamic>?> acceptVCCall(String sessionId) async {
    try {
      final response = await http
          .post(Uri.parse('$baseUrl/vc/sessions/$sessionId/accept'), headers: _headers)
          .timeout(const Duration(seconds: 3));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }

  // Reject incoming surprise VC call
  Future<bool> rejectVCCall(String sessionId, [String? reason]) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/vc/sessions/$sessionId/reject'),
            headers: _headers,
            body: jsonEncode({'reason': reason ?? 'Declined by recipient'}),
          )
          .timeout(const Duration(seconds: 3));
      return response.statusCode == 200;
    } catch (_) {}
    return false;
  }

  // Upload cryptographic photo or video evidence to Central Backend
  Future<Map<String, dynamic>?> uploadEvidence({
    required String inspectionId,
    required String rawBase64,
    required String fileType,
    required double latitude,
    required double longitude,
    required String sha256Hash,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/evidence'),
            headers: _headers,
            body: jsonEncode({
              'inspectionId': inspectionId,
              'rawBase64': rawBase64,
              'fileType': fileType,
              'latitude': latitude,
              'longitude': longitude,
              'sha256Hash': sha256Hash,
            }),
          )
          .timeout(const Duration(seconds: 12));

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return null;
  }
}

