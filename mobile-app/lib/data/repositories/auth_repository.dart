import '../models/user_model.dart';
import '../services/api_service.dart';
import '../../core/constants/mock_data.dart';

class AuthRepository {
  UserModel _currentUser = MockData.officialUser;
  final ApiService _api = ApiService();

  UserModel get currentUser => _currentUser;

  Future<UserModel> login({
    required String emailOrPhone,
    required String password,
    required UserRole role,
  }) async {
    final liveUser = await _api.login(
      emailOrPhone: emailOrPhone,
      password: password,
      role: role,
    );

    if (liveUser != null) {
      _currentUser = liveUser;
      return _currentUser;
    }

    final lower = emailOrPhone.toLowerCase();
    if (lower.contains('member1') || role == UserRole.official) {
      _currentUser = MockData.officialUser;
    } else if (lower.contains('member3')) {
      _currentUser = const UserModel(
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
      _currentUser = MockData.inspectorUser;
    } else if (lower.contains('member5')) {
      _currentUser = const UserModel(
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
      _currentUser = const UserModel(
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
      _currentUser = MockData.instituteUser;
    }
    return _currentUser;
  }

  Future<UserModel> verifyMpinOrBiometric({
    required String pin,
    required UserRole role,
  }) async {
    final liveUser = await _api.verifyMpin(pin: pin, role: role);
    if (liveUser != null) {
      _currentUser = liveUser;
      return _currentUser;
    }

    switch (role) {
      case UserRole.official:
        _currentUser = MockData.officialUser;
        break;
      case UserRole.inspector:
        _currentUser = MockData.inspectorUser;
        break;
      case UserRole.institute:
        _currentUser = MockData.instituteUser;
        break;
    }
    return _currentUser;
  }

  void switchRole(UserRole newRole) {
    switch (newRole) {
      case UserRole.official:
        _currentUser = MockData.officialUser;
        break;
      case UserRole.inspector:
        _currentUser = MockData.inspectorUser;
        break;
      case UserRole.institute:
        _currentUser = MockData.instituteUser;
        break;
    }
  }

  Future<void> logout() async {
    _api.authToken = null;
    await Future.delayed(const Duration(milliseconds: 100));
  }
}
