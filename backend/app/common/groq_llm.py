import asyncio
from groq import Groq
from app.config import get_settings

settings = get_settings()
client = Groq(api_key=settings.groq_api_key)

LLM_MODEL = "llama-3.3-70b-versatile"


async def generate_text(prompt: str, system_instruction: str = None) -> str:
    try:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=LLM_MODEL,
            messages=messages,
        )
        return response.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"Groq text generation failed: {str(e)}")


async def generate_json(prompt: str, system_instruction: str = None) -> str:
    try:
        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = await asyncio.to_thread(
            client.chat.completions.create,
            model=LLM_MODEL,
            messages=messages,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"Groq JSON generation failed: {str(e)}")