import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate_content"
  | "fake_account"
  | "other";

export interface Report {
  id: string;
  reporterId: string; // User who submitted the report
  reportedUserId: string; // User being reported
  reason: ReportReason;
  details?: string;
  createdAt: string;
}

interface ReportState {
  reports: Report[];
  reportUser: (reporterId: string, reportedUserId: string, reason: ReportReason, details?: string, reporterName?: string, reportedUserName?: string) => void;
  hasReported: (reporterId: string, reportedUserId: string) => boolean;
  getReportsByReporter: (reporterId: string) => Report[];
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      reports: [],

      reportUser: (reporterId, reportedUserId, reason, details, reporterName, reportedUserName) => {
        // Check if already reported
        const existingReport = get().reports.find(
          r => r.reporterId === reporterId && r.reportedUserId === reportedUserId
        );

        if (existingReport) {
          console.log("User already reported");
          return;
        }

        const newReport: Report = {
          id: `report-${Date.now()}`,
          reporterId,
          reportedUserId,
          reason,
          details,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          reports: [...state.reports, newReport],
        }));

        // Send email to support
        const reasonLabels: Record<ReportReason, string> = {
          spam: "Spam",
          harassment: "Harassment or Bullying",
          inappropriate_content: "Inappropriate Content",
          fake_account: "Fake Account",
          other: "Other",
        };

        const reasonLabel = reasonLabels[reason] || reason;
        const subject = encodeURIComponent(`TickBox User Report: ${reasonLabel}`);
        const emailBody = `
Report Details:
--------------
Reporter ID: ${reporterId}
Reporter Name: ${reporterName || "Unknown"}
Reported User ID: ${reportedUserId}
Reported User Name: ${reportedUserName || "Unknown"}
Reason: ${reasonLabel}
Additional Details: ${details || "None provided"}
Timestamp: ${new Date().toLocaleString()}
Report ID: ${newReport.id}
        `;
        const body = encodeURIComponent(emailBody.trim());

        // Open email client with pre-filled report
        Linking.openURL(`mailto:support@tickboxapp.com?subject=${subject}&body=${body}`);
      },

      hasReported: (reporterId, reportedUserId) => {
        return get().reports.some(
          r => r.reporterId === reporterId && r.reportedUserId === reportedUserId
        );
      },

      getReportsByReporter: (reporterId) => {
        return get().reports.filter(r => r.reporterId === reporterId);
      },
    }),
    {
      name: "report-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
