"""
AGENT EXECUTOR
--------------
Executes agent tasks and desktop actions based on router classification.
Ties together agents + automation scripts.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from . import sales_agent, content_agent, task_agent, agent_router


def execute_agent(agent_type: str, input_text: str, context: dict = None) -> dict:
    """
    Run the specified agent with given input.

    Args:
        agent_type: "sales" | "content" | "task"
        input_text: Natural language instruction
        context: Optional context dict

    Returns:
        Agent response dict
    """
    agents = {
        "sales":   sales_agent.run,
        "content": content_agent.run,
        "task":    task_agent.run,
    }

    if agent_type not in agents:
        return {"error": f"Unknown agent type: {agent_type}"}

    return agents[agent_type](input_text, context)


def execute_action(action: str, parameters: dict) -> dict:
    """
    Execute a desktop/system action.

    Args:
        action: Action type string
        parameters: Action parameters dict

    Returns:
        {"success": bool, "result": str, "error": str}
    """
    try:
        from automation import desktop_control, email_sender, whatsapp_sender

        if action == "open_app":
            app = parameters.get("app_name", "")
            desktop_control.open_application(app)
            return {"success": True, "result": f"Opened {app}"}

        elif action == "open_website":
            url = parameters.get("url", "")
            desktop_control.open_website(url)
            return {"success": True, "result": f"Opened {url}"}

        elif action == "type_text":
            text = parameters.get("text", "")
            desktop_control.type_text(text)
            return {"success": True, "result": f"Typed: {text[:50]}..."}

        elif action == "take_screenshot":
            path = desktop_control.take_screenshot()
            return {"success": True, "result": f"Screenshot saved: {path}"}

        elif action == "search_google":
            query = parameters.get("query", "")
            desktop_control.search_google(query)
            return {"success": True, "result": f"Searching Google for: {query}"}

        elif action == "send_email":
            result = email_sender.send_email(
                to_email=parameters.get("to_email", ""),
                subject=parameters.get("subject", ""),
                body=parameters.get("body", parameters.get("message", "")),
            )
            return result

        elif action == "send_whatsapp":
            result = whatsapp_sender.send_message(
                phone=parameters.get("phone", ""),
                message=parameters.get("message", ""),
            )
            return result

        elif action == "none":
            reply = agent_router.get_conversational_reply(
                parameters.get("original_command", "")
            )
            return {"success": True, "result": reply}

        else:
            return {"success": False, "error": f"Unhandled action: {action}"}

    except Exception as e:
        return {"success": False, "error": str(e)}


def process_command(user_input: str) -> dict:
    """
    Full pipeline: classify → route → execute → return result.

    Args:
        user_input: Raw user command (from voice or text)

    Returns:
        {
          "command": str,
          "classification": dict,
          "ai_response": str,
          "action_result": str,
          "success": bool
        }
    """
    # Step 1: Classify
    classification = agent_router.classify_command(user_input)
    route = classification.get("route", "conversation")
    ai_response = ""
    action_result = ""
    success = True

    # Step 2: Route
    if route == "agent":
        agent_type = classification.get("agent_type", "task")
        result = execute_agent(
            agent_type=agent_type,
            input_text=user_input,
            context=classification.get("parameters"),
        )
        ai_response = str(result)
        action_result = "Agent task completed"

    elif route == "action":
        action = classification.get("action", "none")
        params = classification.get("parameters", {})
        params["original_command"] = user_input
        exec_result = execute_action(action, params)
        success = exec_result.get("success", False)
        ai_response = f"Executing: {action}"
        action_result = exec_result.get("result") or exec_result.get("error", "")

    else:  # conversation
        ai_response = agent_router.get_conversational_reply(user_input)
        action_result = ai_response

    return {
        "command": user_input,
        "classification": classification,
        "ai_response": ai_response,
        "action_result": action_result,
        "success": success,
    }
