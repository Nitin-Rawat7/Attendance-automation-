from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

import asyncio
import threading

from app.db import get_db
from app.models.student import Student
from app.models.student_topic_progress import StudentTopicProgress
from app.services.whatsapp import send_template_message


router = APIRouter(
    prefix="/students",
    tags=["topics"]
)


TOPIC_TABLES = {
    1: "robotics_topics",
    2: "ai_topics",
    3: "programming_topics",
}


# ============================================================
# WHATSAPP NOTIFICATION
# ============================================================

def fire_whatsapp_notification(
    to: str,
    template_name: str,
    body_parameters: list[str],
):
    def send_message():

        try:

            asyncio.run(

                send_template_message(

                    to=to,

                    template_name=template_name,

                    body_parameters=body_parameters,

                )

            )

            print(
                "[whatsapp] notification sent successfully"
            )


        except Exception as e:

            print(
                f"[whatsapp] notification failed: {e}"
            )


    threading.Thread(

        target=send_message,

        daemon=True

    ).start()


# ============================================================
# ADD TOPIC
# ============================================================

class TopicCreate(BaseModel):

    course_id: int

    name: str


@router.post(
    "/course/{course_id}/add-topic"
)
def add_topic(

    course_id: int,

    payload: TopicCreate,

    db: Session = Depends(get_db)

):

    table_name = TOPIC_TABLES.get(
        course_id
    )


    if not table_name:

        raise HTTPException(

            status_code=400,

            detail="unknown course_id"

        )


    result = db.execute(

        text(

            f"""
            INSERT INTO {table_name}
                (name, status)

            VALUES
                (:name, 'pending')

            RETURNING id
            """

        ),

        {

            "name": payload.name

        }

    )


    topic_id = result.fetchone()[0]


    students = (

        db.query(Student)

        .filter(

            Student.course_id == course_id

        )

        .all()

    )


    for student in students:

        db.add(

            StudentTopicProgress(

                student_id=student.id,

                topic_id=topic_id,

                course_id=course_id,

                status="pending"

            )

        )


    db.commit()


    return {

        "ok": True,

        "topic_id": topic_id,

        "students_linked": len(students)

    }


# ============================================================
# LIST STUDENT TOPICS
# ============================================================

@router.get(
    "/{student_id}/topics"
)
def list_student_topics(

    student_id: int,

    db: Session = Depends(get_db)

):

    student = (

        db.query(Student)

        .filter(

            Student.id == student_id

        )

        .first()

    )


    if not student:

        raise HTTPException(

            status_code=404,

            detail="student not found"

        )


    table_name = TOPIC_TABLES.get(

        student.course_id

    )


    if not table_name:

        raise HTTPException(

            status_code=400,

            detail="unknown course_id, no topic table mapped"

        )


    rows = db.execute(

        text(

            f"""
            SELECT

                stp.topic_id,

                t.name,

                stp.status

            FROM student_topic_progress stp

            JOIN {table_name} t

                ON t.id = stp.topic_id

            WHERE

                stp.student_id = :student_id

                AND stp.course_id = :course_id

            ORDER BY stp.topic_id
            """

        ),

        {

            "student_id": student_id,

            "course_id": student.course_id

        }

    ).fetchall()


    return [

        {

            "topic_id": row[0],

            "name": row[1]
            or f"Topic {row[0]}",

            "status": row[2]

        }

        for row in rows

    ]


# ============================================================
# COMPLETE TOPIC
# ============================================================

@router.post(

    "/{student_id}/topics/{topic_id}/complete"

)
def complete_topic_for_student(

    student_id: int,

    topic_id: int,

    db: Session = Depends(get_db)

):

    # --------------------------------------------------------
    # FIND STUDENT
    # --------------------------------------------------------

    student = (

        db.query(Student)

        .filter(

            Student.id == student_id

        )

        .first()

    )


    if not student:

        raise HTTPException(

            status_code=404,

            detail="student not found"

        )


    # --------------------------------------------------------
    # FIND STUDENT TOPIC PROGRESS
    # --------------------------------------------------------

    progress = (

        db.query(

            StudentTopicProgress

        )

        .filter(

            StudentTopicProgress.student_id
            == student_id,

            StudentTopicProgress.topic_id
            == topic_id,

            StudentTopicProgress.course_id
            == student.course_id

        )

        .first()

    )


    if not progress:

        raise HTTPException(

            status_code=404,

            detail=(
                "topic progress record "
                "not found for this student"
            )

        )


    # --------------------------------------------------------
    # GET TOPIC TABLE
    # --------------------------------------------------------

    table_name = TOPIC_TABLES.get(

        student.course_id

    )


    if not table_name:

        raise HTTPException(

            status_code=400,

            detail=(
                "unknown course_id, "
                "no topic table mapped"
            )

        )


    # --------------------------------------------------------
    # GET TOPIC NAME
    # --------------------------------------------------------

    result = db.execute(

        text(

            f"""
            SELECT name

            FROM {table_name}

            WHERE id = :topic_id
            """

        ),

        {

            "topic_id": topic_id

        }

    ).fetchone()


    topic_name = (

        result[0]

        if result

        else "this topic"

    )


    # --------------------------------------------------------
    # MARK TOPIC COMPLETED
    # --------------------------------------------------------

    progress.status = "completed"


    db.commit()


    # --------------------------------------------------------
    # SEND TOPIC COMPLETED WHATSAPP TEMPLATE
    # --------------------------------------------------------

    fire_whatsapp_notification(

        to=student.parent_whatsapp,

        template_name="topic_complete",

        body_parameters=[

            student.name,

            topic_name

        ]

    )


    return {

        "ok": True,

        "topic_name": topic_name,

        "status": "completed"

    }


# ============================================================
# COMPLETE CLASS
# ============================================================

@router.post(

    "/{student_id}/class-complete"

)

def complete_class_for_student(

    student_id: int,

    db: Session = Depends(get_db)

):

    # --------------------------------------------------------
    # FIND STUDENT
    # --------------------------------------------------------

    student = (

        db.query(Student)

        .filter(

            Student.id == student_id

        )

        .first()

    )


    if not student:

        raise HTTPException(

            status_code=404,

            detail="student not found"

        )


    # --------------------------------------------------------
    # SEND CLASS COMPLETED WHATSAPP TEMPLATE
    # --------------------------------------------------------

    fire_whatsapp_notification(

        to=student.parent_whatsapp,

        template_name="class_completed",

        body_parameters=[

            student.name

        ]

    )


    return {

        "ok": True,

        "student_name": student.name,

        "status": "class_completed"

    }