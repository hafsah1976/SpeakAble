from app.core.schemas import Recommendation

RECOMMENDATIONS = [
    Recommendation(
        id="rec-boundary",
        title="Practice shorter boundaries",
        reason="Your drafts are warm, but the ask can get buried.",
        action="Try the boundary lesson next.",
        priority="high",
    ),
    Recommendation(
        id="rec-regulation",
        title="Add a pause before hard messages",
        reason="A short pause improves emotional regulation and tone.",
        action="Use the role-play check-in before sending.",
        priority="medium",
    ),
]
