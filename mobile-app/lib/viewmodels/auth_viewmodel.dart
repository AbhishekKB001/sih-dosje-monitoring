import 'package:flutter/foundation.dart';
import '../data/models/user_model.dart';
import '../data/repositories/auth_repository.dart';

class AuthViewModel extends ChangeNotifier {
  final AuthRepository _authRepository;

  AuthViewModel({required this._authRepository}) {
    _currentUser = _authRepository.currentUser;
  }

  UserModel? _currentUser;
  UserModel? get currentUser => _currentUser;

  UserRole _selectedRole = UserRole.official;
  UserRole get selectedRole => _selectedRole;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isAuthenticated = true; // Pre-authenticated for quick demoing, toggleable
  bool get isAuthenticated => _isAuthenticated;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  void selectRole(UserRole role) {
    _selectedRole = role;
    notifyListeners();
  }

  Future<bool> login({
    required String emailOrPhone,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentUser = await _authRepository.login(
        emailOrPhone: emailOrPhone,
        password: password,
        role: _selectedRole,
      );
      _isAuthenticated = true;
      return true;
    } catch (e) {
      _errorMessage = 'Login failed. Please check your credentials.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> verifyMpinOrBiometric(String pin) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _currentUser = await _authRepository.verifyMpinOrBiometric(
        pin: pin,
        role: _selectedRole,
      );
      _isAuthenticated = true;
      return true;
    } catch (e) {
      _errorMessage = 'Invalid MPIN or Biometric mismatch.';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Quick Role Switcher for SIH Jury / Evaluator demonstration
  void switchDemoRole(UserRole newRole) {
    _selectedRole = newRole;
    _authRepository.switchRole(newRole);
    _currentUser = _authRepository.currentUser;
    notifyListeners();
  }

  Future<void> logout() async {
    await _authRepository.logout();
    _isAuthenticated = false;
    notifyListeners();
  }
}
