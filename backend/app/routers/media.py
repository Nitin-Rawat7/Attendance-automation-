import uuid
import asyncio
import threading

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
)

from sqlalchemy.orm import Session
from supabase import create_client
from pydantic import BaseModel

from app.db import (
    get_db,
    SessionLocal
)
from app.models.media import Media
from app.models.student import Student
from app.config import settings

from app.services.whatsapp import send_media_message


router = APIRouter(
    prefix="/media",
    tags=["media"]
)


# ============================================================
# SUPABASE CLIENT
# ============================================================

supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)


# ============================================================
# LIST MEDIA FOR STUDENT
# ============================================================

@router.get("/student/{student_id}")
def list_media_for_student(
    student_id: int,
    db: Session = Depends(get_db)
):

    media = (

        db.query(Media)

        .filter(
            Media.student_id == student_id
        )

        .all()

    )


    return [

        {

            "id": item.id,

            "type": item.type,

            "url": item.url,

            "sent": item.sent

        }

        for item in media

    ]


# ============================================================
# UPLOAD PHOTO / VIDEO
# ============================================================

@router.post("/upload")
async def upload_media(

    student_id: int = Form(...),

    file: UploadFile = File(...),

    db: Session = Depends(get_db)

):

    # --------------------------------------------------------
    # CHECK STUDENT
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
    # CHECK FILE TYPE
    # --------------------------------------------------------

    if not file.content_type:

        raise HTTPException(

            status_code=400,

            detail="file type not detected"

        )


    if not (

        file.content_type.startswith("image/")

        or

        file.content_type.startswith("video/")

    ):

        raise HTTPException(

            status_code=400,

            detail=(
                "Only image and video "
                "files are allowed"
            )

        )


    # --------------------------------------------------------
    # DETERMINE MEDIA TYPE
    # --------------------------------------------------------

    file_type = (

        "video"

        if file.content_type.startswith(
            "video/"
        )

        else "photo"

    )


    # --------------------------------------------------------
    # FILE EXTENSION
    # --------------------------------------------------------

    original_filename = (

        file.filename

        or "media"

    )


    if "." in original_filename:

        ext = (

            original_filename

            .rsplit(".", 1)[-1]

            .lower()

        )

    else:

        ext = (

            "mp4"

            if file_type == "video"

            else "jpg"

        )


    # --------------------------------------------------------
    # UNIQUE FILE NAME
    # --------------------------------------------------------

    unique_name = (

        f"{student_id}_"
        f"{uuid.uuid4().hex}."
        f"{ext}"

    )


    # --------------------------------------------------------
    # READ FILE
    # --------------------------------------------------------

    content = await file.read()


    if not content:

        raise HTTPException(

            status_code=400,

            detail="uploaded file is empty"

        )


    # --------------------------------------------------------
    # UPLOAD TO SUPABASE STORAGE
    # --------------------------------------------------------

    try:

        supabase.storage \
            .from_("student-media") \
            .upload(

                unique_name,

                content,

                {

                    "content-type":
                    file.content_type

                }

            )

    except Exception as e:

        print(

            "[media] Supabase upload error:"

        )

        print(e)


        raise HTTPException(

            status_code=500,

            detail="failed to upload media"

        )


    # --------------------------------------------------------
    # GET PUBLIC URL
    # --------------------------------------------------------

    public_url = (

        supabase.storage

        .from_("student-media")

        .get_public_url(

            unique_name

        )

    )


    # --------------------------------------------------------
    # SAVE MEDIA IN DATABASE
    # --------------------------------------------------------

    media = Media(

        student_id=student_id,

        type=file_type,

        url=public_url,

        sent=False

    )


    db.add(media)

    db.commit()

    db.refresh(media)


    return {

        "ok": True,

        "media_id": media.id,

        "url": public_url,

        "type": file_type

    }


# ============================================================
# ADD MEDIA USING URL
# ============================================================

class MediaURLCreate(BaseModel):

    student_id: int

    url: str

    type: str


