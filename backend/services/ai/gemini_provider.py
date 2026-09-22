# backend/services/ai/gemini_provider.py

import os
import json
import aiohttp
from typing import AsyncGenerator, List, Dict, Any

async def stream_gemini_response(
    system_prompt: str, 
    messages: List[Dict[str, str]], 
    custom_api_key: str = None
) -> AsyncGenerator[str, None]:
    """
    Stream a response from the Gemini API using Server-Sent Events (SSE).
    `messages` should be a list of dicts like: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    """
    api_key = custom_api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    
    if not api_key or api_key == os.getenv("PAGESPEED_API_KEY"):
        yield json.dumps({"error": "No valid Gemini API key configured."}) + "\n"
        return

    # Convert the OpenAI-like message history format to Gemini format
    gemini_contents = []
    
    for msg in messages:
        # Map roles: 'assistant' -> 'model', 'user' -> 'user'
        role = "model" if msg["role"] == "assistant" else "user"
        
        # Ensure we don't send empty text which Gemini rejects
        text = msg.get("content", "").strip()
        if not text:
            continue
            
        gemini_contents.append({
            "role": role,
            "parts": [{"text": text}]
        })

    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": gemini_contents,
        "generationConfig": {
            "temperature": 0.3,
            "topP": 0.95,
        }
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key={api_key}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"[Gemini API Error] Status {response.status}: {error_text}")
                    yield json.dumps({"error": f"API Error {response.status}"}) + "\n"
                    return

                # Read the SSE stream
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                            
                        try:
                            data_json = json.loads(data_str)
                            # Extract text chunk
                            if "candidates" in data_json and len(data_json["candidates"]) > 0:
                                candidate = data_json["candidates"][0]
                                if "content" in candidate and "parts" in candidate["content"]:
                                    text_chunk = candidate["content"]["parts"][0].get("text", "")
                                    if text_chunk:
                                        yield json.dumps({"text": text_chunk}) + "\n"
                        except json.JSONDecodeError:
                            continue
    except Exception as e:
        print(f"[Gemini Stream Exception]: {str(e)}")
        yield json.dumps({"error": "Failed to connect to AI provider."}) + "\n"
