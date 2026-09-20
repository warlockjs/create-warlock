import { cancel, isCancel, text } from "@clack/prompts";

/**
 * The project name is the one answer with no sane default, so every
 * interactive path has to ask it. It lives here so the default path and the
 * full wizard ask it with the SAME wording and the same cancel handling —
 * and so a name already collected by one path can simply be handed to the
 * other instead of being asked a second time.
 */
export async function askProjectName(): Promise<string> {
  const answer = await text({
    message: "What shall we call your project?",
    placeholder: "my-warlock-app",
  });

  if (isCancel(answer) || !answer.trim()) {
    cancel("A project name is required to continue");
    process.exit(0);
  }

  return answer;
}
