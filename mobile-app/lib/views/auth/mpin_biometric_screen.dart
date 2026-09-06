import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../dashboard/main_navigation_screen.dart';

class MpinBiometricScreen extends StatefulWidget {
  const MpinBiometricScreen({super.key});

  @override
  State<MpinBiometricScreen> createState() => _MpinBiometricScreenState();
}

class _MpinBiometricScreenState extends State<MpinBiometricScreen> {
  String _pin = '';

  void _onKeyPress(String val) {
    if (_pin.length < 4) {
      setState(() {
        _pin += val;
      });
      if (_pin.length == 4) {
        _verifyPin();
      }
    }
  }

  void _onBackspace() {
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
      });
    }
  }

  void _verifyPin() async {
    final authVM = Provider.of<AuthViewModel>(context, listen: false);
    final success = await authVM.verifyMpinOrBiometric(_pin);
    if (success && mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
        (route) => false,
      );
    } else if (mounted) {
      setState(() {
        _pin = '';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Incorrect MPIN. Please try again or use Biometrics.'),
          backgroundColor: AppColors.alertRed,
        ),
      );
    }
  }

  void _triggerBiometricAuth() async {
    final authVM = Provider.of<AuthViewModel>(context, listen: false);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Scanning Fingerprint / Face ID...'),
        duration: Duration(milliseconds: 1000),
      ),
    );
    await Future.delayed(const Duration(milliseconds: 900));
    final success = await authVM.verifyMpinOrBiometric('1234');
    if (success && mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final authVM = context.watch<AuthViewModel>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('MPIN & Biometric Auth'),
      ),
      body: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            CircleAvatar(
              radius: 36,
              backgroundColor: AppColors.primary.withValues(alpha: 0.1),
              child: const Icon(
                Icons.lock_person,
                size: 38,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Enter 4-Digit MPIN',
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimaryLight,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'For: ${authVM.currentUser?.name ?? "Officer"} (${authVM.selectedRole.badgeText})',
              style: const TextStyle(
                fontSize: 13,
                color: AppColors.textSecondaryLight,
              ),
            ),
            const SizedBox(height: 28),

            // 4 Pin Dots
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(4, (index) {
                final isFilled = index < _pin.length;
                return Container(
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  width: 16,
                  height: 16,
                  decoration: BoxDecoration(
                    color: isFilled ? AppColors.primary : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isFilled ? AppColors.primary : Colors.grey.shade400,
                      width: 2,
                    ),
                  ),
                );
              }),
            ),
            const Spacer(),

            // Custom Numeric Keypad
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 16),
              child: Column(
                children: [
                  _buildKeypadRow(['1', '2', '3']),
                  const SizedBox(height: 16),
                  _buildKeypadRow(['4', '5', '6']),
                  const SizedBox(height: 16),
                  _buildKeypadRow(['7', '8', '9']),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Biometric quick trigger button
                      InkWell(
                        onTap: _triggerBiometricAuth,
                        borderRadius: BorderRadius.circular(40),
                        child: Container(
                          width: 68,
                          height: 68,
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.fingerprint,
                            size: 36,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      // '0' button
                      _buildKey('0'),
                      // Backspace button
                      InkWell(
                        onTap: _onBackspace,
                        borderRadius: BorderRadius.circular(40),
                        child: Container(
                          width: 68,
                          height: 68,
                          alignment: Alignment.center,
                          child: const Icon(
                            Icons.backspace_outlined,
                            size: 26,
                            color: AppColors.textPrimaryLight,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildKeypadRow(List<String> keys) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: keys.map((k) => _buildKey(k)).toList(),
    );
  }

  Widget _buildKey(String value) {
    return InkWell(
      onTap: () => _onKeyPress(value),
      borderRadius: BorderRadius.circular(40),
      child: Container(
        width: 68,
        height: 68,
        decoration: BoxDecoration(
          color: Colors.white,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
          border: Border.all(color: AppColors.borderLight),
        ),
        alignment: Alignment.center,
        child: Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimaryLight,
          ),
        ),
      ),
    );
  }
}
