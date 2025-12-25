export type NotificationConfig = {
  channels: string[];
  default: string;
};

const notifications: NotificationConfig = {
  channels: ["mail", "database", "slack", "telegram"],
  default: "mail",
};

export default notifications;
