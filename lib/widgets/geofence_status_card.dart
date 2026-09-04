import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class GeofenceStatusCard extends StatelessWidget {
  final double targetLat;
  final double targetLng;
  final double currentDistanceMeters;
  final bool isUnlocked;
  final VoidCallback onSimulateArrival;

  const GeofenceStatusCard({
    super.key,
    required this.targetLat,
    required this.targetLng,
    required this.currentDistanceMeters,
    required this.isUnlocked,
    required this.onSimulateArrival,
  });

  @override
  Widget build(BuildContext context) {
    final isWithinRange = currentDistanceMeters <= 100.0 || isUnlocked;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isWithinRange ? AppColors.emeraldGreen.withValues(alpha: 0.08) : AppColors.alertAmber.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isWithinRange ? AppColors.emeraldGreen : AppColors.alertAmber,
          width: 1.5,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Icon(
                    isWithinRange ? Icons.verified_user : Icons.location_searching,
                    color: isWithinRange ? AppColors.emeraldGreen : AppColors.alertAmber,
                    size: 22,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    isWithinRange ? 'GEOFENCE VERIFIED' : 'GEOFENCE LOCKED',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                      color: isWithinRange ? AppColors.emeraldGreen : AppColors.alertAmber,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isWithinRange ? AppColors.emeraldGreen : Colors.grey.shade700,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  isWithinRange ? 'UNLOCKED' : '100m Required',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            isWithinRange
                ? 'Inspector is inside the authorized 100m perimeter. Inspection audit form and live evidence capture are unlocked.'
                : 'Current GPS distance is ${currentDistanceMeters.toStringAsFixed(0)}m from institute coordinates. You must be physically on-site within 100m to start the audit.',
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.textSecondaryLight,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(Icons.pin_drop, size: 14, color: AppColors.primary),
              const SizedBox(width: 4),
              Text(
                'Target GPS: ${targetLat.toStringAsFixed(4)}° N, ${targetLng.toStringAsFixed(4)}° E',
                style: const TextStyle(
                  fontSize: 11,
                  fontFamily: 'monospace',
                  fontWeight: FontWeight.w600,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
          if (!isWithinRange) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onSimulateArrival,
                icon: const Icon(Icons.my_location, size: 18),
                label: const Text('Simulate On-Site Arrival (Unlock Form)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  textStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
