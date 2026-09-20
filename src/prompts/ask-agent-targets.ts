import { cancel, isCancel, multiselect } from "@clack/prompts";
import {
  BUILTIN_AGENT_KIT_TARGETS,
  DEFAULT_AGENT_KIT_TARGET,
  getValidAgentKitTargets,
} from "../features/agent-kit-targets";

/**
 * Which `agent-kit` targets to derive per-agent docs and skills for.
 *
 * The valid target list is not a literal we own — it comes from the installed
 * `@mongez/agent-kit`, or a cached network fetch, and
 * {@link getValidAgentKitTargets} THROWS when neither is available. That is
 * the right behaviour for `--agents=something-unusual`, where guessing would
 * be worse than failing. It is the wrong behaviour here: this prompt sits
 * five questions into the wizard, and an offline laptop must not lose four
 * already-given answers to a failed HTTP request.
 *
 * So an unreachable list is not fatal — it narrows the menu to the built-in
 * targets and SAYS SO, rather than either crashing or silently pretending
 * that is the whole list.
 */
export async function askAgentTargets(
  requested: string[] | undefined,
): Promise<string[]> {
  const { targets: known, complete } = await availableTargets();
  const targets = reconcileRequested(requested, known, complete);

  const answer = await multiselect({
    message: complete
      ? "Which coding agents should this project be set up for?"
      : "Which coding agents should this project be set up for? (offline — showing built-in targets only)",
    options: targets.map(target => ({ value: target, label: target })),
    initialValues: initialSelection(requested, targets),
    required: false,
  });

  if (isCancel(answer)) {
    cancel("Agent selection cancelled");
    process.exit(0);
  }

  const selected = answer as string[];

  return selected.length > 0 ? selected : [DEFAULT_AGENT_KIT_TARGET];
}

/**
 * The target list, plus whether it is the REAL one. `complete: false` means
 * the lookup failed and these are only the offline built-ins.
 */
async function availableTargets(): Promise<{
  targets: string[];
  complete: boolean;
}> {
  try {
    return { targets: await getValidAgentKitTargets(), complete: true };
  } catch {
    return { targets: [...BUILTIN_AGENT_KIT_TARGETS], complete: false };
  }
}

/**
 * What `--agents` asked for has to end up among the OPTIONS, or it would be
 * pre-ticked invisibly and then silently dropped — the same defect this
 * wizard's other flags already had.
 *
 * With a complete list, an unrecognised target is refused, naming the valid
 * ones, exactly as `resolveAgentTargets` does for the non-interactive path.
 * With an incomplete one, we have no authority to call anything invalid, so
 * the requested targets are offered alongside the built-ins instead of being
 * judged.
 */
function reconcileRequested(
  requested: string[] | undefined,
  known: string[],
  complete: boolean,
): string[] {
  if (!requested || requested.length === 0) return known;

  const unknown = requested.filter(target => !known.includes(target));

  if (unknown.length === 0) return known;

  if (complete) {
    cancel(
      `Unknown agent-kit target(s): ${unknown.join(", ")} — valid targets: ${known
        .slice()
        .sort()
        .join(", ")}`,
    );
    process.exit(1);
  }

  return [...known, ...unknown];
}

/**
 * Pre-tick what `--agents` asked for. Everything it names is among the
 * options by now, so nothing is filtered away here.
 */
function initialSelection(
  requested: string[] | undefined,
  targets: string[],
): string[] {
  const wanted =
    requested && requested.length > 0 ? requested : [DEFAULT_AGENT_KIT_TARGET];

  return wanted.filter(target => targets.includes(target));
}
