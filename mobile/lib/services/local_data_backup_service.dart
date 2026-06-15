import 'dart:convert';
import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:path_provider/path_provider.dart';

import 'local_database_service.dart';

class LocalDataBackupService {
  final LocalDatabaseService _databaseService = LocalDatabaseService();

  Future<String> exportToJsonFile() async {
    final data = await _databaseService.exportData();
    final directory = await getDownloadsDirectory() ??
        await getApplicationDocumentsDirectory();
    final timestamp = DateTime.now()
        .toIso8601String()
        .replaceAll(':', '-')
        .replaceAll('.', '-');
    final file = File(
      '${directory.path}${Platform.pathSeparator}beacon-export-$timestamp.json',
    );
    await file.writeAsString(
      const JsonEncoder.withIndent('  ').convert(data),
    );
    return file.path;
  }

  Future<void> importFromJsonFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['json'],
      allowMultiple: false,
    );
    final path = result?.files.single.path;
    if (path == null) return;

    final raw = await File(path).readAsString();
    final data = jsonDecode(raw) as Map<String, dynamic>;
    await _databaseService.importData(data);
  }
}
