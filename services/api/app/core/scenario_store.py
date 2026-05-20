from app.core.schemas import PracticeScenario

SCENARIOS = [
    PracticeScenario(
        id="scenario-deadline",
        slug="deadline-reset",
        title="Deadline keeps moving",
        description="Ask for a stable plan when a timeline has changed several times.",
        difficulty="starter",
        category="work",
        prompt="A project deadline has moved three times and you need a final date.",
    ),
    PracticeScenario(
        id="scenario-social-battery",
        slug="social-battery",
        title="Declining an invitation",
        description="Say no without overexplaining or sounding dismissive.",
        difficulty="starter",
        category="personal",
        prompt="A friend invited you out, but you need a quiet night.",
    ),
    PracticeScenario(
        id="scenario-interruption",
        slug="meeting-interruption",
        title="Interrupted in a meeting",
        description="Return to your point calmly and keep the room collaborative.",
        difficulty="steady",
        category="work",
        prompt="Someone keeps talking over you while you are presenting an idea.",
    ),
    PracticeScenario(
        id="scenario-boundary",
        slug="family-boundary",
        title="Family boundary",
        description="State a personal boundary with care and firmness.",
        difficulty="stretch",
        category="personal",
        prompt="A family member is asking for details you do not want to discuss.",
    ),
]
