import 'package:dio/dio.dart';

import 'configure_dio_stub.dart'
    if (dart.library.io) 'configure_dio_io.dart';

void configureDio(Dio dio) {
  configureDioForPlatform(dio);
}
