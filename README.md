# Xbox Downloader

Download and install Xbox Game Pass PC games directly from Microsoft CDNs.

## Features

- Browse Xbox Game Pass catalog
- Stream download + extract via XvdTool (no temp msixvc file)
- Auto game registration (wdapp register)
- Detect already installed games
- Real uninstall (wdapp unregister + delete files)

## Build

```powershell
npm install
npm run build
npm run electron:start
```

## Publish

Push to `master` triggers GitHub Actions to build and create a release automatically.
