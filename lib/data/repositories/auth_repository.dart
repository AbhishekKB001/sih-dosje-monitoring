import '../models/user_model.dart';
import '../../core/constants/mock_data.dart';

class AuthRepository {
  UserModel _currentUser = MockData.officialUser;

  UserModel get currentUser => _currentUser;

  Future<UserModel> login({
    required String emailOrPhone,
    required String password,
    required UserRole role,
  }) async {
    // Simulate network latency
    await Future.delayed(const Duration(milliseconds: 500));

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
    await Future.delayed(const Duration(milliseconds: 400));
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
    await Future.delayed(const Duration(milliseconds: 200));
  }
}
