import 'package:geolocator/geolocator.dart';

class LocationResult {
  final bool success;
  final Position? position;
  final double? distanceMeters;
  final bool isWithinGeofence;
  final String? errorMessage;

  LocationResult({
    required this.success,
    this.position,
    this.distanceMeters,
    this.isWithinGeofence = false,
    this.errorMessage,
  });
}

class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  /// Check permissions and acquire current physical GPS location
  Future<Position?> getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled on device. Please enable GPS.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions are denied by user.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions are permanently denied. Enable via System Settings.');
    }

    // Acquire high-accuracy position from phone satellite/network hardware
    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 15),
      ),
    );
  }

  /// Calculate real distance in meters between device coordinates and target institute
  double calculateDistance({
    required double startLatitude,
    required double startLongitude,
    required double endLatitude,
    required double endLongitude,
  }) {
    return Geolocator.distanceBetween(
      startLatitude,
      startLongitude,
      endLatitude,
      endLongitude,
    );
  }

  /// Verify whether the physical device is currently within the allowed geofence boundary
  Future<LocationResult> verifyGeofence({
    required double targetLatitude,
    required double targetLongitude,
    double allowedRadiusMeters = 100.0,
  }) async {
    try {
      final position = await getCurrentPosition();
      if (position == null) {
        return LocationResult(
          success: false,
          errorMessage: 'Unable to acquire satellite GPS fix from device sensors.',
        );
      }

      final distance = calculateDistance(
        startLatitude: position.latitude,
        startLongitude: position.longitude,
        endLatitude: targetLatitude,
        endLongitude: targetLongitude,
      );

      // 20m tolerance buffer for standard consumer GPS accuracy uncertainty
      final isInside = distance <= (allowedRadiusMeters + 20.0);

      return LocationResult(
        success: true,
        position: position,
        distanceMeters: distance,
        isWithinGeofence: isInside,
      );
    } catch (e) {
      return LocationResult(
        success: false,
        errorMessage: e.toString(),
      );
    }
  }
}
