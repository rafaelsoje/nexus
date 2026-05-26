export const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "NEXO";

export const appInitial = appName.trim().charAt(0).toUpperCase() || "N";
