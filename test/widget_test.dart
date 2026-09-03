import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';

import 'package:dosje_drishti/core/constants/app_strings.dart';
import 'package:dosje_drishti/data/models/user_model.dart';
import 'package:dosje_drishti/data/repositories/auth_repository.dart';
import 'package:dosje_drishti/data/repositories/cctv_repository.dart';
import 'package:dosje_drishti/data/repositories/inspection_repository.dart';
import 'package:dosje_drishti/data/repositories/notification_repository.dart';
import 'package:dosje_drishti/viewmodels/auth_viewmodel.dart';
import 'package:dosje_drishti/viewmodels/cctv_viewmodel.dart';
import 'package:dosje_drishti/viewmodels/inspection_viewmodel.dart';
import 'package:dosje_drishti/viewmodels/dashboard_viewmodel.dart';
import 'package:dosje_drishti/viewmodels/video_call_viewmodel.dart';
import 'package:dosje_drishti/viewmodels/notification_viewmodel.dart';
import 'package:dosje_drishti/views/auth/splash_screen.dart';

Widget createTestApp({required Widget child}) {
  final authRepository = AuthRepository();
  final cctvRepository = CCTVRepository();
  final inspectionRepository = InspectionRepository();
  final notificationRepository = NotificationRepository();

  return MultiProvider(
    providers: [
      ChangeNotifierProvider(create: (_) => AuthViewModel(authRepository: authRepository)),
      ChangeNotifierProvider(create: (_) => CCTVViewModel(cctvRepository: cctvRepository)),
      ChangeNotifierProvider(create: (_) => InspectionViewModel(inspectionRepository: inspectionRepository)),
      ChangeNotifierProvider(
        create: (_) => DashboardViewModel(
          inspectionRepository: inspectionRepository,
          cctvRepository: cctvRepository,
        ),
      ),
      ChangeNotifierProvider(create: (_) => VideoCallViewModel()),
      ChangeNotifierProvider(create: (_) => NotificationViewModel(notificationRepository: notificationRepository)),
    ],
    child: MaterialApp(
      home: child,
    ),
  );
}

void main() {
  testWidgets('SplashScreen renders branding and app title correctly', (WidgetTester tester) async {
    await tester.pumpWidget(createTestApp(child: const SplashScreen()));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.text(AppStrings.appName), findsOneWidget);
    expect(find.text(AppStrings.ministryName), findsOneWidget);
    expect(find.byIcon(Icons.visibility), findsOneWidget);

    // Settle splash screen timer and animation
    await tester.pumpAndSettle(const Duration(seconds: 3));
  });

  test('AuthViewModel role switching test', () {
    final authRepo = AuthRepository();
    final authVM = AuthViewModel(authRepository: authRepo);

    expect(authVM.selectedRole, UserRole.official);
    authVM.switchDemoRole(UserRole.inspector);
    expect(authVM.selectedRole, UserRole.inspector);
    expect(authVM.currentUser?.role, UserRole.inspector);
  });

  test('InspectionRepository and ViewModel geofence simulation test', () async {
    final inspRepo = InspectionRepository();
    final inspVM = InspectionViewModel(inspectionRepository: inspRepo);

    await inspVM.loadDuties();
    expect(inspVM.duties.isNotEmpty, true);

    final targetDuty = inspVM.duties.first;
    expect(targetDuty.isGeofenceReached, false);

    await inspVM.simulateArrivalAtGeofence(targetDuty.id);
    expect(inspVM.selectedDuty?.isGeofenceReached, true);
    expect(inspVM.selectedDuty?.currentDistanceMeters, 45.0);
  });

  test('DashboardViewModel aggregates correct metric tallies', () {
    final inspRepo = InspectionRepository();
    final cctvRepo = CCTVRepository();
    final dashVM = DashboardViewModel(inspectionRepository: inspRepo, cctvRepository: cctvRepo);

    expect(dashVM.totalInstitutes, greaterThan(0));
    expect(dashVM.totalCCTVCount, greaterThan(0));
    expect(dashVM.activeAnomalies.isNotEmpty, true);
  });
}