@router.post("/add-url")
def add_media_url(

    payload: MediaURLCreate,

    db: Session = Depends(get_db)

):

    # --------------------------------------------------------
    # CHECK STUDENT
    # --------------------------------------------------------

    student = (

        db.query(Student)

        .filter(

            Student.id
            == payload.student_id

        )

        .first()

    )


    if not student:

        raise HTTPException(

            status_code=404,

            detail="student not found"

        )


    # --------------------------------------------------------
    # VALIDATE TYPE
    # --------------------------------------------------------

    if payload.type not in (

        "photo",

        "video"

    ):

        raise HTTPException(

            status_code=400,

            detail=(
                "type must be "
                "photo or video"
            )

        )


    # --------------------------------------------------------
    # VALIDATE URL
    # --------------------------------------------------------

    if not payload.url.startswith(

        "http"

    ):

        raise HTTPException(

            status_code=400,

            detail="invalid media URL"

        )


    # --------------------------------------------------------
    # SAVE MEDIA
    # --------------------------------------------------------

    media = Media(

        student_id=payload.student_id,

        type=payload.type,

        url=payload.url,

        sent=False

    )


    db.add(media)

    db.commit()

    db.refresh(media)


    return {

        "ok": True,

        "media_id": media.id

    }


# ============================================================
# SEND MEDIA TO PARENT WHATSAPP
# ============================================================

@router.post("/{media_id}/send")
def send_media(

    media_id: int,

    db: Session = Depends(get_db)

):

    # --------------------------------------------------------
    # FIND MEDIA
    # --------------------------------------------------------

    media = (

        db.query(Media)

        .filter(

            Media.id == media_id

        )

        .first()

    )


    if not media:

        raise HTTPException(

            status_code=404,

            detail="media not found"

        )


    # --------------------------------------------------------
    # PREVENT DUPLICATE SEND
    # --------------------------------------------------------

    if media.sent:

        raise HTTPException(

            status_code=400,

            detail=(
                "media has already "
                "been sent"
            )

        )


    # --------------------------------------------------------
    # FIND STUDENT
    # --------------------------------------------------------

    student = (

        db.query(Student)

        .filter(

            Student.id
            == media.student_id

        )

        .first()

    )


    if not student:

        raise HTTPException(

            status_code=404,

            detail="student not found"

        )


    # --------------------------------------------------------
    # CHECK WHATSAPP NUMBER
    # --------------------------------------------------------

    if not student.parent_whatsapp:

        raise HTTPException(

            status_code=400,

            detail=(
                "student does not have "
                "a parent WhatsApp number"
            )

        )


    # --------------------------------------------------------
    # CHECK MEDIA URL
    # --------------------------------------------------------

    if not media.url:

        raise HTTPException(

            status_code=400,

            detail="media URL is empty"

        )


    # --------------------------------------------------------
    # SEND IN BACKGROUND
    # --------------------------------------------------------

    def send_message():

        try:

            asyncio.run(

                send_media_message(

                    to=student.parent_whatsapp,

                    media_type=media.type,

                    media_url=media.url

                )

            )


            # ------------------------------------------------
            # IMPORTANT
            # Mark sent ONLY after successful API request
            # ------------------------------------------------

            from app.db import SessionLocal


            background_db = SessionLocal()


            try:

                background_media = (

                    background_db

                    .query(Media)

                    .filter(

                        Media.id
                        == media_id

                    )

                    .first()

                )


                if background_media:

                    background_media.sent = True

                    background_db.commit()


            finally:

                background_db.close()


            print(

                "[whatsapp] media "
                "sent successfully"

            )


        except Exception as e:

            print(

                "[whatsapp] media "
                f"send failed: {e}"

            )


    threading.Thread(

        target=send_message,

        daemon=True

    ).start()


    return {

        "ok": True,

        "message": (
            "media sending started"
        )

    }


# ============================================================
# DELETE MEDIA
# ============================================================

@router.delete("/{media_id}")
def delete_media(

    media_id: int,

    db: Session = Depends(get_db)

):

    media = (

        db.query(Media)

        .filter(

            Media.id == media_id

        )

        .first()

    )


    if not media:

        raise HTTPException(

            status_code=404,

            detail="media not found"

        )


    db.delete(media)

    db.commit()


    return {

        "ok": True

    }