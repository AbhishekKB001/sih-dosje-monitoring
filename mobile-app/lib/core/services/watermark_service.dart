import 'dart:io';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:image/image.dart' as img;
import 'package:path_provider/path_provider.dart';

class WatermarkedEvidenceResult {
  final File file;
  final Uint8List bytes;
  final String sha256Hash;
  final String evidenceId;
  final String metadataSummary;

  WatermarkedEvidenceResult({
    required this.file,
    required this.bytes,
    required this.sha256Hash,
    required this.evidenceId,
    required this.metadataSummary,
  });
}

class WatermarkService {
  static final WatermarkService _instance = WatermarkService._internal();
  factory WatermarkService() => _instance;
  WatermarkService._internal();

  /// Burns visible tamper-evident metadata directly onto image pixel bytes
  Future<WatermarkedEvidenceResult> applyVisibleWatermark({
    required File originalImageFile,
    required String projectCode,
    required String instituteName,
    required String dutyCode,
    required double latitude,
    required double longitude,
    required double accuracy,
    required DateTime capturedAt,
  }) async {
    final rawBytes = await originalImageFile.readAsBytes();
    final image = img.decodeImage(rawBytes);

    if (image == null) {
      throw Exception('Failed to decode camera image for watermarking');
    }

    final evidenceId = 'EVD-${DateTime.now().millisecondsSinceEpoch % 1000000}';
    final istTime = capturedAt.toLocal().toIso8601String().replaceAll('T', ' ').substring(0, 19);

    // Format text lines
    final line1 = 'DoSJE DRISHTI | GOVT OF INDIA MONITORING';
    final line2 = 'Project: $projectCode | Audit: $dutyCode';
    final line3 = 'Institute: $instituteName';
    final line4 = 'GPS: ${latitude.toStringAsFixed(6)} N, ${longitude.toStringAsFixed(6)} E (±${accuracy.toStringAsFixed(1)}m)';
    final line5 = 'Evidence ID: $evidenceId | Time: $istTime IST';

    // Banner dimensions at bottom of image
    final bannerHeight = 110;
    final startY = (image.height - bannerHeight).clamp(0, image.height);

    // Draw dark semi-transparent background box
    img.fillRect(
      image,
      x1: 0,
      y1: startY,
      x2: image.width,
      y2: image.height,
      color: img.ColorRgba8(15, 23, 42, 220), // Dark slate navy
    );

    // Draw yellow accent top border on banner
    img.drawLine(
      image,
      x1: 0,
      y1: startY,
      x2: image.width,
      y2: startY + 2,
      color: img.ColorRgba8(245, 158, 11, 255), // Amber/Saffron
    );

    // Draw text lines onto image
    final textColor = img.ColorRgba8(255, 255, 255, 255);
    final accentColor = img.ColorRgba8(245, 158, 11, 255);

    img.drawString(image, line1, font: img.arial14, x: 12, y: startY + 6, color: accentColor);
    img.drawString(image, line2, font: img.arial14, x: 12, y: startY + 26, color: textColor);
    img.drawString(image, line3, font: img.arial14, x: 12, y: startY + 46, color: textColor);
    img.drawString(image, line4, font: img.arial14, x: 12, y: startY + 66, color: textColor);
    img.drawString(image, line5, font: img.arial14, x: 12, y: startY + 86, color: accentColor);

    // Encode to JPEG
    final watermarkedBytes = Uint8List.fromList(img.encodeJpg(image, quality: 88));

    // Calculate SHA-256 cryptographic hash of final watermarked pixels
    final hash = sha256.convert(watermarkedBytes).toString();

    // Save locally
    final appDir = await getApplicationDocumentsDirectory();
    final evidenceDir = Directory('${appDir.path}/evidence_vault');
    if (!await evidenceDir.exists()) {
      await evidenceDir.create(recursive: true);
    }

    final targetFile = File('${evidenceDir.path}/${evidenceId}_$hash.jpg');
    await targetFile.writeAsBytes(watermarkedBytes);

    final summary = '$line1\n$line2\n$line3\n$line4\n$line5\nSHA256: ${hash.substring(0, 16)}...';

    return WatermarkedEvidenceResult(
      file: targetFile,
      bytes: watermarkedBytes,
      sha256Hash: hash,
      evidenceId: evidenceId,
      metadataSummary: summary,
    );
  }
}
