const capabilities = [
  {
    index: "01",
    eyebrow: "Runtime",
    title: "One server. Every layer.",
    body: "HTTP, SSR React, queues, schedules, and agents share one typed runtime instead of a stack of disconnected tools.",
  },
  {
    index: "02",
    eyebrow: "Types",
    title: "Confidence at the edges.",
    body: "Validation, request data, page loaders, and tool calls stay typed from input to response.",
  },
  {
    index: "03",
    eyebrow: "Architecture",
    title: "Packages that compose.",
    body: "Start with Core, then reach for Cascade, Auth, Cache, Scheduler, Seal, or AI only when the product needs them.",
  },
  {
    index: "04",
    eyebrow: "Developer loop",
    title: "Fast where it matters.",
    body: "File-based pages, hot updates, generators, and project-local skills keep momentum inside the codebase.",
  },
] as const;

const packages = [
  {
    name: "core",
    area: "Foundation",
    description:
      "The application runtime for configuration, commands, connectors, and the development loop.",
  },
  {
    name: "web",
    area: "Full-stack React",
    description:
      "Server-rendered pages, loaders, metadata, layouts, and client-side navigation in one package.",
  },
  {
    name: "cascade",
    area: "Data",
    description:
      "Models, queries, relationships, and migrations for applications that need durable data.",
  },
  {
    name: "seal",
    area: "Validation",
    description: "Composable schemas that validate and shape data at every application boundary.",
  },
  {
    name: "auth",
    area: "Identity",
    description:
      "Authentication primitives for protecting routes and carrying user identity through requests.",
  },
  {
    name: "cache",
    area: "Performance",
    description:
      "A consistent caching layer with replaceable drivers and predictable key management.",
  },
  {
    name: "scheduler",
    area: "Automation",
    description:
      "Declare recurring application work and run it alongside the same Warlock runtime.",
  },
  {
    name: "ai",
    area: "Intelligence",
    description:
      "Build agents, tool-driven workflows, and model-backed product capabilities with typed contracts.",
  },
] as const;

export async function getHomeService() {
  return {
    packages,
    capabilities,
    statusMessage: "Ready to build.",
  };
}

export type HomePageData = Awaited<ReturnType<typeof getHomeService>>;
