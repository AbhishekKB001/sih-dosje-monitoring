import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_strings.dart';
import '../../data/models/user_model.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../widgets/custom_app_bar.dart';
import 'official_dashboard_view.dart';
import 'inspector_dashboard_view.dart';
import 'institute_dashboard_view.dart';
import '../cctv/cctv_grid_view.dart';
import '../inspection/inspection_duty_list_view.dart';
import '../analytics/anomaly_alerts_view.dart';
import '../profile/profile_view.dart';
import '../video_call/random_vc_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  void _onTabSelected(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authVM = context.watch<AuthViewModel>();
    final currentRole = authVM.selectedRole;

    Widget dashboardBody;
    switch (currentRole) {
      case UserRole.official:
        dashboardBody = OfficialDashboardView(onNavigateTab: _onTabSelected);
        break;
      case UserRole.inspector:
        dashboardBody = InspectorDashboardView(onNavigateTab: _onTabSelected);
        break;
      case UserRole.institute:
        dashboardBody = InstituteDashboardView(onNavigateTab: _onTabSelected);
        break;
    }

    final List<Widget> pages = [
      dashboardBody,
      const CCTVGridView(),
      const InspectionDutyListView(),
      const AnomalyAlertsView(),
      const ProfileView(),
    ];

    return Scaffold(
      appBar: CustomAppBar(
        title: _getAppBarTitle(_currentIndex),
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      floatingActionButton: _currentIndex == 0
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const RandomVcScreen()),
                );
              },
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.video_call, color: AppColors.saffron),
              label: const Text(
                'Surprise VC',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            )
          : null,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _onTabSelected,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.videocam_outlined),
            selectedIcon: Icon(Icons.videocam),
            label: 'CCTV Feeds',
          ),
          NavigationDestination(
            icon: Icon(Icons.fact_check_outlined),
            selectedIcon: Icon(Icons.fact_check),
            label: 'Inspections',
          ),
          NavigationDestination(
            icon: Icon(Icons.crisis_alert_outlined),
            selectedIcon: Icon(Icons.crisis_alert),
            label: 'AI Alerts',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  String _getAppBarTitle(int index) {
    switch (index) {
      case 0:
        return AppStrings.appName;
      case 1:
        return AppStrings.liveCCTV;
      case 2:
        return AppStrings.inspections;
      case 3:
        return AppStrings.anomalies;
      case 4:
        return AppStrings.profile;
      default:
        return AppStrings.appName;
    }
  }
}
