# backend/services/ai/chat_service.py

from typing import List, Dict, AsyncGenerator
from .context_builder import format_scan_context
from .prompt_manager import build_system_prompt
from .gemini_provider import stream_gemini_response

async def generate_chat_response_stream(
    messages: List[Dict[str, str]], 
    scan_results: dict = None, 
    api_key: str = None
) -> AsyncGenerator[str, None]:
    """
    Orchestrates the AI chat flow with streaming support.
    `messages` should be a list containing the conversation history.
    """
    
    # 1. Build the scan context
    scan_context = format_scan_context(scan_results)
    
    # 2. Build the system prompt
    system_prompt = build_system_prompt(scan_context)
    
    # 3. Stream the response from Gemini
    async for chunk in stream_gemini_response(system_prompt, messages, api_key):
        yield chunk
