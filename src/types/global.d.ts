export {};

declare global {
  interface Window {
    __aiFaceReportStream?: MediaStream | null;
  }
}
