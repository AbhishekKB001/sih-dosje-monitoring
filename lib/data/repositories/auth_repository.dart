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
