export const environment = {
  production: true,
  atmID: (window as any)["env"]["atmID"] || "2",
  endpoint: (window as any)["env"]["apiUrl"] || "http://localhost",
};
