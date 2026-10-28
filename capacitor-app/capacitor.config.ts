import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sevenxcinema.app",
  appName: "7xCinema",
  webDir: "dist",
  android: {
    allowMixedContent: true,
    backgroundColor: "#080a10",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    Browser: {
      presentationStyle: "popover",
    },
  },
};

export default config;
