import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../viewmodels/cctv_viewmodel.dart';
import '../../widgets/live_cctv_card.dart';
import 'cctv_player_view.dart';

class CCTVGridView extends StatelessWidget {
  const CCTVGridView({super.key});

  static const List<String> _locations = [
    'All',
    'Main Gate',
    'Classroom',
    'Dining Hall',
    'Dormitory',
    'Office',
  ];

  @override
  Widget build(BuildContext context) {
    final cctvVM = context.watch<CCTVViewModel>();
    final feeds = cctvVM.feeds;

    return Column(
      children: [
        // Location Filters Header
        Container(
          color: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Live Surveillance (${feeds.where((f) => f.isLive).length}/${feeds.length} Active)',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimaryLight,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.emeraldGreen.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.circle, color: AppColors.emeraldGreen, size: 8),
                        SizedBox(width: 4),
                        Text(
                          'RTSP Cloud Live',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: AppColors.emeraldGreen,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _locations.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                  itemBuilder: (context, index) {
                    final loc = _locations[index];
                    final isSelected = cctvVM.selectedLocationFilter == loc;

                    return FilterChip(
                      label: Text(loc),
                      selected: isSelected,
                      selectedColor: AppColors.primary,
                      labelStyle: TextStyle(
                        fontSize: 11,
                        color: isSelected ? Colors.white : AppColors.textPrimaryLight,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      backgroundColor: Colors.grey.shade100,
                      side: BorderSide(
                        color: isSelected ? AppColors.primary : AppColors.borderLight,
                      ),
                      onSelected: (_) => cctvVM.setLocationFilter(loc),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1, thickness: 1, color: AppColors.borderLight),

        // Grid View of CCTV streams
        Expanded(
          child: feeds.isEmpty
              ? const Center(
                  child: Text('No CCTV feeds match the selected filter.'),
                )
              : RefreshIndicator(
                  onRefresh: () => cctvVM.loadFeeds(),
                  child: GridView.builder(
                    padding: const EdgeInsets.all(14),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 1, // Full card width on mobile for realistic view
                      mainAxisSpacing: 14,
                      childAspectRatio: 1.7,
                    ),
                    itemCount: feeds.length,
                    itemBuilder: (context, index) {
                      final feed = feeds[index];
                      return LiveCCTVCard(
                        feed: feed,
                        onTap: () {
                          cctvVM.setActiveFeed(feed);
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => CCTVPlayerView(feed: feed),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ),
        ),
      ],
    );
  }
}
