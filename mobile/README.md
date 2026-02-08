# Mobile Project (Flutter)

This directory contains the Flutter mobile application code.

## Setup Instructions

1.  **Initialize Flutter Project**:
    Since this directory was created manually, you need to initialize the Flutter project files.
    Run the following command in the `mobile` directory (or from root pointing to it):

    ```bash
    cd mobile
    # Initialize a new Flutter project in the current directory
    flutter create . --org com.meowzexam
    ```

    *Note: If `flutter create .` complains about existing files, you might need to move the `lib` folder out, run create, and move it back, or use `--force` if available/safe.*

2.  **Add Dependencies**:
    Open `pubspec.yaml` and add the following dependencies:

    ```yaml
    dependencies:
      flutter:
        sdk: flutter
      dio: ^5.4.0
      flutter_secure_storage: ^9.0.0
      provider: ^6.1.1
      # Optional: json_annotation, json_serializable, build_runner
    ```

    Then run `flutter pub get`.

3.  **Configuration**:
    -   Update `lib/core/constants.dart` with your API base URL.
        -   For Android Emulator: `http://10.0.2.2:3001/api`
        -   For iOS Simulator: `http://localhost:3001/api`
        -   For Physical Device: Use your computer's LAN IP (e.g., `http://192.168.1.x:3001/api`)

4.  **Run**:
    ```bash
    flutter run
    ```

## Architecture

-   `lib/core`: Core utilities (API Client, Constants).
-   `lib/services`: Business logic (Auth, Questions).
-   `lib/models`: Data models (create these based on API responses).
