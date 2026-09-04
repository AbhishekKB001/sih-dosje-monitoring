import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'core/theme/app_theme.dart';
import 'core/constants/app_strings.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/cctv_repository.dart';
import 'data/repositories/inspection_repository.dart';
import 'data/repositories/notification_repository.dart';
import 'viewmodels/auth_viewmodel.dart';
import 'viewmodels/cctv_viewmodel.dart';
import 'viewmodels/inspection_viewmodel.dart';
import 'viewmodels/dashboard_viewmodel.dart';
import 'viewmodels/video_call_viewmodel.dart';
import 'viewmodels/notification_viewmodel.dart';
import 'views/auth/splash_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Set preferred orientations & status bar overlay
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize Repositories
  final authRepository = AuthRepository();
  final cctvRepository = CCTVRepository();
  final inspectionRepository = InspectionRepository();
  final notificationRepository = NotificationRepository();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthViewModel(authRepository: authRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => CCTVViewModel(cctvRepository: cctvRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => InspectionViewModel(inspectionRepository: inspectionRepository),
        ),
        ChangeNotifierProvider(
          create: (_) => DashboardViewModel(
            inspectionRepository: inspectionRepository,
            cctvRepository: cctvRepository,
          ),
        ),
        ChangeNotifierProvider(
          create: (_) => VideoCallViewModel(),
        ),
        ChangeNotifierProvider(
          create: (_) => NotificationViewModel(notificationRepository: notificationRepository),
        ),
      ],
      child: const DosjeDrishtiApp(),
    ),
  );
}

class DosjeDrishtiApp extends StatelessWidget {
  const DosjeDrishtiApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AppStrings.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.light,
      home: const SplashScreen(),
    );
  }
}
