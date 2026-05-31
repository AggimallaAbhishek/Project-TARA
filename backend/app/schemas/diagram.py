from pydantic import BaseModel, Field, field_validator


class DiagramSourceMetadata(BaseModel):
    input_type: str
    file_name: str
    file_size: int
    pages_processed: int | None = None
    extractor_used: str


class DiagramExtractResponse(BaseModel):
    extract_id: str
    extracted_system_description: str
    source_metadata: DiagramSourceMetadata


class DiagramAnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    extract_id: str = Field(..., min_length=8, max_length=128)
    system_description: str | None = Field(default=None, max_length=5000)
    project_id: int | None = Field(default=None, ge=1)
    project_name: str | None = Field(default=None, min_length=1, max_length=255)

    @field_validator("title", "project_name")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title cannot be blank")
        return cleaned

    @field_validator("system_description")
    @classmethod
    def validate_system_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("system description cannot be blank")
        if len(cleaned) < 10:
            raise ValueError("system description must be at least 10 characters")
        return cleaned


class DiagramCodeAnalyzeRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    uml_format: str = Field(..., max_length=32)
    uml_code: str = Field(..., max_length=250000)
    project_id: int | None = Field(default=None, ge=1)
    project_name: str | None = Field(default=None, min_length=1, max_length=255)

    @field_validator("title", "project_name")
    @classmethod
    def validate_trimmed_fields(cls, value: str | None, info) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError(f"{info.field_name.replace('_', ' ')} cannot be blank")
        return cleaned

    @field_validator("uml_format")
    @classmethod
    def normalize_uml_format(cls, value: str) -> str:
        return value.strip().lower()
