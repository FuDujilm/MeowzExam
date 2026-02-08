import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:mobile/main.dart';
import 'package:mobile/services/auth_service.dart';

void main() {
  testWidgets('Login page smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          Provider(create: (_) => AuthService()),
        ],
        child: const MyApp(),
      ),
    );

    // Verify that the login page is shown.
    expect(find.text('Login'), findsWidgets); // App bar and button might both say Login
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Send Verification Code'), findsOneWidget);
  });
}
