from app.core.schemas import Lesson, LessonExercise

LESSONS = [
    Lesson(
        id="lesson-i-statement",
        title="Use an I statement",
        objective="Name your experience without blaming or shrinking.",
        example={
            "before": "You keep ignoring what I need.",
            "after": "I feel stuck when I do not get a reply, and I need a clear yes or no by Friday.",
        },
        exercises=[
            LessonExercise(
                id="exercise-i-statement",
                prompt="Rewrite: You never listen to me in meetings.",
                example_answer="I want to finish my point before we move on.",
            )
        ],
        estimated_minutes=4,
    ),
    Lesson(
        id="lesson-boundary",
        title="Make the boundary specific",
        objective="Explain what you can do, what you cannot do, and the next step.",
        example={
            "before": "I cannot keep doing this.",
            "after": "I can help today until 4 PM. After that I need to hand this back to you.",
        },
        exercises=[
            LessonExercise(
                id="exercise-boundary",
                prompt="Rewrite: Stop asking me at the last minute.",
                example_answer="I need at least one day of notice for new requests.",
            )
        ],
        estimated_minutes=5,
    ),
    Lesson(
        id="lesson-repair",
        title="Repair without over-apologizing",
        objective="Own impact, make a clear request, and avoid a shame spiral.",
        example={
            "before": "I am so sorry, I am terrible at this.",
            "after": "I am sorry I missed that detail. I will update it today and send the corrected version by 3 PM.",
        },
        exercises=[
            LessonExercise(
                id="exercise-repair",
                prompt="Rewrite: Sorry, sorry, I know I messed everything up.",
                example_answer="I am sorry I missed the deadline. I can send the revised draft tomorrow morning.",
            )
        ],
        estimated_minutes=6,
    ),
]
