import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/inspection_duty_model.dart';
import '../../viewmodels/inspection_viewmodel.dart';
import 'inspection_detail_view.dart';

class InspectionDutyListView extends StatefulWidget {
  const InspectionDutyListView({super.key});

  @override
  State<InspectionDutyListView> createState() => _InspectionDutyListViewState();
}

class _InspectionDutyListViewState extends State<InspectionDutyListView> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inspVM = context.watch<InspectionViewModel>();
    final pendingDuties = inspVM.duties.where((d) => d.status != 'completed').toList();
    final completedDuties = inspVM.duties.where((d) => d.status == 'completed').toList();

    return Scaffold(
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(48),
        child: Container(
          color: Colors.white,
          child: TabBar(
            controller: _tabController,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textSecondaryLight,
            indicatorColor: AppColors.primary,
            indicatorWeight: 3,
            tabs: [
              Tab(text: 'Active Duties (${pendingDuties.length})'),
              Tab(text: 'Completed Audits (${completedDuties.length})'),
            ],
          ),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildDutyList(context, pendingDuties, inspVM, isPending: true),
          _buildDutyList(context, completedDuties, inspVM, isPending: false),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('AI Algorithm evaluating institute anomalies...')),
          );
          final duty = await inspVM.triggerAIAssignment();
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Surprise duty generated: ${duty.dutyCode}'),
                backgroundColor: AppColors.primaryLight,
              ),
            );
          }
        },
        backgroundColor: AppColors.saffron,
        icon: const Icon(Icons.auto_awesome, color: Colors.white),
        label: const Text(
          'AI Random Assigner',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildDutyList(
    BuildContext context,
    List<InspectionDutyModel> duties,
    InspectionViewModel inspVM, {
    required bool isPending,
  }) {
    if (duties.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.assignment_turned_in, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(
              isPending ? 'No pending surprise duties.' : 'No completed audits yet.',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: duties.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final duty = duties[index];
        final isUnlocked = duty.isGeofenceReached;

        return InkWell(
          onTap: () {
            inspVM.selectDuty(duty);
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => InspectionDetailView(duty: duty),
              ),
            );
          },
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: isPending
                    ? (isUnlocked ? AppColors.emeraldGreen : AppColors.saffron.withValues(alpha: 0.5))
                    : AppColors.borderLight,
                width: 1.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 6,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Code & Status Pill
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        duty.dutyCode,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isPending
                            ? (isUnlocked ? Colors.green.shade50 : Colors.amber.shade50)
                            : Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        isPending
                            ? (isUnlocked ? 'GEOFENCE UNLOCKED' : 'APPROACHING SITE')
                            : 'AUDIT COMPLETED',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isPending
                              ? (isUnlocked ? AppColors.emeraldGreen : AppColors.alertAmber)
                              : AppColors.primary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  duty.instituteName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimaryLight,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Scheme: ${duty.schemeName}',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondaryLight),
                ),
                const SizedBox(height: 8),

                // Risk trigger reason
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.info_outline, size: 14, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          duty.riskReason,
                          style: const TextStyle(fontSize: 11, color: AppColors.textPrimaryLight),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Distance & Checklist summary
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.location_on,
                          size: 14,
                          color: isUnlocked ? AppColors.emeraldGreen : AppColors.alertAmber,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          isUnlocked ? 'Within 45m' : '${duty.currentDistanceMeters.toStringAsFixed(0)}m away',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isUnlocked ? AppColors.emeraldGreen : AppColors.alertAmber,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '${duty.checklist.length} Checkpoints',
                      style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
