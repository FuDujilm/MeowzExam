import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

void configureDioForPlatform(Dio dio) {
  dio.httpClientAdapter = IOHttpClientAdapter(
    createHttpClient: () {
      return HttpClient()..findProxy = (_) => 'DIRECT';
    },
  );
}
