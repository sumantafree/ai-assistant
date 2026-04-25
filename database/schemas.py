"""
Pydantic schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from .models import LeadStatus, TaskPriority, TaskStatus


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    username: str
    password: str
    full_name: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class LoginRequest(BaseModel):
    username: str
    password: str


# ─── Leads ────────────────────────────────────────────────────────────────────

class LeadCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = LeadStatus.new

class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    last_contact: Optional[datetime] = None

class LeadOut(BaseModel):
    id: int
    name: str
    phone: Optional[str]
    email: Optional[str]
    company: Optional[str]
    notes: Optional[str]
    status: str
    last_contact: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ─── Tasks ────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = TaskPriority.medium
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    due_date: Optional[datetime] = None
    reminder_at: Optional[datetime] = None

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    priority: str
    status: str
    due_date: Optional[datetime]
    reminder_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── WhatsApp ─────────────────────────────────────────────────────────────────

class WhatsAppSend(BaseModel):
    phone: str
    message: str
    lead_id: Optional[int] = None

class BulkWhatsAppSend(BaseModel):
    contacts: List[dict]   # [{"phone": "...", "name": "..."}]
    message_template: str  # supports {name} placeholder

class WhatsAppLogOut(BaseModel):
    id: int
    phone: str
    message: str
    status: str
    sent_at: Optional[datetime]
    created_at: datetime
    model_config = {"from_attributes": True}


# ─── Email ────────────────────────────────────────────────────────────────────

class EmailSend(BaseModel):
    to_email: str
    subject: str
    body: str


# ─── Agent ────────────────────────────────────────────────────────────────────

class AgentRequest(BaseModel):
    agent_type: str    # sales | content | task
    input_text: str
    context: Optional[dict] = None

class AgentResponse(BaseModel):
    agent_type: str
    input_text: str
    output: str
    structured_data: Optional[dict] = None
    action_taken: Optional[str] = None


# ─── Voice ────────────────────────────────────────────────────────────────────

class VoiceCommandRequest(BaseModel):
    text: str                   # transcribed text
    execute_action: bool = True

class VoiceCommandResponse(BaseModel):
    command: str
    ai_response: str
    action: Optional[str]
    action_result: Optional[str]
    success: bool


# ─── Logs ─────────────────────────────────────────────────────────────────────

class CommandLogOut(BaseModel):
    id: int
    command_text: str
    command_type: Optional[str]
    ai_response: Optional[str]
    action_taken: Optional[str]
    success: bool
    created_at: datetime
    model_config = {"from_attributes": True}
