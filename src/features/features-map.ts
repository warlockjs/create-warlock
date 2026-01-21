/**
 * Hardcoded features map with dependencies, devDependencies, and config stubs
 */
export type FeatureConfig = {
  label: string;
  description: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  configStub?: {
    name: string;
    content: string;
  };
};

export const communicatorConfigStub = `import { CommunicatorsConfigurations } from "@warlock.js/herald";

const communicatorsConfigurations: CommunicatorsConfigurations = {
  host: process.env.RABBITMQ_HOST || "localhost",
  port: Number(process.env.RABBITMQ_PORT) || 5672,
  username: process.env.RABBITMQ_USER || "guest",
  password: process.env.RABBITMQ_PASSWORD || "guest",
};

export default communicatorsConfigurations;
`;

export const featuresMap: Record<string, FeatureConfig> = {
  react: {
    label: "React (SSR for mails)",
    description:
      "React and ReactDOM for server-side rendering, useful for email templates",
    dependencies: {
      react: "^19.0.0",
      "react-dom": "^19.0.0",
    },
    devDependencies: {
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
    },
  },
  image: {
    label: "Image processing (Sharp)",
    description: "Sharp for image manipulation and optimization",
    dependencies: {
      sharp: "^0.34.0",
    },
  },
  mail: {
    label: "Mail (Nodemailer)",
    description: "Nodemailer for sending emails",
    dependencies: {
      nodemailer: "^6.9.0",
    },
    devDependencies: {
      "@types/nodemailer": "^6.4.0",
    },
  },
  redis: {
    label: "Redis cache",
    description: "Redis client for caching",
    dependencies: {
      redis: "^4.6.0",
    },
  },
  scheduler: {
    label: "Scheduler",
    description: "Warlock scheduler for background tasks and cron jobs",
    dependencies: {
      "@warlock.js/scheduler": "~4.0.0",
    },
  },
  s3: {
    label: "S3 storage",
    description: "AWS S3 for cloud file storage",
    dependencies: {
      "@aws-sdk/client-s3": "^3.0.0",
      "@aws-sdk/lib-storage": "^3.0.0",
      "@aws-sdk/s3-request-presigner": "^3.0.0",
    },
  },
  herald: {
    label: "Herald (RabbitMQ)",
    description: "Message broker for event-driven architecture",
    dependencies: {
      "@warlock.js/herald": "~4.0.0",
      amqplib: "^0.10.0",
    },
    devDependencies: {
      "@types/amqplib": "^0.10.0",
    },
    configStub: {
      name: "communicator",
      content: communicatorConfigStub,
    },
  },
};

/**
 * Get feature options for the multiselect prompt
 */
export function getFeatureOptions() {
  return Object.entries(featuresMap).map(([key, config]) => ({
    value: key,
    label: config.label,
    hint: config.description,
  }));
}

/**
 * Get all dependencies for selected features
 */
export function getFeatureDependencies(selectedFeatures: string[]): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};

  for (const feature of selectedFeatures) {
    const config = featuresMap[feature];
    if (config) {
      Object.assign(dependencies, config.dependencies);
      if (config.devDependencies) {
        Object.assign(devDependencies, config.devDependencies);
      }
    }
  }

  return { dependencies, devDependencies };
}

/**
 * Get config stubs for selected features
 */
export function getFeatureConfigStubs(
  selectedFeatures: string[],
): Array<FeatureConfig> {
  const stubs: Array<FeatureConfig> = [];

  for (const feature of selectedFeatures) {
    const config = featuresMap[feature];
    if (config?.configStub) {
      stubs.push(config.configStub);
    }
  }

  return stubs;
}
