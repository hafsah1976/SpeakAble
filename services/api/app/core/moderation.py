from dataclasses import dataclass


BLOCKED_SAFETY_MESSAGE = (
    "This looks safety-sensitive, so I cannot provide a polished message to send. "
    "Focus on immediate safety, reach out to a trusted person or local support, and use a lower-risk next step."
)

BLOCKING_FLAGS = frozenset({"self-harm", "personal-safety", "coercion-or-threat"})


@dataclass(frozen=True)
class ModerationDecision:
    allowed: bool
    safety_flags: list[str]
    replacement_text: str | None = None


def detect_safety_flags(text: str) -> list[str]:
    lower = text.lower()
    flags: list[str] = []

    if any(term in lower for term in ["hurt myself", "kill myself", "suicide", "self harm"]):
        flags.append("self-harm")

    if any(term in lower for term in ["threaten", "blackmail", "make them pay", "ruin their life"]):
        flags.append("coercion-or-threat")

    if any(
        term in lower
        for term in [
            "hit me",
            "afraid of them",
            "unsafe at home",
            "stalking",
            "followed me",
            "tracking me",
        ]
    ):
        flags.append("personal-safety")

    if any(term in lower for term in ["idiot", "worthless", "shut up", "go away forever"]):
        flags.append("harassment")

    return flags


def moderate_text(text: str) -> ModerationDecision:
    safety_flags = detect_safety_flags(text)
    blocks_display = any(flag in BLOCKING_FLAGS for flag in safety_flags)

    return ModerationDecision(
        allowed=not blocks_display,
        safety_flags=safety_flags,
        replacement_text=BLOCKED_SAFETY_MESSAGE if blocks_display else None,
    )
