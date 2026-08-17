import os
import asyncio
import threading
import httpx

WHATSAPP_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")


async def send_template_message(to: str, template_name: str, body_parameters: list[str]):
    """Sends a WhatsApp Cloud API template message to a parent's phone number."""
    if not WHATSAPP_TOKEN or not PHONE_NUMBER_ID:
        print("[whatsapp] credentials not set in env variables; skipping notification")
        return

    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }

    components = []
    if body_parameters:
        components.append(
            {
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in body_parameters],
            }
        )

    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": "en"},
            "components": components,
        },
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers)
        if response.status_code != 200:
            print(f"[whatsapp] API error ({response.status_code}): {response.text}")


def fire_whatsapp_notification(to: str, template_name: str, body_parameters: list[str]):
    """Helper to dispatch send_template_message in a non-blocking daemon thread."""
    def send():
        try:
            asyncio.run(
                send_template_message(
                    to=to,
                    template_name=template_name,
                    body_parameters=body_parameters,
                )
            )
            print(f"[whatsapp] notification '{template_name}' sent to {to}")
        except Exception as e:
            print(f"[whatsapp] background thread failed: {e}")

    threading.Thread(target=send, daemon=True).start()