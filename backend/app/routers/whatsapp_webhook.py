from fastapi import APIRouter, Request

router = APIRouter(
    prefix="/webhooks/whatsapp",
    tags=["whatsapp-webhook"],
)


@router.get("")
async def verify_whatsapp_webhook(request: Request):
    """
    Meta webhook verification endpoint.
    """

    params = request.query_params

    mode = params.get("hub.mode")
    verify_token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    if (
        mode == "subscribe"
        and verify_token == "robotic_sir_whatsapp_webhook"
    ):
        return int(challenge)

    return {
        "error": "verification failed"
    }


@router.post("")
async def receive_whatsapp_webhook(request: Request):
    """
    Receive WhatsApp message status updates.
    """

    data = await request.json()

    print("\n========== WHATSAPP WEBHOOK ==========")
    print(data)
    print("=======================================\n")

    return {
        "status": "received"
    }