# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## How to use and start
Install dependencies
```bash
npm install

npx expo install expo-dev-client
```

- ### Using Expo Go (not all functionality avaible)
Will generate a QR that you need to scan with the Expo Go app.
```bash
npm run dev:expo_go
```

- ### Using Develompent Build (requieres android device or emulator)
Will compile and generate an aplication that will be loaded in selected device.
Then you will need to select server, or scan QR to load the develompent build in the app.
```bash
npm run dev:build
```
> This will take a while
> 
<br>
If you already have the develompent aplication installed on your device, you only need to start the server with

```bash
npm run dev
```

- ### Compiling .apk
Will compile an .apk file, to install in any device. For this you need to be the admin of the project.
```bash
npm run build:apk
```
> This will take a while

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
