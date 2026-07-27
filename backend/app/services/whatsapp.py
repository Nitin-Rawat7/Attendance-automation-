import httpx

from app.config import settings


# ============================================================
# WHATSAPP API
# ============================================================

WHATSAPP_API_URL = (
    f"https://graph.facebook.com/v23.0/"
    f"{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
)


# ============================================================
# SEND TEMPLATE MESSAGE
# ============================================================

async def send_template_message(
    to: str,
    template_name: str,
    body_parameters: list[str],
) -> dict:

    payload = {
        "messaging_product": "whatsapp",

        "to": to,

        "type": "template",

        "template": {

            "name": template_name,

            "language": {
                "code": "en"
            },

            "components": [

                {

                    "type": "body",

                    "parameters": [

                        {

                            "type": "text",

                            "text": str(parameter)

                        }

                        for parameter
                        in body_parameters

                    ]

                }

            ]

        }

    }


    headers = {

        "Authorization":
        f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",

        "Content-Type":
        "application/json"

    }


    async with httpx.AsyncClient(

        timeout=30

    ) as client:

        response = await client.post(

            WHATSAPP_API_URL,

            json=payload,

            headers=headers

        )


    if response.status_code >= 400:

        print(
            "WhatsApp Template API Error:"
        )

        print(response.text)

        response.raise_for_status()


    result = response.json()


    print(
        "[whatsapp] Template API response:"
    )

    print(result)


    return result


# ============================================================
# SEND PHOTO / VIDEO MEDIA
# ============================================================

async def send_media_message(

    to: str,

    media_type: str,

    media_url: str

) -> dict:


    if media_type not in (

        "photo",

        "video"

    ):

        raise ValueError(

            "media_type must be "
            "photo or video"

        )


    # --------------------------------------------------------
    # WhatsApp uses "image" instead of "photo"
    # --------------------------------------------------------

    whatsapp_media_type = (

        "image"

        if media_type == "photo"

        else "video"

    )


    payload = {

        "messaging_product":
        "whatsapp",

        "to": to,

        "type":
        whatsapp_media_type,

        whatsapp_media_type: {

            "link": media_url

        }

    }


    headers = {

        "Authorization":
        f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",

        "Content-Type":
        "application/json"

    }


    async with httpx.AsyncClient(

        timeout=30

    ) as client:

        response = await client.post(

            WHATSAPP_API_URL,

            json=payload,

            headers=headers

        )


    if response.status_code >= 400:

        print(
            "WhatsApp Media API Error:"
        )

        print(response.text)

        response.raise_for_status()


    result = response.json()


    print(
        "[whatsapp] Media API response:"
    )

    print(result)


    return result