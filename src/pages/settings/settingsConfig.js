import {
  Bell,
  Building2,
  CreditCard,
  Gauge,
  Link2,
  Palette,
  UsersRound,
} from "lucide-react";

export const settings = {
  "Settings / General": {
    group: "Organization Settings",
    title: "General",
    description: "Manage the basic details and defaults for this workspace.",
    icon: Building2,
  },
  "Settings / Features": {
    group: "Organization Settings",
    title: "Features",
    description: "Choose the capabilities available to your workspace.",
    icon: Gauge,
  },
  "Settings / Subscription": {
    group: "Organization Settings",
    title: "Subscription",
    description: "Review workspace plan and billing configuration.",
    icon: CreditCard,
  },
  "Settings / Manage Teammates": {
    group: "Organization Settings",
    title: "Manage Teammates",
    description: "Manage members, roles, and workspace access.",
    icon: UsersRound,
  },
  "Settings / Customizations": {
    group: "Organization Settings",
    title: "Customizations",
    description: "Configure workspace terminology and appearance.",
    icon: Palette,
  },
  "Settings / Integrations": {
    group: "Organization Settings",
    title: "Integrations",
    description: "Connect Workbench with the tools your team uses.",
    icon: Link2,
  },
  "Settings / Profile Preferences": {
    group: "Personal Settings",
    title: "Profile Preferences",
    description: "Set your personal preferences for Workbench.",
    icon: Palette,
  },
  "Settings / Notification Settings": {
    group: "Personal Settings",
    title: "Notification Settings",
    description: "Choose how Workbench should notify you.",
    icon: Bell,
  },
  "Settings / Invite Users": {
    group: "Personal Settings",
    title: "Invite Users",
    description: "Invite teammates to collaborate in this workspace.",
    icon: UsersRound,
  },
};

export const organizationPages = [
  "Settings / General",
  "Settings / Features",
  "Settings / Subscription",
  "Settings / Manage Teammates",
  "Settings / Customizations",
  "Settings / Integrations",
];

export const personalPages = [
  "Settings / Profile Preferences",
  "Settings / Notification Settings",
  "Settings / Invite Users",
];

export const notificationGroups = [
  {
    title: "Work Orders",
    description: "Work order events can trigger in-app notifications and emails.",
    groups: [
      { title: "Created by me", events: ["All new comments", "Only mentions in comments", "Becomes overdue", "Status has changed"] },
      { title: "Assigned to me", events: ["All assigned work orders", "All new comments", "Only mentions in comments", "Becomes overdue", "Status has changed"] },
      { title: "Assigned to my team", events: ["All assigned work orders", "All new comments", "Only mentions in comments", "Becomes overdue", "Status has changed"] },
    ],
  },
  {
    title: "Requests",
    description: "Follow everything related to your requests.",
    groups: [{ title: "Requiring approval", events: ["Assigned to my teams", "Unassigned"] }],
  },
  {
    title: "Purchase Orders",
    description: "Configure how you receive notifications for purchase order events.",
    groups: [
      { title: "Created by me", events: ["Purchase order was approved", "Purchase order was rejected"] },
      { title: "Requires approval", events: ["Purchase order created and needs approval"] },
    ],
  },
  {
    title: "Procedure Notifications",
    description: "Control notifications when global procedures are published to your organization.",
    groups: [{ title: "", events: ["Procedure published or updated"] }],
  },
];
